-- ==============================================================================
-- MÓDULO 1: CONFIGURAÇÕES INSTITUCIONAIS, USUÁRIOS E METAS DO EXERCÍCIO
-- Dialeto: PostgreSQL
-- Padrão: UUID PK + Soft Delete Universal (is_active, is_deleted) + DRY Audit
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Função utilitária DRY para atualização automática do carimbo de auditoria
CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 1. USUÁRIOS E SERVIDORES DA VISA
-- (Posicionado no topo para satisfazer a integridade referencial das FKs)
-- ==============================================================================

-- 1.1. Tipo enumerado para controle de acesso por perfil
CREATE TYPE perfil_usuario AS ENUM (
    'admin_master',    -- Acesso total, configurações, exclusões e parâmetros
    'coordenador',     -- Gestão da equipe, homologação de alvarás e despacho de processos
    'fiscal_tecnico',  -- Lançamento e assinatura de inspeções, autos e termos de vistoria
    'digitador'        -- Entrada de dados de requerimentos e consultas operacionais
);

-- 1.2. Tabela principal de usuários e servidores da VISA
CREATE TABLE usuarios (
    -- ID vinculado ao Auth (Supabase Auth / Firebase UID)
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Credenciais e Acesso
    email VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil perfil_usuario NOT NULL DEFAULT 'digitador',
    
    -- Identificação Civil e Funcional
    nome_completo VARCHAR(200) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    matricula VARCHAR(50),
    cargo VARCHAR(100) NOT NULL DEFAULT 'Fiscal Sanitário',
    portaria_nomeacao VARCHAR(100), -- Ex.: "Portaria Municipal nº 123/2024"
    telefone_contato VARCHAR(20),
    
    -- Recurso Operacional
    url_assinatura_rubrica TEXT,    -- Caminho no Storage para impressão automática em termos/alvarás
    
    -- Controle de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    ultimo_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índices Únicos Condicionais (evitam colisão com registros excluídos logicamente)
CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (email) 
    WHERE is_deleted = FALSE;

CREATE UNIQUE INDEX uq_usuarios_cpf ON usuarios (cpf) 
    WHERE is_deleted = FALSE;

-- Índices operacionais de busca e listagem
CREATE INDEX idx_usuarios_email ON usuarios (email) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_usuarios_perfil_ativo ON usuarios (perfil, is_active) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_usuarios_cpf ON usuarios (cpf) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_usuarios_atualizado_em
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 2. CONFIGURAÇÃO INSTITUCIONAL (SINGLETON)
-- Armazena dados fixos da Prefeitura, Secretaria e Vigilância Sanitária
-- ==============================================================================
CREATE TABLE configuracao_institucional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Trava lógica para garantir estritamente uma única linha ativa de configuração
    singleton_key INT NOT NULL DEFAULT 1,
    
    -- Dados do Ente Público e Secretaria
    municipio VARCHAR(100) NOT NULL DEFAULT 'Braúnas',
    uf VARCHAR(2) NOT NULL DEFAULT 'MG',
    nome_prefeitura VARCHAR(200) NOT NULL DEFAULT 'Prefeitura Municipal de Braúnas',
    nome_secretaria VARCHAR(200) NOT NULL DEFAULT 'Secretaria Municipal de Saúde',
    orgao_vigilancia VARCHAR(200) NOT NULL DEFAULT 'Coordenação de Vigilância em Saúde e Vigilância Sanitária',
    cnpj_institucional VARCHAR(20),
    
    -- Endereço Oficial e Contato
    logradouro VARCHAR(200),
    numero VARCHAR(20),
    bairro VARCHAR(100),
    cep VARCHAR(9),
    telefone_oficial VARCHAR(20),
    email_oficial VARCHAR(150),
    
    -- Identidade Visual e Expedição de Documentos Oficiais
    url_brasao_prefeitura TEXT,       -- Brasão oficial para cabeçalhos de alvarás e termos
    url_logo_vigilancia TEXT,         -- Logo do setor/sistema
    texto_padrao_rodape_alvara TEXT,  -- Base legal padrão impressa nos alvarás sanitários
    
    -- Controle de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_por UUID,
    
    -- Restrições de Integridade e Chaves Estrangeiras Padronizadas
    CONSTRAINT chk_singleton_config CHECK (singleton_key = 1),
    CONSTRAINT fk_config_institucional_atualizado_por 
        FOREIGN KEY (atualizado_por) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índice Único Condicional: garante apenas um registro Singleton vigente (não excluído)
CREATE UNIQUE INDEX uq_configuracao_institucional_singleton 
    ON configuracao_institucional (singleton_key) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_config_institucional_atualizado_por 
    ON configuracao_institucional (atualizado_por) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_config_institucional_atualizado_em
BEFORE UPDATE ON configuracao_institucional
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- Inserção do registro único padrão compatível com índice parcial de Soft Delete
INSERT INTO configuracao_institucional (
    singleton_key, municipio, uf, nome_prefeitura, nome_secretaria, orgao_vigilancia, is_active, is_deleted
) VALUES (
    1, 'Braúnas', 'MG', 'Prefeitura Municipal de Braúnas', 
    'Secretaria Municipal de Saúde', 
    'Coordenação de Vigilância em Saúde e Vigilância Sanitária',
    TRUE, FALSE
) ON CONFLICT (singleton_key) WHERE is_deleted = FALSE DO NOTHING;

-- ==============================================================================
-- 3. METAS E PARÂMETROS DO EXERCÍCIO (HISTÓRICO ANUAL)
-- Guarda as pactuações dos Indicadores 11, 12, 13, 14 e 15 para cada ano civil
-- ==============================================================================
CREATE TABLE metas_exercicio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ano_exercicio INT NOT NULL,
    
    -- Indicador 11: Ações de VAPT em Saúde do Trabalhador
    meta_inspecoes_vapt INT NOT NULL DEFAULT 0,
    
    -- Indicadores 12 a 15: Metas Percentuais de Cobertura Sanitária por Grau de Risco
    meta_cobertura_risco_1 NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- Ex: 100% dos pactuados de Risco I
    meta_cobertura_risco_2 NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- Ex: 100% de Risco II
    meta_cobertura_risco_3 NUMERIC(5,2) NOT NULL DEFAULT 100.00, -- Ex: 100% de Risco III
    
    -- Prazos Operacionais e Regulatórios Padrão do Exercício
    dias_validade_padrao_alvara INT NOT NULL DEFAULT 365,
    dias_prazo_padrao_notificacao INT NOT NULL DEFAULT 30,
    
    -- Observações, Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    observacoes_pactuacao TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    configurado_por UUID,
    
    -- Restrições de Domínio e Chaves Estrangeiras Padronizadas
    CONSTRAINT chk_ano_valido CHECK (ano_exercicio >= 2020 AND ano_exercicio <= 2100),
    CONSTRAINT chk_percentual_risco_1 CHECK (meta_cobertura_risco_1 BETWEEN 0 AND 100),
    CONSTRAINT chk_percentual_risco_2 CHECK (meta_cobertura_risco_2 BETWEEN 0 AND 100),
    CONSTRAINT chk_percentual_risco_3 CHECK (meta_cobertura_risco_3 BETWEEN 0 AND 100),
    CONSTRAINT fk_metas_exercicio_configurado_por 
        FOREIGN KEY (configurado_por) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índice Único Condicional por Ano: permite recriar o ano de exercício caso o anterior sofra soft delete
CREATE UNIQUE INDEX uq_metas_exercicio_ano_valido 
    ON metas_exercicio (ano_exercicio) 
    WHERE is_deleted = FALSE;

-- Índice Único Condicional de Exercício Vigente: garante apenas UM exercício ativo e não excluído por vez
CREATE UNIQUE INDEX uq_exercicio_ativo 
    ON metas_exercicio (is_active) 
    WHERE is_active = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_metas_exercicio_configurado_por 
    ON metas_exercicio (configurado_por) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_metas_exercicio_atualizado_em
BEFORE UPDATE ON metas_exercicio
FOR EACH ROW
EXECUTE FUNCTION fn_atualizar_timestamp();

-- Inserção do exercício vigente inicial compatível com índice parcial
INSERT INTO metas_exercicio (
    ano_exercicio, is_active, is_deleted, meta_inspecoes_vapt, 
    meta_cobertura_risco_1, meta_cobertura_risco_2, meta_cobertura_risco_3
) VALUES (
    2026, TRUE, FALSE, 12, 100.00, 100.00, 100.00
) ON CONFLICT (ano_exercicio) WHERE is_deleted = FALSE DO NOTHING;