-- ==============================================================================
-- MÓDULO 7: LOGS DE AUDITORIA E RASTREIO
-- Dialeto: PostgreSQL
-- Padrão: UUID PK + Consistência Estética (is_active/is_deleted) + Append-Only
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. TIPO ENUMERADO: OPERAÇÕES DE AUDITORIA
-- Bloco DO para segurança na execução iterativa e idempotência
-- ==============================================================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_operacao_auditoria') THEN
        CREATE TYPE tipo_operacao_auditoria AS ENUM (
            'INSERT',          -- Criação de novo registo
            'UPDATE',          -- Atualização cadastral ou de status
            'DELETE',          -- Exclusão física (quando permitida pelo sistema)
            'SOFT_DELETE',     -- Exclusão lógica (is_deleted = true)
            'HOMOLOGACAO',     -- Deferimento de requerimento / emissão de alvará
            'INDEFERIMENTO',   -- Recusa de requerimento
            'LOGIN',           -- Registo de sessão de utilizador
            'ACESSO_SIGILOSO'  -- Consulta a dados sensíveis de denúncia ou RT
        );
    END IF;
END $$;

-- ==============================================================================
-- 2. TABELA: LOGS_AUDITORIA
-- Trilha imutável de eventos e transparência fiscalizatória
-- ==============================================================================
CREATE TABLE logs_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Objeto da Ação
    tabela_afetada VARCHAR(60) NOT NULL,
    registro_id VARCHAR(128) NOT NULL,
    identificador_entidade VARCHAR(250),
    
    -- Operação e Contexto
    operacao tipo_operacao_auditoria NOT NULL,
    acao VARCHAR(100) NOT NULL,
    detalhes TEXT,
    
    -- Comparativo de Dados (Diff / Snapshot para Auditoria Reversa)
    dados_anteriores JSONB,
    dados_novos JSONB,
    
    -- Identificação do Agente Público Responsável
    usuario_id UUID,
    usuario_nome VARCHAR(200),
    usuario_matricula VARCHAR(50),
    
    -- Metadados de Rede e Conexão (Segurança)
    ip_origem VARCHAR(45),
    user_agent TEXT,
    
    -- Consistência Estética do Schema (DRY)
    -- NOTA: Como a tabela é imutável, o is_deleted será sempre FALSE e o atualizado_em nunca mudará.
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- Chaves Estrangeiras Padronizadas
    CONSTRAINT fk_logs_auditoria_usuario 
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

-- ==============================================================================
-- 3. ÍNDICES DE PERFORMANCE PARA AUDITORIA E RELATÓRIOS
-- (Não levam WHERE is_deleted = FALSE, pois os logs nunca são apagados)
-- ==============================================================================
CREATE INDEX idx_logs_tabela_registro ON logs_auditoria (tabela_afetada, registro_id);
CREATE INDEX idx_logs_identificador ON logs_auditoria (identificador_entidade);
CREATE INDEX idx_logs_usuario ON logs_auditoria (usuario_id, criado_em DESC);
CREATE INDEX idx_logs_criado_em ON logs_auditoria (criado_em DESC);

-- ==============================================================================
-- 4. GATILHO DE IMUTABILIDADE ESTRITA (REGRA APPEND-ONLY)
-- ==============================================================================

-- Função que rejeita qualquer modificação física ou lógica nos logs
CREATE OR REPLACE FUNCTION fn_impedir_violacao_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Operação não autorizada. A tabela logs_auditoria é estritamente imutável (append-only) para fins legais e de transparência.';
END;
$$ LANGUAGE plpgsql;

-- Trigger que bloqueia UPDATE e DELETE (Garante que nem o is_deleted nem o atualizado_em sejam modificados)
CREATE TRIGGER trg_bloquear_modificacao_logs
BEFORE UPDATE OR DELETE ON logs_auditoria
FOR EACH ROW
EXECUTE FUNCTION fn_impedir_violacao_auditoria();