-- ==============================================================================
-- MÓDULO 2: CATÁLOGO DE CNAES, TIPOS DE DOCUMENTOS E ALVARÁS SANITÁRIOS
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
-- 1. TIPOS ENUMERADOS DE CATÁLOGOS E RISCO SANITÁRIO
-- (Declarados no topo para resolver dependências diretas da tabela cnaes)
-- ==============================================================================

-- 1.1. Enquadramento de risco sanitário padrão da atividade
CREATE TYPE nivel_risco_cnae AS ENUM (
    'Dispensado',  -- Risco A / Nível 1: Dispensado de atos públicos de liberação
    'Risco I',     -- Baixo Risco: Início imediato sem vistoria prévia
    'Risco II',    -- Médio Risco: Licenciamento facilitado / vistoria posterior
    'Risco III'    -- Alto Risco: Exige vistoria prévia e análise documental rigorosa
);

-- 1.2. Competência de fiscalização (antecipado do Módulo 3 para evitar falha de tipo em cnaes)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competencia_fiscalizacao') THEN
        CREATE TYPE competencia_fiscalizacao AS ENUM ('Municipal', 'Estadual', 'Pactuado');
    END IF;
END $$;

-- 1.3. Categorias regulatórias de documentos exigidos pela VISA
CREATE TYPE categoria_documento AS ENUM (
    'licenciamento',             -- Alvarás municipais, sanitários, AFE/AE
    'infraestrutura_saneamento', -- Reservatórios de água, potabilidade
    'controle_ambiental',        -- Pragas, resíduos perigosos/RSS
    'seguranca_saude',           -- Radiação ionizante, proteção contra incêndio
    'gestao_qualidade',          -- Manuais, POPs, projetos aprovados
    'habilitacao_profissional'   -- ARTs, registos de classe, certidões
);

-- 1.4. Situação do ato administrativo (Alvará Sanitário)
CREATE TYPE status_alvara AS ENUM (
    'ativo',       -- Documento em vigor e com eficácia plena
    'vencido',     -- Prazo de validade expirado
    'suspenso',    -- Suspensão cautelar temporária por infração sanitária
    'revogado',    -- Cancelado administrativamente por perda de requisitos
    'cassado'      -- Cassado em definitivo via processo administrativo sancionatório
);

-- ==============================================================================
-- 2. TABELA DE CATÁLOGO: CNAES
-- ==============================================================================
CREATE TABLE cnaes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Código CNAE formatado (Ex: '4713-0/02') ou 7 dígitos
    codigo VARCHAR(10) NOT NULL,
    
    -- Descrição oficial da subclasse IBGE/Concla
    descricao VARCHAR(300) NOT NULL,
    
    -- Parâmetros Sanitários Regulatórios (Base: Legislação Estadual / ANVISA)
    grau_risco_padrao nivel_risco_cnae NOT NULL DEFAULT 'Risco II',
    competencia_padrao competencia_fiscalizacao NOT NULL DEFAULT 'Municipal',
    exige_rt BOOLEAN NOT NULL DEFAULT FALSE,
    exige_projeto_arquitetonico BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice Único Condicional: permite recadastrar um código CNAE caso o anterior tenha sofrido soft delete
CREATE UNIQUE INDEX uq_cnaes_codigo 
    ON cnaes (codigo) 
    WHERE is_deleted = FALSE;

-- Índices para buscas rápidas no autocomplete do formulário e agrupamentos de risco
CREATE INDEX idx_cnaes_grau_risco 
    ON cnaes (grau_risco_padrao) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_cnaes_ativo 
    ON cnaes (is_active) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_cnaes_atualizado_em
BEFORE UPDATE ON cnaes
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 3. TABELA CATÁLOGO: TIPOS_DOCUMENTOS
-- Parametrização dos documentos exigidos pela VISA
-- ==============================================================================
CREATE TABLE tipos_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificadores e Nomenclatura
    codigo_identificador VARCHAR(50) NOT NULL, -- Ex: 'LIMPEZA_CAIXA_AGUA', 'ALVARA_SANITARIO'
    nome_documento VARCHAR(200) NOT NULL,
    descricao TEXT,
    categoria categoria_documento NOT NULL DEFAULT 'licenciamento',
    
    -- Regras de Ciclo de Vida e Validade do Documento
    possui_validade BOOLEAN NOT NULL DEFAULT TRUE,
    validade_padrao_meses INT DEFAULT 12,      -- Quantidade padrão de meses para cálculo da data de expiração
    
    -- Parametrização Operacional
    exige_orgao_emissor BOOLEAN NOT NULL DEFAULT TRUE,        -- Se exige preencher a empresa/órgão que emitiu
    exige_responsavel_emissao BOOLEAN NOT NULL DEFAULT FALSE, -- Se exige preencher o profissional emissor (ex: RT com registo)
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_tipos_docs_validade_positiva 
        CHECK (validade_padrao_meses IS NULL OR validade_padrao_meses > 0)
);

-- Índice Único Condicional (substitui CONSTRAINT uq_tipos_documentos_codigo)
CREATE UNIQUE INDEX uq_tipos_documentos_codigo 
    ON tipos_documentos (codigo_identificador) 
    WHERE is_deleted = FALSE;

-- Índices de consulta rápida
CREATE INDEX idx_tipos_docs_categoria 
    ON tipos_documentos (categoria) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_tipos_docs_ativo 
    ON tipos_documentos (is_active) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_tipos_documentos_atualizado_em
BEFORE UPDATE ON tipos_documentos
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 4. TABELA: ALVARAS_SANITARIOS
-- Registo oficial das licenças sanitárias emitidas pelo município
-- Nota de dependência: Requer as tabelas estabelecimentos, requerimentos_alvara e inspecoes
-- ==============================================================================
CREATE TABLE alvaras_sanitarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação e Sequencialidade do Título Oficial
    numero_alvara INT NOT NULL,                     -- Número sequencial do alvará (Ex: 1, 2, 3...)
    exercicio INT NOT NULL,                         -- Ano civil de emissão (Ex: 2026)
    numero_formatado VARCHAR(30) NOT NULL,          -- Rótulo visual de impressão (Ex: '001/2026')
    
    -- Vínculos Estruturais (Chaves Estrangeiras)
    estabelecimento_id UUID NOT NULL,
    requerimento_id UUID,
    inspecao_conclusiva_id UUID,
    
    -- Mecanismo de Validação Pública e Fé Pública (QR Code)
    codigo_autenticidade VARCHAR(32) NOT NULL DEFAULT UPPER(SUBSTRING(gen_random_uuid()::text FROM 1 FOR 8) || '-' || TO_CHAR(CURRENT_DATE, 'YYYY')),
    
    -- Vigência e Prazos
    data_emissao DATE NOT NULL DEFAULT CURRENT_DATE,
    data_vencimento DATE NOT NULL,
    status status_alvara NOT NULL DEFAULT 'ativo',
    
    -- Responsável pela Assinatura e Expedição
    emitido_por UUID NOT NULL,                      -- Fiscal/Coordenador emissor
    
    -- Condicionantes Sanitárias e Documento Digital
    condicionantes_restricoes TEXT,                 -- Recomendações ou exigências mantidas em rotina
    url_alvara_pdf TEXT,                            -- Caminho do PDF oficial gerado e assinado no storage
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Restrições de Domínio e Chaves Estrangeiras Padronizadas
    CONSTRAINT chk_alvara_datas CHECK (data_vencimento >= data_emissao),
    CONSTRAINT fk_alvaras_estabelecimento 
        FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_alvaras_requerimento 
        FOREIGN KEY (requerimento_id) REFERENCES requerimentos_alvara(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_alvaras_inspecao_conclusiva 
        FOREIGN KEY (inspecao_conclusiva_id) REFERENCES inspecoes(id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_alvaras_emitido_por 
        FOREIGN KEY (emitido_por) REFERENCES usuarios(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Índices Únicos Condicionais (evitam bloqueio por alvarás inutilizados/excluídos logicamente)
CREATE UNIQUE INDEX uq_alvara_numero_exercicio 
    ON alvaras_sanitarios (numero_alvara, exercicio) 
    WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_alvara_codigo_autenticidade 
    ON alvaras_sanitarios (codigo_autenticidade) 
    WHERE is_deleted = FALSE;

-- Índices de Performance e Consultas do Painel
CREATE INDEX idx_alvaras_autenticidade 
    ON alvaras_sanitarios (codigo_autenticidade) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_alvaras_estabelecimento 
    ON alvaras_sanitarios (estabelecimento_id, data_emissao DESC) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_alvaras_vencimento_alerta 
    ON alvaras_sanitarios (data_vencimento, status) 
    WHERE status = 'ativo' AND is_active = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_alvaras_requerimento 
    ON alvaras_sanitarios (requerimento_id) 
    WHERE requerimento_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX idx_alvaras_inspecao_conclusiva 
    ON alvaras_sanitarios (inspecao_conclusiva_id) 
    WHERE inspecao_conclusiva_id IS NOT NULL AND is_deleted = FALSE;

CREATE INDEX idx_alvaras_emitido_por 
    ON alvaras_sanitarios (emitido_por) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_alvaras_sanitarios_atualizado_em
BEFORE UPDATE ON alvaras_sanitarios
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 5. GATILHO DE AUTOMAÇÃO DO ESTADO CADASTRAL
-- Sincroniza os dados do alvará vigente na tabela mestre estabelecimentos,
-- contemplando mudanças de status e exclusão lógica (Soft Delete)
-- ==============================================================================
CREATE OR REPLACE FUNCTION fn_sincronizar_alvara_estabelecimento()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_deleted = FALSE AND NEW.is_active = TRUE AND NEW.status = 'ativo' THEN
        UPDATE estabelecimentos
        SET 
            numero_alvara = NEW.numero_formatado,
            data_validade_alvara = NEW.data_vencimento,
            situacao_alvara = 'Válido',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = NEW.estabelecimento_id
          AND is_deleted = FALSE;
    ELSIF NEW.status IN ('suspenso', 'revogado', 'cassado') 
       OR NEW.is_deleted = TRUE 
       OR NEW.is_active = FALSE THEN
        UPDATE estabelecimentos
        SET 
            situacao_alvara = 'Não Possui (Irregular)',
            atualizado_em = CURRENT_TIMESTAMP
        WHERE id = NEW.estabelecimento_id
          AND is_deleted = FALSE;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_alvara_sincroniza_estabelecimento
AFTER INSERT OR UPDATE OF status, data_vencimento, is_active, is_deleted ON alvaras_sanitarios
FOR EACH ROW
EXECUTE FUNCTION fn_sincronizar_alvara_estabelecimento();