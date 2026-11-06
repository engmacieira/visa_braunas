-- ==============================================================================
-- MÓDULO 5: INSPEÇÕES, VISTORIAS E TERMOS FISCAIS
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
-- 1. TIPOS ENUMERADOS (DOMÍNIOS DE FISCALIZAÇÃO)
-- Bloco DO para segurança na execução iterativa
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_motivo_inspecao') THEN
        CREATE TYPE tipo_motivo_inspecao AS ENUM (
            'requerimento_alvara',   -- Vistoria prévia provocada por petição de alvará inicial/renovação
            'rotina_programada',     -- Ação periódica do plano anual de fiscalização municipal
            'denuncia',              -- Vistoria motivada por manifestação de munícipe ou ouvidoria
            'reinspecao',            -- Retorno para verificar cumprimento de termo de notificação
            'vapt_trabalhador',      -- Vistoria em Ambientes/Processos de Trabalho (Indicador 11)
            'investigacao_surto'     -- Investigação de DTA (Doenças Transmitidas por Alimentos/Surto)
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_inspecao') THEN
        CREATE TYPE status_inspecao AS ENUM (
            'agendada',              -- Prevista no cronograma
            'em_andamento',          -- Fiscal em campo / recolha de informações
            'concluida',             -- Termo concluído e assinado
            'cancelada'              -- Cancelada motivadamente
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resultado_inspecao') THEN
        CREATE TYPE resultado_inspecao AS ENUM (
            'aprovado',                  -- Atende integralmente às normas sanitárias
            'aprovado_com_exigencias',   -- Aprovado com pequenas recomendações (não impeditivas)
            'notificado_com_prazo',      -- Irregularidades constatadas; notificado para cumprir prazo
            'auto_infracao',             -- Lavratura de Auto de Infração Sanitária
            'interditado_parcialmente',  -- Interdição de setor, equipamento ou lote de produto
            'interditado_totalmente',    -- Interdição cautelar total do estabelecimento
            'indeferido'                 -- Parecer desfavorável à emissão de alvará
        );
    END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: INSPECOES
-- Registo oficial de vistorias, laudos de campo e termos fiscalizatórios
-- ==============================================================================
CREATE TABLE inspecoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação Oficial do Termo
    numero_termo VARCHAR(50) NOT NULL,
    motivo tipo_motivo_inspecao NOT NULL DEFAULT 'rotina_programada',
    status status_inspecao NOT NULL DEFAULT 'agendada',
    
    -- Vínculos Estruturais (Origens da Ação)
    estabelecimento_id UUID NOT NULL,
    requerimento_id UUID,
    
    -- Nota de Arquitetura: O campo denuncia_id é mantido sem a FOREIGN KEY declarada inline.
    -- A constraint física (ALTER TABLE) será injetada no módulo 6_denuncias.sql
    -- para evitar erro de dependência cíclica/futura na ordem de execução.
    denuncia_id UUID,
    
    -- Equipa Fiscal Responsável
    fiscal_responsavel_id UUID NOT NULL,
    fiscais_acompanhantes TEXT,
    
    -- Cronograma e Execução
    data_agendamento DATE,
    data_inicio DATE NOT NULL,
    data_fim DATE,
    hora_inspecao TIME,
    
    -- Dados de Campo e Desfecho
    resultado resultado_inspecao,
    nome_pessoa_acompanhou VARCHAR(200),
    cpf_pessoa_acompanhou VARCHAR(14),
    
    -- Relato Técnico e Exigências Sanitárias
    relato_vistoria TEXT,
    irregularidades_constatadas TEXT,
    exigencias_notificadas TEXT,
    prazo_adequacao_dias INT DEFAULT 0,
    data_limite_adequacao DATE,
    
    -- Especificidades de Saúde do Trabalhador (VAPT - Indicador 11)
    nome_local_trabalho VARCHAR(200),
    principais_riscos_identificados VARCHAR(1500),
    recomendacoes_orientacoes VARCHAR(1500),
    
    -- Dados Flexíveis e Evidências
    checklist_respostas JSONB DEFAULT '{}'::jsonb,
    relatorio_fotografico JSONB DEFAULT '[]'::jsonb,
    url_termo_assinado_pdf TEXT,
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves Estrangeiras Padronizadas
    CONSTRAINT fk_inspecoes_estabelecimento 
        FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_inspecoes_requerimento 
        FOREIGN KEY (requerimento_id) REFERENCES requerimentos_alvara(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_inspecoes_fiscal 
        FOREIGN KEY (fiscal_responsavel_id) REFERENCES usuarios(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Índice Único Condicional (Permite invalidar/excluir logicamente um termo anulado e reutilizar a numeração)
CREATE UNIQUE INDEX uq_inspecoes_numero_termo 
    ON inspecoes (numero_termo) 
    WHERE is_deleted = FALSE;

-- Índices de Performance e Consultas do Painel filtrando registos inativos
CREATE INDEX idx_inspecoes_estabelecimento 
    ON inspecoes (estabelecimento_id) WHERE is_deleted = FALSE;
    
CREATE INDEX idx_inspecoes_fiscal 
    ON inspecoes (fiscal_responsavel_id) WHERE is_deleted = FALSE;
    
CREATE INDEX idx_inspecoes_motivo_status 
    ON inspecoes (motivo, status) WHERE is_deleted = FALSE;
    
CREATE INDEX idx_inspecoes_data_inicio 
    ON inspecoes (data_inicio DESC) WHERE is_deleted = FALSE;
    
CREATE INDEX idx_inspecoes_requerimento 
    ON inspecoes (requerimento_id) WHERE requerimento_id IS NOT NULL AND is_deleted = FALSE;
    
CREATE INDEX idx_inspecoes_prazos_pendentes 
    ON inspecoes (data_limite_adequacao, status) 
    WHERE resultado = 'notificado_com_prazo' AND is_deleted = FALSE AND is_active = TRUE;

CREATE TRIGGER trg_inspecoes_atualizado_em
BEFORE UPDATE ON inspecoes
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 3. VISTAS PRONTAS PARA INDICADORES E ALERTAS (Refatoradas com Soft Delete)
-- ==============================================================================

-- 3.1. Apuração Oficial do Indicador 11 (VAPT - Saúde do Trabalhador)
CREATE OR REPLACE VIEW vw_indicador_11_vapt_consolidado AS
SELECT 
    EXTRACT(YEAR FROM data_inicio)::INTEGER AS ano_exercicio,
    COUNT(*)::INTEGER AS total_inspecoes_vapt,
    COUNT(*) FILTER (WHERE status = 'concluida')::INTEGER AS inspecoes_concluidas,
    COUNT(*) FILTER (WHERE status = 'em_andamento')::INTEGER AS inspecoes_em_andamento,
    COUNT(DISTINCT estabelecimento_id)::INTEGER AS estabelecimentos_distintos_atendidos
FROM inspecoes
WHERE motivo = 'vapt_trabalhador'
  AND is_deleted = FALSE
  AND is_active = TRUE
GROUP BY EXTRACT(YEAR FROM data_inicio);

-- 3.2. Alertas de Prazos Notificados para o Painel de Gestão
CREATE OR REPLACE VIEW vw_inspecoes_notificacoes_a_vencer AS
SELECT 
    i.id AS inspecao_id,
    i.numero_termo,
    e.id AS estabelecimento_id,
    e.razao_social,
    e.nome_fantasia,
    u.nome_completo AS fiscal_responsavel,
    i.data_limite_adequacao,
    (i.data_limite_adequacao - CURRENT_DATE) AS dias_restantes
FROM inspecoes i
JOIN estabelecimentos e ON i.estabelecimento_id = e.id
JOIN usuarios u ON i.fiscal_responsavel_id = u.id
WHERE i.resultado = 'notificado_com_prazo'
  AND i.data_limite_adequacao IS NOT NULL
  AND i.data_limite_adequacao >= CURRENT_DATE
  AND i.is_deleted = FALSE
  AND i.is_active = TRUE
  AND e.is_deleted = FALSE
ORDER BY i.data_limite_adequacao ASC;