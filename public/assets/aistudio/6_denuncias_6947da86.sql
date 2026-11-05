-- ==============================================================================
-- MÓDULO 6: GESTÃO DE DENÚNCIAS E OUVIDORIA
-- Dialeto: PostgreSQL
-- Padrão: UUID PK + Soft Delete Universal (is_active, is_deleted) + DRY Audit
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Garante a existência da função utilitária DRY para atualização de timestamp
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. TIPOS ENUMERADOS (DOMÍNIOS DE DENÚNCIAS)
-- Bloco DO para segurança na execução iterativa e idempotência
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_denuncia') THEN
        CREATE TYPE canal_denuncia AS ENUM (
            'formulario_web',    -- Canal eletrónico / formulário da ouvidoria
            'presencial',        -- Atendimento direto no balcão da vigilância
            'telefone',          -- Ligação telefónica / WhatsApp institucional
            'ouvidoria_geral',   -- Encaminhamento formal da Ouvidoria Municipal / SUS
            'oficio_ministerio'  -- Ofício do Ministério Público ou órgão externo
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_denuncia') THEN
        CREATE TYPE status_denuncia AS ENUM (
            'recebida',            -- Registada no sistema, a aguardar triagem
            'em_analise',          -- Sob apreciação da coordenação/fiscal
            'em_apuracao_fiscal',  -- Ordem de inspeção gerada para averiguação in loco
            'procedente',          -- Fatos confirmados em fiscalização (com emissão de auto/termo)
            'improcedente',        -- Averiguado in loco e nenhuma irregularidade foi constatada
            'arquivada'            -- Arquivada motivadamente (dados insuficientes, duplicidade)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gravidade_denuncia') THEN
        CREATE TYPE gravidade_denuncia AS ENUM (
            'baixa',    -- Pequeno incômodo sem risco iminente à saúde
            'media',    -- Risco moderado / reincidência
            'alta',     -- Risco grave (comercialização de alimentos estragados, surto)
            'urgente'   -- Risco iminente à vida / perigo sanitário agudo
        );
    END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: DENUNCIAS
-- Gestão de queixas, manifestações populares e fiscalizações dirigidas
-- ==============================================================================
CREATE TABLE denuncias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Protocolo de Rastreio Público
    numero_protocolo VARCHAR(35) NOT NULL,
    data_recebimento TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origem canal_denuncia NOT NULL DEFAULT 'formulario_web',
    gravidade gravidade_denuncia NOT NULL DEFAULT 'media',
    status status_denuncia NOT NULL DEFAULT 'recebida',
    
    -- Associação com Estabelecimento Cadastrado (Opcional, pois pode ser ambulante/clandestino)
    estabelecimento_id UUID,
    
    -- Localização Geográfica e Identificação do Local Denunciado
    local_denunciado_identificacao VARCHAR(255) NOT NULL,
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    ponto_referencia TEXT,
    
    -- Dados do Denunciante (Sigilo e Anonimato)
    denunciante_anonimo BOOLEAN NOT NULL DEFAULT TRUE,
    denunciante_nome VARCHAR(200),
    denunciante_telefone VARCHAR(20),
    denunciante_email VARCHAR(150),
    
    -- Relato dos Fatos e Ficheiros Anexos
    relato_denuncia TEXT NOT NULL,
    url_anexos_evidencias JSONB DEFAULT '[]'::jsonb,
    
    -- Tramitação, Apuração e Encerramento
    fiscal_designado_id UUID,
    despacho_coordenacao TEXT,
    conclusao_apuracao TEXT,
    resposta_ao_denunciante TEXT,
    data_encerramento TIMESTAMPTZ,
    finalizado_por UUID,
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves Estrangeiras Padronizadas
    CONSTRAINT fk_denuncias_estabelecimento 
        FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_denuncias_fiscal_designado 
        FOREIGN KEY (fiscal_designado_id) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_denuncias_finalizado_por 
        FOREIGN KEY (finalizado_por) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índice Único Condicional: Permite reabrir/corrigir protocolos se a denúncia original for excluída logicamente
CREATE UNIQUE INDEX uq_denuncia_protocolo 
    ON denuncias (numero_protocolo) 
    WHERE is_deleted = FALSE;

-- ==============================================================================
-- 3. RESOLUÇÃO DE DEPENDÊNCIA (CHAVE ESTRANGEIRA DE INSPEÇÕES)
-- Vincula o termo de inspeção gerado (Módulo 5) à denúncia que o motivou
-- ==============================================================================
ALTER TABLE inspecoes 
ADD CONSTRAINT fk_inspecoes_denuncias 
FOREIGN KEY (denuncia_id) REFERENCES denuncias(id) 
ON DELETE SET NULL ON UPDATE CASCADE;

-- ==============================================================================
-- 4. ÍNDICES DE PERFORMANCE E CONSULTAS DO PAINEL
-- ==============================================================================
CREATE INDEX idx_denuncias_protocolo 
    ON denuncias (numero_protocolo) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_denuncias_status_fila 
    ON denuncias (status, gravidade, data_recebimento ASC) 
    WHERE status IN ('recebida', 'em_analise', 'em_apuracao_fiscal') 
      AND is_deleted = FALSE;

CREATE INDEX idx_denuncias_estabelecimento 
    ON denuncias (estabelecimento_id) 
    WHERE estabelecimento_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX idx_denuncias_fiscal_designado 
    ON denuncias (fiscal_designado_id) 
    WHERE fiscal_designado_id IS NOT NULL AND is_deleted = FALSE;

CREATE TRIGGER trg_denuncias_atualizado_em
BEFORE UPDATE ON denuncias
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 5. VISTA PARA O PAINEL DE GESTÃO (Fila de Denúncias a Apurar)
-- ==============================================================================
CREATE OR REPLACE VIEW vw_denuncias_fila_trabalho AS
SELECT 
    d.id,
    d.numero_protocolo,
    d.data_recebimento,
    d.gravidade,
    d.status,
    d.local_denunciado_identificacao,
    d.bairro,
    e.razao_social AS estabelecimento_cadastrado,
    u.nome_completo AS fiscal_designado,
    (CURRENT_DATE - d.data_recebimento::date) AS dias_em_aberto
FROM denuncias d
LEFT JOIN estabelecimentos e ON d.estabelecimento_id = e.id AND e.is_deleted = FALSE
LEFT JOIN usuarios u ON d.fiscal_designado_id = u.id AND u.is_deleted = FALSE
WHERE d.status IN ('recebida', 'em_analise', 'em_apuracao_fiscal')
  AND d.is_deleted = FALSE
  AND d.is_active = TRUE
ORDER BY 
    CASE d.gravidade 
        WHEN 'urgente' THEN 1 
        WHEN 'alta' THEN 2 
        WHEN 'media' THEN 3 
        ELSE 4 
    END,
    d.data_recebimento ASC;