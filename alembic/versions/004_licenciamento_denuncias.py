"""004_licenciamento_denuncias

Revision ID: 004_licenciamento_denuncias
Revises: 003_fiscalizacao
Create Date: 2026-11-05 08:15:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "004_licenciamento_denuncias"
down_revision: Union[str, None] = "003_fiscalizacao"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ==============================================================================
    # 1. CRIAÇÃO DOS 6 TIPOS ENUMERADOS DO POSTGRESQL (MÓDULOS 2, 4 E 6)
    # ==============================================================================
    op.execute("""
    DO $$ 
    BEGIN
        -- 1.1. Licenciamento: Tipo de Solicitação
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_solicitacao_alvara') THEN
            CREATE TYPE tipo_solicitacao_alvara AS ENUM (
                'concessao_inicial',
                'renovacao'
            );
        END IF;

        -- 1.2. Licenciamento: Status da Tramitação
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_requerimento') THEN
            CREATE TYPE status_requerimento AS ENUM (
                'pendente',
                'em_analise',
                'aguardando_inspecao',
                'aguardando_adequacao',
                'deferido',
                'indeferido',
                'cancelado'
            );
        END IF;

        -- 1.3. Licenciamento: Situação do Título Oficial (Alvará)
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_alvara') THEN
            CREATE TYPE status_alvara AS ENUM (
                'ativo',
                'vencido',
                'suspenso',
                'revogado',
                'cassado'
            );
        END IF;

        -- 1.4. Ouvidoria: Canal de Entrada
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'canal_denuncia') THEN
            CREATE TYPE canal_denuncia AS ENUM (
                'formulario_web',
                'presencial',
                'telefone',
                'ouvidoria_geral',
                'oficio_ministerio'
            );
        END IF;

        -- 1.5. Ouvidoria: Status da Manifestação
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_denuncia') THEN
            CREATE TYPE status_denuncia AS ENUM (
                'recebida',
                'em_analise',
                'em_apuracao_fiscal',
                'procedente',
                'improcedente',
                'arquivada'
            );
        END IF;

        -- 1.6. Ouvidoria: Grau de Gravidade
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'gravidade_denuncia') THEN
            CREATE TYPE gravidade_denuncia AS ENUM (
                'baixa',
                'media',
                'alta',
                'urgente'
            );
        END IF;
    END $$;
    """)

    # ==============================================================================
    # 2. TABELA: REQUERIMENTOS_ALVARA (MÓDULO 4)
    # ==============================================================================
    op.create_table(
        "requerimentos_alvara",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("numero_protocolo", sa.String(length=35), nullable=False),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo_solicitacao", postgresql.ENUM("concessao_inicial", "renovacao", name="tipo_solicitacao_alvara", create_type=False), nullable=False),
        sa.Column("status", postgresql.ENUM("pendente", "em_analise", "aguardando_inspecao", "aguardando_adequacao", "deferido", "indeferido", "cancelado", name="status_requerimento", create_type=False), server_default="pendente", nullable=False),
        sa.Column("alvara_anterior_numero", sa.String(length=50), nullable=True),
        sa.Column("alvara_anterior_exercicio", sa.Integer(), nullable=True),
        sa.Column("data_submissao", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("origem_solicitacao", sa.String(length=50), server_default="Google Forms Web", nullable=False),
        sa.Column("analisado_por", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("data_inicio_analise", sa.DateTime(timezone=True), nullable=True),
        sa.Column("data_conclusao", sa.DateTime(timezone=True), nullable=True),
        sa.Column("parecer_fiscal", sa.Text(), nullable=True),
        sa.Column("motivo_indeferimento", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["estabelecimento_id"], ["estabelecimentos.id"], name="fk_requerimento_estabelecimento", ondelete="RESTRICT", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["analisado_por"], ["usuarios.id"], name="fk_requerimento_analisado_por", ondelete="SET NULL", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_requerimento_protocolo",
        "requerimentos_alvara",
        ["numero_protocolo"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_req_alvara_protocolo",
        "requerimentos_alvara",
        ["numero_protocolo"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_req_alvara_painel_fila",
        "requerimentos_alvara",
        ["status", "data_submissao"],
        postgresql_where=sa.text("status IN ('pendente', 'em_analise', 'aguardando_inspecao', 'aguardando_adequacao') AND is_deleted = false"),
    )
    op.create_index(
        "idx_req_alvara_estabelecimento",
        "requerimentos_alvara",
        ["estabelecimento_id", "data_submissao"],
        postgresql_where=sa.text("is_deleted = false"),
    )

    # ==============================================================================
    # 3. TABELA: REQUERIMENTOS_ALVARA_DADOS (MÓDULO 4 - RELACIONAMENTO 1:1)
    # ==============================================================================
    op.create_table(
        "requerimentos_alvara_dados",
        sa.Column("requerimento_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("tipo_cadastro", sa.String(length=30), nullable=True),
        sa.Column("cpf_cnpj", sa.String(length=20), nullable=False),
        sa.Column("razao_social", sa.String(length=255), nullable=False),
        sa.Column("nome_fantasia", sa.String(length=255), nullable=True),
        sa.Column("inscricao_municipal", sa.String(length=50), nullable=True),
        sa.Column("natureza_juridica", sa.String(length=100), nullable=True),
        sa.Column("telefone_fixo", sa.String(length=20), nullable=True),
        sa.Column("telefone_celular", sa.String(length=20), nullable=True),
        sa.Column("email_comercial", sa.String(length=150), nullable=True),
        sa.Column("cep", sa.String(length=10), nullable=True),
        sa.Column("logradouro", sa.String(length=255), nullable=True),
        sa.Column("numero", sa.String(length=20), nullable=True),
        sa.Column("complemento", sa.String(length=100), nullable=True),
        sa.Column("bairro", sa.String(length=100), nullable=True),
        sa.Column("ponto_referencia", sa.Text(), nullable=True),
        sa.Column("acesso_compartilhado_residencia", sa.String(length=50), nullable=True),
        sa.Column("cnae_principal_selecionado", sa.String(length=255), nullable=True),
        sa.Column("cnae_principal_codigo_manual", sa.String(length=20), nullable=True),
        sa.Column("cnae_principal_descricao", sa.Text(), nullable=True),
        sa.Column("cnaes_secundarios_declarados", sa.Text(), nullable=True),
        sa.Column("atividades_auxiliares", sa.Text(), nullable=True),
        sa.Column("projeto_arquitetonico_aprovado", sa.String(length=50), nullable=True),
        sa.Column("numero_processo_projeto_sei", sa.String(length=50), nullable=True),
        sa.Column("afe_anvisa", sa.String(length=50), nullable=True),
        sa.Column("ae_anvisa", sa.String(length=50), nullable=True),
        sa.Column("dias_horario_funcionamento", sa.Text(), nullable=True),
        sa.Column("num_funcionarios_manipuladores", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("fonte_abastecimento_agua", sa.String(length=100), nullable=True),
        sa.Column("possui_caixa_agua_propria", sa.String(length=10), nullable=True),
        sa.Column("capacidade_caixa_agua_litros", sa.Integer(), server_default=sa.text("0"), nullable=False),
        sa.Column("data_ultima_limpeza_caixa_agua", sa.Date(), nullable=True),
        sa.Column("possui_coleta_rss", sa.String(length=50), nullable=True),
        sa.Column("possui_raio_x", sa.String(length=50), nullable=True),
        sa.Column("rep_nome", sa.String(length=255), nullable=True),
        sa.Column("rep_cpf", sa.String(length=14), nullable=True),
        sa.Column("rep_rg", sa.String(length=30), nullable=True),
        sa.Column("rep_orgao_uf", sa.String(length=20), nullable=True),
        sa.Column("rep_celular", sa.String(length=20), nullable=True),
        sa.Column("rep_email", sa.String(length=150), nullable=True),
        sa.Column("rep_endereco_residencial", sa.Text(), nullable=True),
        sa.Column("exige_rt", sa.String(length=50), nullable=True),
        sa.Column("rt_proprio_representante", sa.String(length=50), nullable=True),
        sa.Column("rt_nome", sa.String(length=255), nullable=True),
        sa.Column("rt_cpf", sa.String(length=14), nullable=True),
        sa.Column("rt_conselho_classe", sa.String(length=30), nullable=True),
        sa.Column("rt_numero_conselho", sa.String(length=50), nullable=True),
        sa.Column("rt_conselho_uf", sa.String(length=2), nullable=True),
        sa.Column("rt_carga_horaria", sa.String(length=50), nullable=True),
        sa.Column("rt_telefone", sa.String(length=20), nullable=True),
        sa.Column("rt_email", sa.String(length=150), nullable=True),
        sa.Column("possui_rt_substituto", sa.String(length=10), nullable=True),
        sa.Column("rt_substituto_dados", sa.Text(), nullable=True),
        sa.Column("relacao_documentos_declarados", sa.Text(), nullable=True),
        sa.Column("link_drive_documentos", sa.Text(), nullable=True),
        sa.Column("declaracao_veracidade_texto", sa.Text(), nullable=True),
        sa.Column("preenchedor_nome", sa.String(length=255), nullable=True),
        sa.Column("preenchedor_vinculo", sa.String(length=100), nullable=True),
        sa.Column("preenchedor_telefone", sa.String(length=20), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["requerimento_id"], ["requerimentos_alvara.id"], name="fk_req_dados_requerimento", ondelete="CASCADE", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("requerimento_id"),
    )
    op.create_index(
        "idx_req_dados_cpf_cnpj",
        "requerimentos_alvara_dados",
        ["cpf_cnpj"],
        postgresql_where=sa.text("is_deleted = false"),
    )

    # ==============================================================================
    # 4. TABELA: ALVARAS_SANITARIOS (MÓDULO 2)
    # ==============================================================================
    op.create_table(
        "alvaras_sanitarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("numero_alvara", sa.Integer(), nullable=False),
        sa.Column("exercicio", sa.Integer(), nullable=False),
        sa.Column("numero_formatado", sa.String(length=30), nullable=False),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("requerimento_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("inspecao_conclusiva_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("codigo_autenticidade", sa.String(length=32), nullable=False),
        sa.Column("data_emissao", sa.Date(), server_default=sa.text("CURRENT_DATE"), nullable=False),
        sa.Column("data_vencimento", sa.Date(), nullable=False),
        sa.Column("status", postgresql.ENUM("ativo", "vencido", "suspenso", "revogado", "cassado", name="status_alvara", create_type=False), server_default="ativo", nullable=False),
        sa.Column("emitido_por", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("condicionantes_restricoes", sa.Text(), nullable=True),
        sa.Column("url_alvara_pdf", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.CheckConstraint("data_vencimento >= data_emissao", name="chk_alvara_datas"),
        sa.ForeignKeyConstraint(["estabelecimento_id"], ["estabelecimentos.id"], name="fk_alvaras_estabelecimento", ondelete="RESTRICT", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["requerimento_id"], ["requerimentos_alvara.id"], name="fk_alvaras_requerimento", ondelete="SET NULL", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["inspecao_conclusiva_id"], ["inspecoes.id"], name="fk_alvaras_inspecao_conclusiva", ondelete="SET NULL", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["emitido_por"], ["usuarios.id"], name="fk_alvaras_emitido_por", ondelete="RESTRICT", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_alvara_numero_exercicio",
        "alvaras_sanitarios",
        ["numero_alvara", "exercicio"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "uq_alvara_codigo_autenticidade",
        "alvaras_sanitarios",
        ["codigo_autenticidade"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_autenticidade",
        "alvaras_sanitarios",
        ["codigo_autenticidade"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_estabelecimento",
        "alvaras_sanitarios",
        ["estabelecimento_id", "data_emissao"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_vencimento_alerta",
        "alvaras_sanitarios",
        ["data_vencimento", "status"],
        postgresql_where=sa.text("status = 'ativo' AND is_active = true AND is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_requerimento",
        "alvaras_sanitarios",
        ["requerimento_id"],
        postgresql_where=sa.text("requerimento_id IS NOT NULL AND is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_inspecao_conclusiva",
        "alvaras_sanitarios",
        ["inspecao_conclusiva_id"],
        postgresql_where=sa.text("inspecao_conclusiva_id IS NOT NULL AND is_deleted = false"),
    )
    op.create_index(
        "idx_alvaras_emitido_por",
        "alvaras_sanitarios",
        ["emitido_por"],
        postgresql_where=sa.text("is_deleted = false"),
    )

    # Chave estrangeira de inspecoes para requerimentos_alvara
    op.create_foreign_key(
        "fk_inspecoes_requerimento",
        "inspecoes",
        "requerimentos_alvara",
        ["requerimento_id"],
        ["id"],
        ondelete="SET NULL",
        onupdate="CASCADE",
    )

    # ==============================================================================
    # 5. TABELA: DENUNCIAS (MÓDULO 6)
    # ==============================================================================
    op.create_table(
        "denuncias",
        sa.Column("id", postgresql.UUID(as_uuid=True), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("numero_protocolo", sa.String(length=35), nullable=False),
        sa.Column("data_recebimento", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("origem", postgresql.ENUM("formulario_web", "presencial", "telefone", "ouvidoria_geral", "oficio_ministerio", name="canal_denuncia", create_type=False), server_default="formulario_web", nullable=False),
        sa.Column("gravidade", postgresql.ENUM("baixa", "media", "alta", "urgente", name="gravidade_denuncia", create_type=False), server_default="media", nullable=False),
        sa.Column("status", postgresql.ENUM("recebida", "em_analise", "em_apuracao_fiscal", "procedente", "improcedente", "arquivada", name="status_denuncia", create_type=False), server_default="recebida", nullable=False),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("local_denunciado_identificacao", sa.String(length=255), nullable=False),
        sa.Column("logradouro", sa.String(length=255), nullable=True),
        sa.Column("numero", sa.String(length=20), nullable=True),
        sa.Column("bairro", sa.String(length=100), nullable=True),
        sa.Column("ponto_referencia", sa.Text(), nullable=True),
        sa.Column("denunciante_anonimo", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("denunciante_nome", sa.String(length=200), nullable=True),
        sa.Column("denunciante_telefone", sa.String(length=20), nullable=True),
        sa.Column("denunciante_email", sa.String(length=150), nullable=True),
        sa.Column("relato_denuncia", sa.Text(), nullable=False),
        sa.Column("url_anexos_evidencias", postgresql.JSONB(astext_type=sa.Text()), server_default=sa.text("'[]'::jsonb"), nullable=False),
        sa.Column("fiscal_designado_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("despacho_coordenacao", sa.Text(), nullable=True),
        sa.Column("conclusao_apuracao", sa.Text(), nullable=True),
        sa.Column("resposta_ao_denunciante", sa.Text(), nullable=True),
        sa.Column("data_encerramento", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finalizado_por", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("is_deleted", sa.Boolean(), server_default=sa.text("false"), nullable=False),
        sa.Column("criado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["estabelecimento_id"], ["estabelecimentos.id"], name="fk_denuncias_estabelecimento", ondelete="SET NULL", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["fiscal_designado_id"], ["usuarios.id"], name="fk_denuncias_fiscal_designado", ondelete="SET NULL", onupdate="CASCADE"),
        sa.ForeignKeyConstraint(["finalizado_por"], ["usuarios.id"], name="fk_denuncias_finalizado_por", ondelete="SET NULL", onupdate="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_denuncia_protocolo",
        "denuncias",
        ["numero_protocolo"],
        unique=True,
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_denuncias_protocolo",
        "denuncias",
        ["numero_protocolo"],
        postgresql_where=sa.text("is_deleted = false"),
    )
    op.create_index(
        "idx_denuncias_status_fila",
        "denuncias",
        ["status", "gravidade", "data_recebimento"],
        postgresql_where=sa.text("status IN ('recebida', 'em_analise', 'em_apuracao_fiscal') AND is_deleted = false"),
    )
    op.create_index(
        "idx_denuncias_estabelecimento",
        "denuncias",
        ["estabelecimento_id"],
        postgresql_where=sa.text("estabelecimento_id IS NOT NULL AND is_deleted = false"),
    )
    op.create_index(
        "idx_denuncias_fiscal_designado",
        "denuncias",
        ["fiscal_designado_id"],
        postgresql_where=sa.text("fiscal_designado_id IS NOT NULL AND is_deleted = false"),
    )

    # ==============================================================================
    # 6. RESOLUÇÃO DE CHAVE ESTRANGEIRA CRUZADA: INSPEÇÕES -> DENÚNCIAS
    # ==============================================================================
    op.create_foreign_key(
        "fk_inspecoes_denuncias",
        "inspecoes",
        "denuncias",
        ["denuncia_id"],
        ["id"],
        ondelete="SET NULL",
        onupdate="CASCADE",
    )

    # ==============================================================================
    # 7. TRIGGERS, FUNÇÃO DE SINCRONIZAÇÃO E VIEW OPERACIONAL
    # ==============================================================================
    op.execute("""
    CREATE TRIGGER trg_requerimentos_alvara_atualizado_em
    BEFORE UPDATE ON requerimentos_alvara
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

    CREATE TRIGGER trg_requerimentos_alvara_dados_atualizado_em
    BEFORE UPDATE ON requerimentos_alvara_dados
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

    CREATE TRIGGER trg_alvaras_sanitarios_atualizado_em
    BEFORE UPDATE ON alvaras_sanitarios
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

    CREATE TRIGGER trg_denuncias_atualizado_em
    BEFORE UPDATE ON denuncias
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();

    -- Sincronização automática do alvará emitido no estabelecimento mestre
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
    FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_alvara_estabelecimento();

    -- View de Fila Priorizada de Trabalho da Ouvidoria
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
    """)


def downgrade() -> None:
    op.execute("""
    DROP VIEW IF EXISTS vw_denuncias_fila_trabalho;
    DROP TRIGGER IF EXISTS trg_alvara_sincroniza_estabelecimento ON alvaras_sanitarios;
    DROP FUNCTION IF EXISTS fn_sincronizar_alvara_estabelecimento();
    DROP TRIGGER IF EXISTS trg_denuncias_atualizado_em ON denuncias;
    DROP TRIGGER IF EXISTS trg_alvaras_sanitarios_atualizado_em ON alvaras_sanitarios;
    DROP TRIGGER IF EXISTS trg_requerimentos_alvara_dados_atualizado_em ON requerimentos_alvara_dados;
    DROP TRIGGER IF EXISTS trg_requerimentos_alvara_atualizado_em ON requerimentos_alvara;
    """)

    op.drop_constraint("fk_inspecoes_denuncias", "inspecoes", type_="foreignkey")
    op.drop_constraint("fk_inspecoes_requerimento", "inspecoes", type_="foreignkey")

    op.drop_table("denuncias")
    op.drop_table("alvaras_sanitarios")
    op.drop_table("requerimentos_alvara_dados")
    op.drop_table("requerimentos_alvara")

    op.execute("""
    DROP TYPE IF EXISTS gravidade_denuncia;
    DROP TYPE IF EXISTS status_denuncia;
    DROP TYPE IF EXISTS canal_denuncia;
    DROP TYPE IF EXISTS status_alvara;
    DROP TYPE IF EXISTS status_requerimento;
    DROP TYPE IF EXISTS tipo_solicitacao_alvara;
    """)
