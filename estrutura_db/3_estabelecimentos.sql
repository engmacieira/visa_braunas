-- ==============================================================================
-- MÓDULO 3: ESTABELECIMENTOS, REPRESENTANTES, RTs E VÍNCULOS
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
-- 1. DOMÍNIOS CONTROLADOS (ENUMS) PARA ESTABELECIMENTOS
-- Bloco DO para evitar falhas caso executado no mesmo schema de ficheiros anteriores
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_pessoa') THEN
        CREATE TYPE tipo_pessoa AS ENUM ('PF', 'PJ');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_risco_sanitario') THEN
        CREATE TYPE nivel_risco_sanitario AS ENUM ('Risco I', 'Risco II', 'Risco III');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_cadastral') THEN
        CREATE TYPE situacao_cadastral AS ENUM ('Ativo', 'Inativo', 'Suspenso');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_alvara') THEN
        CREATE TYPE situacao_alvara AS ENUM ('Válido', 'Vencido', 'Isento/Dispensado', 'Não Possui (Irregular)');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competencia_fiscalizacao') THEN
        CREATE TYPE competencia_fiscalizacao AS ENUM ('Municipal', 'Estadual', 'Pactuado');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parecer_projeto') THEN
        CREATE TYPE parecer_projeto AS ENUM ('Sim', 'Não', 'Não Aplicável');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_documento_estabelecimento') THEN
        CREATE TYPE situacao_documento_estabelecimento AS ENUM (
            'vigente', 'vencido', 'em_analise', 'dispensado', 'rejeitado'
        );
    END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: REPRESENTANTES_LEGAIS
-- (Criada antes de Estabelecimentos para evitar ALTER TABLE e permitir a FK na DDL)
-- ==============================================================================
CREATE TABLE representantes_legais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação Civil
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    rg_numero VARCHAR(30),
    rg_orgao_emissor VARCHAR(20),
    
    -- Contatos Pessoais
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,
    
    -- Domicílio Residencial
    endereco_residencial TEXT NOT NULL,
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_representantes_cpf ON representantes_legais (cpf) WHERE is_deleted = FALSE;
CREATE INDEX idx_representantes_nome ON representantes_legais (nome_completo) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_representantes_legais_atualizado_em
BEFORE UPDATE ON representantes_legais
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 3. TABELA PRINCIPAL: ESTABELECIMENTOS
-- ==============================================================================
CREATE TABLE estabelecimentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Identificação Cadastral
    tipo_cadastro tipo_pessoa NOT NULL DEFAULT 'PJ',
    cnpj_cpf VARCHAR(20) NOT NULL,
    inscricao_municipal VARCHAR(50),
    razao_social VARCHAR(200) NOT NULL,
    nome_fantasia VARCHAR(200),
    natureza_juridica VARCHAR(100),

    -- Localização Física do Ponto
    cep VARCHAR(10) NOT NULL DEFAULT '35.189-000',
    logradouro VARCHAR(255) NOT NULL,
    numero VARCHAR(20) NOT NULL,
    complemento VARCHAR(100),
    bairro VARCHAR(100) NOT NULL,
    municipio VARCHAR(100) NOT NULL DEFAULT 'Braúnas',
    uf VARCHAR(2) NOT NULL DEFAULT 'MG',
    ponto_referencia TEXT,
    acesso_compartilhado_residencia BOOLEAN NOT NULL DEFAULT FALSE,

    -- Contatos e Comunicação
    telefone_fixo VARCHAR(20),
    telefone_celular VARCHAR(20) NOT NULL,
    email VARCHAR(150) NOT NULL,

    -- Situação Cadastral Básica
    nivel_risco nivel_risco_sanitario NOT NULL,
    competencia_fiscalizacao competencia_fiscalizacao NOT NULL DEFAULT 'Municipal',
    situacao_estabelecimento situacao_cadastral NOT NULL DEFAULT 'Ativo',
    observacoes_baixa VARCHAR(500),

    -- Estrutura Operacional Básica Fixa
    horario_funcionamento TEXT,
    fonte_abastecimento_agua VARCHAR(100) DEFAULT 'Rede Pública (COPASA)',
    possui_reservatorio_proprio BOOLEAN DEFAULT FALSE,
    capacidade_reservatorio_litros INT DEFAULT 0,
    
    -- Campos implícitos exigidos pelo trigger de Alvarás (Adicionados para integridade)
    numero_alvara VARCHAR(30),
    data_validade_alvara DATE,
    situacao_alvara situacao_alvara DEFAULT 'Não Possui (Irregular)',
    
    -- Vínculos Estruturais
    representante_legal_id UUID REFERENCES representantes_legais(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    
    -- Auditoria, Compatibilidade e Soft-Delete Universal
    firestore_id VARCHAR(128),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cadastrado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índices Únicos Condicionais
CREATE UNIQUE INDEX uq_estabelecimentos_cnpj_cpf ON estabelecimentos (cnpj_cpf) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX uq_estabelecimentos_firestore_id ON estabelecimentos (firestore_id) WHERE firestore_id IS NOT NULL AND is_deleted = FALSE;

-- Índices de Performance
CREATE INDEX idx_estabelecimentos_cnpj_cpf ON estabelecimentos (cnpj_cpf) WHERE is_deleted = FALSE;
CREATE INDEX idx_estabelecimentos_risco_alvara ON estabelecimentos (nivel_risco, situacao_alvara) WHERE is_deleted = FALSE;
CREATE INDEX idx_estabelecimentos_situacao ON estabelecimentos (situacao_estabelecimento) WHERE is_deleted = FALSE;
CREATE INDEX idx_estabelecimentos_validade_alvara ON estabelecimentos (data_validade_alvara) WHERE situacao_alvara = 'Válido' AND is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimentos_atualizado_em
BEFORE UPDATE ON estabelecimentos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 4. TABELA ASSOCIATIVA: ESTABELECIMENTO_CNAES (N:N)
-- ==============================================================================
CREATE TABLE estabelecimento_cnaes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    
    -- A FK correta em Postgres para índice parcial obriga o uso do ID
    cnae_id UUID NOT NULL REFERENCES cnaes(id) ON DELETE RESTRICT,
    cnae_codigo VARCHAR(10) NOT NULL, -- Preservado para manter a não-omissão do dicionário de dados
    
    -- Hierarquia da Atividade
    eh_principal BOOLEAN NOT NULL DEFAULT FALSE,
    data_inicio_atividade DATE,
    
    -- Controlo de Ciclo de Vida
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Impedir o mesmo CNAE duas vezes na mesma empresa
CREATE UNIQUE INDEX uq_estab_cnae_associacao ON estabelecimento_cnaes (estabelecimento_id, cnae_id) WHERE is_deleted = FALSE;

-- Garante que cada estabelecimento possui no máximo UM CNAE Principal
CREATE UNIQUE INDEX uq_estabelecimento_cnae_principal ON estabelecimento_cnaes (estabelecimento_id) WHERE eh_principal = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_estab_cnaes_codigo ON estabelecimento_cnaes (cnae_codigo) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_cnaes_ativos ON estabelecimento_cnaes (estabelecimento_id, eh_principal) WHERE is_active = TRUE AND is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimento_cnaes_atualizado_em
BEFORE UPDATE ON estabelecimento_cnaes
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- Vista Complementar: Identificação do Risco Efetivo
-- ==============================================================================
CREATE OR REPLACE VIEW vw_estabelecimentos_risco_consolidado AS
SELECT 
    e.id AS estabelecimento_id,
    e.cnpj_cpf,
    e.razao_social,
    c_prin.codigo AS cnae_principal_codigo,
    c_prin.descricao AS cnae_principal_descricao,
    CASE 
        WHEN bool_or(c.grau_risco_padrao = 'Risco III') THEN 'Risco III'::nivel_risco_cnae
        WHEN bool_or(c.grau_risco_padrao = 'Risco II') THEN 'Risco II'::nivel_risco_cnae
        WHEN bool_or(c.grau_risco_padrao = 'Risco I') THEN 'Risco I'::nivel_risco_cnae
        ELSE 'Dispensado'::nivel_risco_cnae
    END AS risco_sanitario_preponderante
FROM estabelecimentos e
JOIN estabelecimento_cnaes ec ON e.id = ec.estabelecimento_id AND ec.is_active = TRUE AND ec.is_deleted = FALSE
JOIN cnaes c ON ec.cnae_id = c.id AND c.is_deleted = FALSE
LEFT JOIN (
    SELECT ec2.estabelecimento_id, c2.codigo, c2.descricao
    FROM estabelecimento_cnaes ec2
    JOIN cnaes c2 ON ec2.cnae_id = c2.id
    WHERE ec2.eh_principal = TRUE AND ec2.is_deleted = FALSE
) c_prin ON e.id = c_prin.estabelecimento_id
WHERE e.is_deleted = FALSE
GROUP BY e.id, e.cnpj_cpf, e.razao_social, c_prin.codigo, c_prin.descricao;

-- ==============================================================================
-- 5. TABELA: ESTABELECIMENTO_DOCUMENTOS
-- ==============================================================================
CREATE TABLE estabelecimento_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    tipo_documento_id UUID NOT NULL REFERENCES tipos_documentos(id) ON DELETE RESTRICT,
    
    eh_versao_atual BOOLEAN NOT NULL DEFAULT TRUE,
    situacao situacao_documento_estabelecimento NOT NULL DEFAULT 'em_analise',
    
    numero_identificacao VARCHAR(100),
    orgao_empresa_emissora VARCHAR(255),
    responsavel_tecnico_emissor VARCHAR(255),
    registro_conselho_emissor VARCHAR(100),
    
    data_emissao DATE NOT NULL,
    data_validade DATE,
    
    url_arquivo_anexo TEXT,
    observacoes TEXT,
    
    -- Controlo de Ciclo de Vida
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    validado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    data_validacao TIMESTAMPTZ
);

CREATE UNIQUE INDEX uq_estab_tipo_doc_vigente ON estabelecimento_documentos (estabelecimento_id, tipo_documento_id) WHERE eh_versao_atual = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_estab_docs_estabelecimento ON estabelecimento_documentos (estabelecimento_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_docs_tipo ON estabelecimento_documentos (tipo_documento_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_docs_alerta_vencimento ON estabelecimento_documentos (data_validade, situacao) WHERE eh_versao_atual = TRUE AND data_validade IS NOT NULL AND is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimento_documentos_atualizado_em
BEFORE UPDATE ON estabelecimento_documentos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- View: Documentos Vencendo nos Próximos 30 Dias (Painel de Alertas)
-- ==============================================================================
CREATE OR REPLACE VIEW vw_documentos_proximos_vencimento AS
SELECT 
    e.id AS estabelecimento_id,
    e.razao_social,
    e.nome_fantasia,
    td.nome_documento,
    ed.numero_identificacao,
    ed.data_validade,
    (ed.data_validade - CURRENT_DATE) AS dias_para_vencer
FROM estabelecimento_documentos ed
JOIN estabelecimentos e ON ed.estabelecimento_id = e.id
JOIN tipos_documentos td ON ed.tipo_documento_id = td.id
WHERE ed.eh_versao_atual = TRUE
  AND ed.situacao = 'vigente'
  AND ed.is_deleted = FALSE
  AND e.is_deleted = FALSE
  AND ed.data_validade BETWEEN CURRENT_DATE AND (CURRENT_DATE + INTERVAL '30 days')
ORDER BY ed.data_validade ASC;

-- ==============================================================================
-- 6. TABELA: RESPONSAVEIS_TECNICOS
-- ==============================================================================
CREATE TABLE responsaveis_tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    conselho_classe VARCHAR(30) NOT NULL,
    numero_registro_conselho VARCHAR(50) NOT NULL,
    uf_conselho VARCHAR(2) NOT NULL DEFAULT 'MG',
    
    telefone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_rt_cpf ON responsaveis_tecnicos (cpf) WHERE is_deleted = FALSE;
CREATE UNIQUE INDEX uq_rt_registro_uf ON responsaveis_tecnicos (conselho_classe, numero_registro_conselho, uf_conselho) WHERE is_deleted = FALSE;
CREATE INDEX idx_rt_conselho_registro ON responsaveis_tecnicos (conselho_classe, numero_registro_conselho) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_responsaveis_tecnicos_atualizado_em
BEFORE UPDATE ON responsaveis_tecnicos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 7. TABELA ASSOCIATIVA: ESTABELECIMENTO_RESPONSAVEIS_TECNICOS
-- ==============================================================================
CREATE TABLE estabelecimento_responsaveis_tecnicos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    responsavel_tecnico_id UUID NOT NULL REFERENCES responsaveis_tecnicos(id) ON DELETE RESTRICT,
    
    eh_substituto BOOLEAN NOT NULL DEFAULT FALSE,
    carga_horaria_semanal VARCHAR(50),
    horario_permanencia TEXT,
    numero_art_crt VARCHAR(100),
    
    data_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    data_fim DATE,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_estab_rt_titular_ativo ON estabelecimento_responsaveis_tecnicos (estabelecimento_id) WHERE eh_substituto = FALSE AND is_active = TRUE AND is_deleted = FALSE;

CREATE INDEX idx_estab_rt_estabelecimento ON estabelecimento_responsaveis_tecnicos (estabelecimento_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_rt_profissional ON estabelecimento_responsaveis_tecnicos (responsavel_tecnico_id) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimento_responsaveis_tecnicos_atualizado_em
BEFORE UPDATE ON estabelecimento_responsaveis_tecnicos
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 8. TABELA: ESTABELECIMENTO_FUNCIONARIOS
-- ==============================================================================
CREATE TABLE estabelecimento_funcionarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    
    nome_completo VARCHAR(255) NOT NULL,
    cpf VARCHAR(14),
    
    funcao_cargo VARCHAR(100),
    eh_manipulador BOOLEAN NOT NULL DEFAULT TRUE,
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_estab_func_estabelecimento ON estabelecimento_funcionarios (estabelecimento_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_func_ativo ON estabelecimento_funcionarios (estabelecimento_id, is_active) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimento_funcionarios_atualizado_em
BEFORE UPDATE ON estabelecimento_funcionarios
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 9. TABELA: ESTABELECIMENTO_FORNECEDORES
-- ==============================================================================
CREATE TABLE estabelecimento_fornecedores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estabelecimento_id UUID NOT NULL REFERENCES estabelecimentos(id) ON DELETE CASCADE,
    
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    cnpj VARCHAR(20),
    
    tipo_produto_fornecido VARCHAR(150),
    municipio_uf VARCHAR(100),
    
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_estab_fornec_estabelecimento ON estabelecimento_fornecedores (estabelecimento_id) WHERE is_deleted = FALSE;
CREATE INDEX idx_estab_fornec_cnpj ON estabelecimento_fornecedores (cnpj) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_estabelecimento_fornecedores_atualizado_em
BEFORE UPDATE ON estabelecimento_fornecedores
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();