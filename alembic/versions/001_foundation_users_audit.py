"""001_foundation_users_audit

Revision ID: 001_foundation
Revises: 
Create Date: 2026-11-05 05:50:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_foundation"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Habilita a extensão pgcrypto
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    # 2. Criação dos tipos enumerados do Postgres
    op.execute("""
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'perfil_usuario') THEN
            CREATE TYPE perfil_usuario AS ENUM (
                'admin_master',
                'coordenador',
                'fiscal_tecnico',
                'digitador'
            );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_operacao_auditoria') THEN
            CREATE TYPE tipo_operacao_auditoria AS ENUM (
                'INSERT',
                'UPDATE',
                'DELETE',
                'SOFT_DELETE',
                'HOMOLOGACAO',
                'INDEFERIMENTO',
                'LOGIN',
                'ACESSO_SIGILOSO'
            );
        END IF;
    END $$;
    """)

    # 3. Função utilitária para atualização automática de timestamp
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_atualizar_timestamp()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.atualizado_em = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
    """)

    # 4. Tabela: usuarios
    op.create_table(
        "usuarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column(
            "perfil",
            postgresql.ENUM("admin_master", "coordenador", "fiscal_tecnico", "digitador", name="perfil_usuario", create_type=False),
            nullable=False,
            server_default="digitador",
        ),
        sa.Column("nome_completo", sa.String(200), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False),
        sa.Column("matricula", sa.String(50), nullable=True),
        sa.Column("cargo", sa.String(100), nullable=False, server_default="Fiscal Sanitário"),
        sa.Column("portaria_nomeacao", sa.String(100), nullable=True),
        sa.Column("telefone_contato", sa.String(20), nullable=True),
        sa.Column("url_assinatura_rubrica", sa.Text(), nullable=True),
        sa.Column("ultimo_login", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_usuarios_email", "usuarios", ["email"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("uq_usuarios_cpf", "usuarios", ["cpf"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_usuarios_email", "usuarios", ["email"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_usuarios_perfil_ativo", "usuarios", ["perfil", "is_active"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_usuarios_cpf", "usuarios", ["cpf"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_usuarios_atualizado_em
    BEFORE UPDATE ON usuarios
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 5. Tabela: configuracao_institucional (Singleton)
    op.create_table(
        "configuracao_institucional",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("singleton_key", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("municipio", sa.String(100), nullable=False, server_default="Braúnas"),
        sa.Column("uf", sa.String(2), nullable=False, server_default="MG"),
        sa.Column("nome_prefeitura", sa.String(200), nullable=False, server_default="Prefeitura Municipal de Braúnas"),
        sa.Column("nome_secretaria", sa.String(200), nullable=False, server_default="Secretaria Municipal de Saúde"),
        sa.Column("orgao_vigilancia", sa.String(200), nullable=False, server_default="Coordenação de Vigilância em Saúde e Vigilância Sanitária"),
        sa.Column("cnpj_institucional", sa.String(20), nullable=True),
        sa.Column("logradouro", sa.String(200), nullable=True),
        sa.Column("numero", sa.String(20), nullable=True),
        sa.Column("bairro", sa.String(100), nullable=True),
        sa.Column("cep", sa.String(9), nullable=True),
        sa.Column("telefone_oficial", sa.String(20), nullable=True),
        sa.Column("email_oficial", sa.String(150), nullable=True),
        sa.Column("url_brasao_prefeitura", sa.Text(), nullable=True),
        sa.Column("url_logo_vigilancia", sa.Text(), nullable=True),
        sa.Column("texto_padrao_rodape_alvara", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True),
        sa.CheckConstraint("singleton_key = 1", name="chk_singleton_config"),
    )
    op.create_index(
        "uq_configuracao_institucional_singleton",
        "configuracao_institucional",
        ["singleton_key"],
        unique=True,
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.create_index(
        "idx_config_institucional_atualizado_por",
        "configuracao_institucional",
        ["atualizado_por"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.execute("""
    CREATE TRIGGER trg_config_institucional_atualizado_em
    BEFORE UPDATE ON configuracao_institucional
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 6. Tabela: metas_exercicio
    op.create_table(
        "metas_exercicio",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("ano_exercicio", sa.Integer(), nullable=False),
        sa.Column("meta_inspecoes_vapt", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("meta_cobertura_risco_1", sa.Numeric(5, 2), nullable=False, server_default="100.00"),
        sa.Column("meta_cobertura_risco_2", sa.Numeric(5, 2), nullable=False, server_default="100.00"),
        sa.Column("meta_cobertura_risco_3", sa.Numeric(5, 2), nullable=False, server_default="100.00"),
        sa.Column("dias_validade_padrao_alvara", sa.Integer(), nullable=False, server_default="365"),
        sa.Column("dias_prazo_padrao_notificacao", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("observacoes_pactuacao", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("configurado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True),
        sa.CheckConstraint("ano_exercicio >= 2020 AND ano_exercicio <= 2100", name="chk_ano_valido"),
        sa.CheckConstraint("meta_cobertura_risco_1 BETWEEN 0 AND 100", name="chk_percentual_risco_1"),
        sa.CheckConstraint("meta_cobertura_risco_2 BETWEEN 0 AND 100", name="chk_percentual_risco_2"),
        sa.CheckConstraint("meta_cobertura_risco_3 BETWEEN 0 AND 100", name="chk_percentual_risco_3"),
    )
    op.create_index(
        "uq_metas_exercicio_ano_valido",
        "metas_exercicio",
        ["ano_exercicio"],
        unique=True,
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.create_index(
        "uq_exercicio_ativo",
        "metas_exercicio",
        ["is_active"],
        unique=True,
        postgresql_where=sa.text("is_active = TRUE AND is_deleted = FALSE"),
    )
    op.create_index(
        "idx_metas_exercicio_configurado_por",
        "metas_exercicio",
        ["configurado_por"],
        postgresql_where=sa.text("is_deleted = FALSE"),
    )
    op.execute("""
    CREATE TRIGGER trg_metas_exercicio_atualizado_em
    BEFORE UPDATE ON metas_exercicio
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 7. Tabela: logs_auditoria (Append-Only)
    op.create_table(
        "logs_auditoria",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tabela_afetada", sa.String(60), nullable=False),
        sa.Column("registro_id", sa.String(128), nullable=False),
        sa.Column("identificador_entidade", sa.String(250), nullable=True),
        sa.Column(
            "operacao",
            postgresql.ENUM("INSERT", "UPDATE", "DELETE", "SOFT_DELETE", "HOMOLOGACAO", "INDEFERIMENTO", "LOGIN", "ACESSO_SIGILOSO", name="tipo_operacao_auditoria", create_type=False),
            nullable=False,
        ),
        sa.Column("acao", sa.String(100), nullable=False),
        sa.Column("detalhes", sa.Text(), nullable=True),
        sa.Column("dados_anteriores", postgresql.JSONB(), nullable=True),
        sa.Column("dados_novos", postgresql.JSONB(), nullable=True),
        sa.Column("usuario_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True),
        sa.Column("usuario_nome", sa.String(200), nullable=True),
        sa.Column("usuario_matricula", sa.String(50), nullable=True),
        sa.Column("ip_origem", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_logs_tabela_registro", "logs_auditoria", ["tabela_afetada", "registro_id"])
    op.create_index("idx_logs_identificador", "logs_auditoria", ["identificador_entidade"])
    op.create_index("idx_logs_usuario", "logs_auditoria", ["usuario_id", sa.text("criado_em DESC")])
    op.create_index("idx_logs_criado_em", "logs_auditoria", [sa.text("criado_em DESC")])

    # 8. Trigger de Imutabilidade Estrita (Append-Only) em logs_auditoria
    op.execute("""
    CREATE OR REPLACE FUNCTION fn_impedir_violacao_auditoria()
    RETURNS TRIGGER AS $$
    BEGIN
        RAISE EXCEPTION 'Operação não autorizada. A tabela logs_auditoria é estritamente imutável (append-only) para fins legais e de transparência.';
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_bloquear_modificacao_logs
    BEFORE UPDATE OR DELETE ON logs_auditoria
    FOR EACH ROW
    EXECUTE FUNCTION fn_impedir_violacao_auditoria();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_bloquear_modificacao_logs ON logs_auditoria;")
    op.execute("DROP FUNCTION IF EXISTS fn_impedir_violacao_auditoria();")
    op.drop_table("logs_auditoria")
    op.drop_table("metas_exercicio")
    op.drop_table("configuracao_institucional")
    op.drop_table("usuarios")
    op.execute("DROP FUNCTION IF EXISTS fn_atualizar_timestamp();")
    op.execute("DROP TYPE IF EXISTS tipo_operacao_auditoria;")
    op.execute("DROP TYPE IF EXISTS perfil_usuario;")
