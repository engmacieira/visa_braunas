"""003_fiscalizacao_inspecoes

Revision ID: 003_fiscalizacao
Revises: 002_estabelecimentos
Create Date: 2026-11-05 07:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "003_fiscalizacao"
down_revision: Union[str, None] = "002_estabelecimentos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Criação dos tipos enumerados de Fiscalização (Módulo 5)
    op.execute("""
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_motivo_inspecao') THEN
            CREATE TYPE tipo_motivo_inspecao AS ENUM (
                'requerimento_alvara',
                'rotina_programada',
                'denuncia',
                'reinspecao',
                'vapt_trabalhador',
                'investigacao_surto'
            );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_inspecao') THEN
            CREATE TYPE status_inspecao AS ENUM (
                'agendada',
                'em_andamento',
                'concluida',
                'cancelada'
            );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'resultado_inspecao') THEN
            CREATE TYPE resultado_inspecao AS ENUM (
                'aprovado',
                'aprovado_com_exigencias',
                'notificado_com_prazo',
                'auto_infracao',
                'interditado_parcialmente',
                'interditado_totalmente',
                'indeferido'
            );
        END IF;
    END $$;
    """)

    # 2. Tabela: inspecoes
    op.create_table(
        "inspecoes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("numero_termo", sa.String(50), nullable=False),
        sa.Column(
            "motivo",
            postgresql.ENUM("requerimento_alvara", "rotina_programada", "denuncia", "reinspecao", "vapt_trabalhador", "investigacao_surto", name="tipo_motivo_inspecao", create_type=False),
            nullable=False,
            server_default="rotina_programada",
        ),
        sa.Column(
            "status",
            postgresql.ENUM("agendada", "em_andamento", "concluida", "cancelada", name="status_inspecao", create_type=False),
            nullable=False,
            server_default="agendada",
        ),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False),
        sa.Column("requerimento_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("denuncia_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("fiscal_responsavel_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=False),
        sa.Column("fiscais_acompanhantes", sa.Text(), nullable=True),
        sa.Column("data_agendamento", sa.Date(), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=False),
        sa.Column("data_fim", sa.Date(), nullable=True),
        sa.Column("hora_inspecao", sa.Time(), nullable=True),
        sa.Column(
            "resultado",
            postgresql.ENUM("aprovado", "aprovado_com_exigencias", "notificado_com_prazo", "auto_infracao", "interditado_parcialmente", "interditado_totalmente", "indeferido", name="resultado_inspecao", create_type=False),
            nullable=True,
        ),
        sa.Column("nome_pessoa_acompanhou", sa.String(200), nullable=True),
        sa.Column("cpf_pessoa_acompanhou", sa.String(14), nullable=True),
        sa.Column("relato_vistoria", sa.Text(), nullable=True),
        sa.Column("irregularidades_constatadas", sa.Text(), nullable=True),
        sa.Column("exigencias_notificadas", sa.Text(), nullable=True),
        sa.Column("prazo_adequacao_dias", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("data_limite_adequacao", sa.Date(), nullable=True),
        sa.Column("nome_local_trabalho", sa.String(200), nullable=True),
        sa.Column("principais_riscos_identificados", sa.String(1500), nullable=True),
        sa.Column("recomendacoes_orientacoes", sa.String(1500), nullable=True),
        sa.Column("checklist_respostas", postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("relatorio_fotografico", postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("url_termo_assinado_pdf", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    # 3. Índices Parciais Únicos e de Performance
    op.create_index("uq_inspecoes_numero_termo", "inspecoes", ["numero_termo"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_inspecoes_estabelecimento", "inspecoes", ["estabelecimento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_inspecoes_fiscal", "inspecoes", ["fiscal_responsavel_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_inspecoes_motivo_status", "inspecoes", ["motivo", "status"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_inspecoes_data_inicio", "inspecoes", [sa.text("data_inicio DESC")], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_inspecoes_requerimento", "inspecoes", ["requerimento_id"], postgresql_where=sa.text("requerimento_id IS NOT NULL AND is_deleted = FALSE"))
    op.create_index(
        "idx_inspecoes_prazos_pendentes",
        "inspecoes",
        ["data_limite_adequacao", "status"],
        postgresql_where=sa.text("resultado = 'notificado_com_prazo' AND is_deleted = FALSE AND is_active = TRUE"),
    )

    # 4. Trigger de Atualização Automática de Timestamp
    op.execute("""
    CREATE TRIGGER trg_inspecoes_atualizado_em
    BEFORE UPDATE ON inspecoes
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 5. Views Prontas para Indicadores e Painéis de Alerta
    op.execute("""
    CREATE OR REPLACE VIEW vw_indicador_11_vapt_consolidado AS
    SELECT 
        EXTRACT(YEAR FROM data_inicio) AS exercicio,
        COUNT(*) AS total_acoes_vapt,
        COUNT(*) FILTER (WHERE status = 'concluida') AS vapt_concluidas,
        COUNT(*) FILTER (WHERE status = 'em_andamento') AS vapt_em_acompanhamento
    FROM inspecoes
    WHERE motivo = 'vapt_trabalhador'
      AND is_deleted = FALSE
      AND is_active = TRUE
    GROUP BY EXTRACT(YEAR FROM data_inicio);
    """)

    op.execute("""
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
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS vw_inspecoes_notificacoes_a_vencer;")
    op.execute("DROP VIEW IF EXISTS vw_indicador_11_vapt_consolidado;")
    op.drop_table("inspecoes")
    op.execute("DROP TYPE IF EXISTS resultado_inspecao;")
    op.execute("DROP TYPE IF EXISTS status_inspecao;")
    op.execute("DROP TYPE IF EXISTS tipo_motivo_inspecao;")
