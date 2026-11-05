-- ==============================================================================
-- MÓDULO 4: REQUERIMENTOS E PETIÇÕES DE ALVARÁ
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
-- 1. TIPOS ENUMERADOS (DOMÍNIOS DE TRAMITAÇÃO)
-- Bloco DO para evitar falhas caso executado iterativamente no mesmo schema
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_solicitacao_alvara') THEN
        CREATE TYPE tipo_solicitacao_alvara AS ENUM (
            'concessao_inicial',  -- Primeiro alvará do estabelecimento no município
            'renovacao'           -- Renovação anual periódica
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_requerimento') THEN
        CREATE TYPE status_requerimento AS ENUM (
            'pendente',              -- Recebido do Forms/Web, a aguardar triagem
            'em_analise',            -- Em conferência documental pelo fiscal
            'aguardando_inspecao',   -- Documentação prévia OK, agendado para vistoria
            'aguardando_adequacao',  -- Notificado para corrigir pendências/juntar documentos
            'deferido',              -- Aprovado, apto para expedição do alvará
            'indeferido',            -- Negado por descumprimento legal/sanitário
            'cancelado'              -- Cancelado por duplicidade ou pedido do requerente
        );
    END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: REQUERIMENTOS_ALVARA
-- Livro de registo dos pedidos de licenciamento sanitário
-- ==============================================================================
CREATE TABLE requerimentos_alvara (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    numero_protocolo VARCHAR(35) NOT NULL,
    estabelecimento_id UUID NOT NULL,
    tipo_solicitacao tipo_solicitacao_alvara NOT NULL,
    status status_requerimento NOT NULL DEFAULT 'pendente',
    
    -- Histórico da Licença Anterior (se for Renovação)
    alvara_anterior_numero VARCHAR(50),
    alvara_anterior_exercicio INT,
    
    -- Metadados de Entrada
    data_submissao TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origem_solicitacao VARCHAR(50) NOT NULL DEFAULT 'Google Forms Web',
    
    -- Tramitação e Parecer Fiscal
    analisado_por UUID,
    data_inicio_analise TIMESTAMPTZ,
    data_conclusao TIMESTAMPTZ,
    parecer_fiscal TEXT,
    motivo_indeferimento TEXT,
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves Estrangeiras Explícitas
    CONSTRAINT fk_requerimento_estabelecimento 
        FOREIGN KEY (estabelecimento_id) REFERENCES estabelecimentos(id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_requerimento_analisado_por 
        FOREIGN KEY (analisado_por) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índice Único Condicional (Garante unicidade ignorando protocolos excluídos logicamente)
CREATE UNIQUE INDEX uq_requerimento_protocolo 
    ON requerimentos_alvara (numero_protocolo) 
    WHERE is_deleted = FALSE;

-- Índices de Performance e Filtros do Painel de Gestão
CREATE INDEX idx_req_alvara_protocolo 
    ON requerimentos_alvara (numero_protocolo) 
    WHERE is_deleted = FALSE;

CREATE INDEX idx_req_alvara_painel_fila 
    ON requerimentos_alvara (status, data_submissao ASC) 
    WHERE status IN ('pendente', 'em_analise', 'aguardando_inspecao', 'aguardando_adequacao') 
      AND is_deleted = FALSE;

CREATE INDEX idx_req_alvara_estabelecimento 
    ON requerimentos_alvara (estabelecimento_id, data_submissao DESC) 
    WHERE is_deleted = FALSE;

CREATE TRIGGER trg_requerimentos_alvara_atualizado_em
BEFORE UPDATE ON requerimentos_alvara
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

-- ==============================================================================
-- 3. TABELA: REQUERIMENTOS_ALVARA_DADOS
-- Espelho integral da petição/declaração enviada pelo formulário (Relacionamento 1:1)
-- ==============================================================================
CREATE TABLE requerimentos_alvara_dados (
    requerimento_id UUID PRIMARY KEY,
    
    -- 1. IDENTIFICAÇÃO CADASTRAL DECLARADA
    tipo_cadastro VARCHAR(30),
    cpf_cnpj VARCHAR(20) NOT NULL,
    razao_social VARCHAR(255) NOT NULL,
    nome_fantasia VARCHAR(255),
    inscricao_municipal VARCHAR(50),
    natureza_juridica VARCHAR(100),
    
    -- 2. CONTACTOS DO ESTABELECIMENTO DECLARADOS
    telefone_fixo VARCHAR(20),
    telefone_celular VARCHAR(20),
    email_comercial VARCHAR(150),
    
    -- 3. LOCALIZAÇÃO DO ESTABELECIMENTO DECLARADA
    cep VARCHAR(9),
    logradouro VARCHAR(255),
    numero VARCHAR(20),
    complemento VARCHAR(100),
    bairro VARCHAR(100),
    ponto_referencia TEXT,
    acesso_compartilhado_residencia VARCHAR(50),
    
    -- 4. ATIVIDADES ECONÓMICAS DECLARADAS
    cnae_principal_selecionado VARCHAR(255),
    cnae_principal_codigo_manual VARCHAR(20),
    cnae_principal_descricao TEXT,
    cnaes_secundarios_declarados TEXT,
    atividades_auxiliares TEXT,
    
    -- 5. PROJETO ARQUITETÓNICO E AUTORIZAÇÕES FEDERAIS
    projeto_arquitetonico_aprovado VARCHAR(50),
    numero_processo_projeto_sei VARCHAR(50),
    afe_anvisa VARCHAR(50),
    ae_anvisa VARCHAR(50),
    
    -- 6. CONDIÇÕES FÍSICO-OPERACIONAIS DECLARADAS
    dias_horario_funcionamento TEXT,
    num_funcionarios_manipuladores INT DEFAULT 0,
    fonte_abastecimento_agua VARCHAR(100),
    possui_caixa_agua_propria VARCHAR(10),
    capacidade_caixa_agua_litros INT DEFAULT 0,
    data_ultima_limpeza_caixa_agua DATE,
    possui_coleta_rss VARCHAR(50),
    possui_raio_x VARCHAR(50),
    
    -- 7. DADOS DO REPRESENTANTE LEGAL DECLARADO
    rep_nome VARCHAR(255),
    rep_cpf VARCHAR(14),
    rep_rg VARCHAR(30),
    rep_orgao_uf VARCHAR(20),
    rep_celular VARCHAR(20),
    rep_email VARCHAR(150),
    rep_endereco_residencial TEXT,
    
    -- 8. DADOS DO RESPONSÁVEL TÉCNICO (RT) DECLARADO
    exige_rt VARCHAR(50),
    rt_proprio_representante VARCHAR(50),
    rt_nome VARCHAR(255),
    rt_cpf VARCHAR(14),
    rt_conselho_classe VARCHAR(30),
    rt_numero_conselho VARCHAR(50),
    rt_conselho_uf VARCHAR(2),
    rt_carga_horaria VARCHAR(50),
    rt_telefone VARCHAR(20),
    rt_email VARCHAR(150),
    possui_rt_substituto VARCHAR(10),
    rt_substituto_dados TEXT,
    
    -- 9. ANEXOS E RESPONSÁVEL PELO PREENCHIMENTO
    relacao_documentos_declarados TEXT,
    link_drive_documentos TEXT,
    declaracao_veracidade_texto TEXT,
    preenchedor_nome VARCHAR(255),
    preenchedor_vinculo VARCHAR(100),
    preenchedor_telefone VARCHAR(20),
    
    -- Controlo de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_req_dados_requerimento 
        FOREIGN KEY (requerimento_id) REFERENCES requerimentos_alvara(id) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX idx_req_dados_cpf_cnpj ON requerimentos_alvara_dados (cpf_cnpj) WHERE is_deleted = FALSE;

CREATE TRIGGER trg_requerimentos_alvara_dados_atualizado_em
BEFORE UPDATE ON requerimentos_alvara_dados
FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();