"""002_estabelecimentos_cnaes

Revision ID: 002_estabelecimentos
Revises: 001_foundation
Create Date: 2026-11-05 06:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "002_estabelecimentos"
down_revision: Union[str, None] = "001_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Criação dos tipos enumerados dos Módulos 2 e 3
    op.execute("""
    DO $$ 
    BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'nivel_risco_cnae') THEN
            CREATE TYPE nivel_risco_cnae AS ENUM ('Dispensado', 'Risco I', 'Risco II', 'Risco III');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'competencia_fiscalizacao') THEN
            CREATE TYPE competencia_fiscalizacao AS ENUM ('Municipal', 'Estadual', 'Pactuado');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'categoria_documento') THEN
            CREATE TYPE categoria_documento AS ENUM (
                'licenciamento', 'infraestrutura_saneamento', 'controle_ambiental',
                'seguranca_saude', 'gestao_qualidade', 'habilitacao_profissional'
            );
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'status_alvara') THEN
            CREATE TYPE status_alvara AS ENUM ('ativo', 'vencido', 'suspenso', 'revogado', 'cassado');
        END IF;
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
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'parecer_projeto') THEN
            CREATE TYPE parecer_projeto AS ENUM ('Sim', 'Não', 'Não Aplicável');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'situacao_documento_estabelecimento') THEN
            CREATE TYPE situacao_documento_estabelecimento AS ENUM ('vigente', 'vencido', 'em_analise', 'dispensado', 'rejeitado');
        END IF;
    END $$;
    """)

    # 2. Tabela: cnaes
    op.create_table(
        "cnaes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("codigo", sa.String(10), nullable=False),
        sa.Column("descricao", sa.String(300), nullable=False),
        sa.Column("grau_risco_padrao", postgresql.ENUM("Dispensado", "Risco I", "Risco II", "Risco III", name="nivel_risco_cnae", create_type=False), nullable=False, server_default="Risco II"),
        sa.Column("competencia_padrao", postgresql.ENUM("Municipal", "Estadual", "Pactuado", name="competencia_fiscalizacao", create_type=False), nullable=False, server_default="Municipal"),
        sa.Column("exige_rt", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("exige_projeto_arquitetonico", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_cnaes_codigo", "cnaes", ["codigo"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_cnaes_grau_risco", "cnaes", ["grau_risco_padrao"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_cnaes_ativo", "cnaes", ["is_active"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_cnaes_atualizado_em
    BEFORE UPDATE ON cnaes
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 3. Tabela: tipos_documentos
    op.create_table(
        "tipos_documentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("codigo_identificador", sa.String(50), nullable=False),
        sa.Column("nome_documento", sa.String(200), nullable=False),
        sa.Column("descricao", sa.Text(), nullable=True),
        sa.Column("categoria", postgresql.ENUM("licenciamento", "infraestrutura_saneamento", "controle_ambiental", "seguranca_saude", "gestao_qualidade", "habilitacao_profissional", name="categoria_documento", create_type=False), nullable=False, server_default="licenciamento"),
        sa.Column("possui_validade", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("validade_padrao_meses", sa.Integer(), nullable=True, server_default="12"),
        sa.Column("exige_orgao_emissor", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("exige_responsavel_emissao", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.CheckConstraint("validade_padrao_meses IS NULL OR validade_padrao_meses > 0", name="chk_tipos_docs_validade_positiva"),
    )
    op.create_index("uq_tipos_documentos_codigo", "tipos_documentos", ["codigo_identificador"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_tipos_docs_categoria", "tipos_documentos", ["categoria"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_tipos_docs_ativo", "tipos_documentos", ["is_active"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_tipos_documentos_atualizado_em
    BEFORE UPDATE ON tipos_documentos
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 4. Tabela: representantes_legais
    op.create_table(
        "representantes_legais",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome_completo", sa.String(255), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False),
        sa.Column("rg_numero", sa.String(30), nullable=True),
        sa.Column("rg_orgao_emissor", sa.String(20), nullable=True),
        sa.Column("telefone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("endereco_residencial", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_representantes_cpf", "representantes_legais", ["cpf"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_representantes_nome", "representantes_legais", ["nome_completo"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_representantes_legais_atualizado_em
    BEFORE UPDATE ON representantes_legais
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 5. Tabela: estabelecimentos
    op.create_table(
        "estabelecimentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("tipo_cadastro", postgresql.ENUM("PF", "PJ", name="tipo_pessoa", create_type=False), nullable=False, server_default="PJ"),
        sa.Column("cnpj_cpf", sa.String(20), nullable=False),
        sa.Column("inscricao_municipal", sa.String(50), nullable=True),
        sa.Column("razao_social", sa.String(200), nullable=False),
        sa.Column("nome_fantasia", sa.String(200), nullable=True),
        sa.Column("natureza_juridica", sa.String(100), nullable=True),
        sa.Column("cep", sa.String(9), nullable=False, server_default="35.189-000"),
        sa.Column("logradouro", sa.String(255), nullable=False),
        sa.Column("numero", sa.String(20), nullable=False),
        sa.Column("complemento", sa.String(100), nullable=True),
        sa.Column("bairro", sa.String(100), nullable=False),
        sa.Column("municipio", sa.String(100), nullable=False, server_default="Braúnas"),
        sa.Column("uf", sa.String(2), nullable=False, server_default="MG"),
        sa.Column("ponto_referencia", sa.Text(), nullable=True),
        sa.Column("acesso_compartilhado_residencia", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("telefone_fixo", sa.String(20), nullable=True),
        sa.Column("telefone_celular", sa.String(20), nullable=False),
        sa.Column("email", sa.String(150), nullable=False),
        sa.Column("nivel_risco", postgresql.ENUM("Risco I", "Risco II", "Risco III", name="nivel_risco_sanitario", create_type=False), nullable=False),
        sa.Column("competencia_fiscalizacao", postgresql.ENUM("Municipal", "Estadual", "Pactuado", name="competencia_fiscalizacao", create_type=False), nullable=False, server_default="Municipal"),
        sa.Column("situacao_estabelecimento", postgresql.ENUM("Ativo", "Inativo", "Suspenso", name="situacao_cadastral", create_type=False), nullable=False, server_default="Ativo"),
        sa.Column("observacoes_baixa", sa.String(500), nullable=True),
        sa.Column("horario_funcionamento", sa.Text(), nullable=True),
        sa.Column("fonte_abastecimento_agua", sa.String(100), nullable=True, server_default="Rede Pública (COPASA)"),
        sa.Column("possui_reservatorio_proprio", sa.Boolean(), nullable=True, server_default=sa.text("false")),
        sa.Column("capacidade_reservatorio_litros", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("numero_alvara", sa.String(30), nullable=True),
        sa.Column("data_validade_alvara", sa.Date(), nullable=True),
        sa.Column("situacao_alvara", postgresql.ENUM("Válido", "Vencido", "Isento/Dispensado", "Não Possui (Irregular)", name="situacao_alvara", create_type=False), nullable=True, server_default="Não Possui (Irregular)"),
        sa.Column("representante_legal_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("representantes_legais.id", ondelete="RESTRICT", onupdate="CASCADE"), nullable=True),
        sa.Column("firestore_id", sa.String(128), nullable=True),
        sa.Column("cadastrado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_estabelecimentos_cnpj_cpf", "estabelecimentos", ["cnpj_cpf"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("uq_estabelecimentos_firestore_id", "estabelecimentos", ["firestore_id"], unique=True, postgresql_where=sa.text("firestore_id IS NOT NULL AND is_deleted = FALSE"))
    op.create_index("idx_estabelecimentos_cnpj_cpf", "estabelecimentos", ["cnpj_cpf"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estabelecimentos_risco_alvara", "estabelecimentos", ["nivel_risco", "situacao_alvara"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estabelecimentos_situacao", "estabelecimentos", ["situacao_estabelecimento"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estabelecimentos_validade_alvara", "estabelecimentos", ["data_validade_alvara"], postgresql_where=sa.text("situacao_alvara = 'Válido' AND is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_estabelecimentos_atualizado_em
    BEFORE UPDATE ON estabelecimentos
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 6. Tabela: estabelecimento_cnaes (N:N)
    op.create_table(
        "estabelecimento_cnaes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("cnae_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("cnaes.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("cnae_codigo", sa.String(10), nullable=False),
        sa.Column("eh_principal", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("data_inicio_atividade", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_estab_cnae_associacao", "estabelecimento_cnaes", ["estabelecimento_id", "cnae_id"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("uq_estabelecimento_cnae_principal", "estabelecimento_cnaes", ["estabelecimento_id"], unique=True, postgresql_where=sa.text("eh_principal = TRUE AND is_deleted = FALSE"))
    op.create_index("idx_estab_cnaes_codigo", "estabelecimento_cnaes", ["cnae_codigo"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estab_cnaes_ativos", "estabelecimento_cnaes", ["estabelecimento_id", "eh_principal"], postgresql_where=sa.text("is_active = TRUE AND is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_estabelecimento_cnaes_atualizado_em
    BEFORE UPDATE ON estabelecimento_cnaes
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 7. Tabela: responsaveis_tecnicos
    op.create_table(
        "responsaveis_tecnicos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("nome_completo", sa.String(255), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False),
        sa.Column("conselho_classe", sa.String(30), nullable=False),
        sa.Column("numero_registro_conselho", sa.String(50), nullable=False),
        sa.Column("uf_conselho", sa.String(2), nullable=False, server_default="MG"),
        sa.Column("telefone", sa.String(20), nullable=False),
        sa.Column("email", sa.String(150), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_rt_cpf", "responsaveis_tecnicos", ["cpf"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("uq_rt_registro_uf", "responsaveis_tecnicos", ["conselho_classe", "numero_registro_conselho", "uf_conselho"], unique=True, postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_rt_conselho_registro", "responsaveis_tecnicos", ["conselho_classe", "numero_registro_conselho"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_responsaveis_tecnicos_atualizado_em
    BEFORE UPDATE ON responsaveis_tecnicos
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 8. Tabela: estabelecimento_responsaveis_tecnicos
    op.create_table(
        "estabelecimento_responsaveis_tecnicos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("responsavel_tecnico_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("responsaveis_tecnicos.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("eh_substituto", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("carga_horaria_semanal", sa.String(50), nullable=True),
        sa.Column("horario_permanencia", sa.Text(), nullable=True),
        sa.Column("numero_art_crt", sa.String(100), nullable=True),
        sa.Column("data_inicio", sa.Date(), nullable=False, server_default=sa.func.current_date()),
        sa.Column("data_fim", sa.Date(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("uq_estab_rt_titular_ativo", "estabelecimento_responsaveis_tecnicos", ["estabelecimento_id"], unique=True, postgresql_where=sa.text("eh_substituto = FALSE AND is_active = TRUE AND is_deleted = FALSE"))
    op.create_index("idx_estab_rt_estabelecimento", "estabelecimento_responsaveis_tecnicos", ["estabelecimento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estab_rt_profissional", "estabelecimento_responsaveis_tecnicos", ["responsavel_tecnico_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.execute("""
    CREATE TRIGGER trg_estabelecimento_responsaveis_tecnicos_atualizado_em
    BEFORE UPDATE ON estabelecimento_responsaveis_tecnicos
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 9. Tabela: estabelecimento_documentos
    op.create_table(
        "estabelecimento_documentos",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("tipo_documento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("tipos_documentos.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("eh_versao_atual", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("situacao", postgresql.ENUM("vigente", "vencido", "em_analise", "dispensado", "rejeitado", name="situacao_documento_estabelecimento", create_type=False), nullable=False, server_default="em_analise"),
        sa.Column("numero_identificacao", sa.String(100), nullable=True),
        sa.Column("orgao_empresa_emissora", sa.String(255), nullable=True),
        sa.Column("responsavel_tecnico_emissor", sa.String(255), nullable=True),
        sa.Column("registro_conselho_emissor", sa.String(100), nullable=True),
        sa.Column("data_emissao", sa.Date(), nullable=False),
        sa.Column("data_validade", sa.Date(), nullable=True),
        sa.Column("url_arquivo_anexo", sa.Text(), nullable=True),
        sa.Column("observacoes", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("validado_por", postgresql.UUID(as_uuid=True), sa.ForeignKey("usuarios.id", ondelete="SET NULL"), nullable=True),
        sa.Column("data_validacao", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("uq_estab_tipo_doc_vigente", "estabelecimento_documentos", ["estabelecimento_id", "tipo_documento_id"], unique=True, postgresql_where=sa.text("eh_versao_atual = TRUE AND is_deleted = FALSE"))
    op.create_index("idx_estab_docs_estabelecimento", "estabelecimento_documentos", ["estabelecimento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estab_docs_tipo", "estabelecimento_documentos", ["tipo_documento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index(
        "idx_estab_docs_alerta_vencimento",
        "estabelecimento_documentos",
        ["data_validade", "situacao"],
        postgresql_where=sa.text("eh_versao_atual = TRUE AND data_validade IS NOT NULL AND is_deleted = FALSE"),
    )
    op.execute("""
    CREATE TRIGGER trg_estabelecimento_documentos_atualizado_em
    BEFORE UPDATE ON estabelecimento_documentos
    FOR EACH ROW EXECUTE FUNCTION fn_atualizar_timestamp();
    """)

    # 10. Tabelas auxiliares de Funcionários e Fornecedores
    op.create_table(
        "estabelecimento_funcionarios",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nome_completo", sa.String(255), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=True),
        sa.Column("funcao_cargo", sa.String(100), nullable=True),
        sa.Column("eh_manipulador", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_estab_func_estabelecimento", "estabelecimento_funcionarios", ["estabelecimento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estab_func_ativo", "estabelecimento_funcionarios", ["estabelecimento_id", "is_active"], postgresql_where=sa.text("is_deleted = FALSE"))

    op.create_table(
        "estabelecimento_fornecedores",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("estabelecimento_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("estabelecimentos.id", ondelete="CASCADE"), nullable=False),
        sa.Column("razao_social", sa.String(255), nullable=False),
        sa.Column("nome_fantasia", sa.String(255), nullable=True),
        sa.Column("cnpj", sa.String(20), nullable=True),
        sa.Column("tipo_produto_fornecido", sa.String(150), nullable=True),
        sa.Column("municipio_uf", sa.String(100), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("criado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("atualizado_em", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index("idx_estab_fornec_estabelecimento", "estabelecimento_fornecedores", ["estabelecimento_id"], postgresql_where=sa.text("is_deleted = FALSE"))
    op.create_index("idx_estab_fornec_cnpj", "estabelecimento_fornecedores", ["cnpj"], postgresql_where=sa.text("is_deleted = FALSE"))

    # 11. Views Oficiais
    op.execute("""
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
    """)

    op.execute("""
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
    """)


def downgrade() -> None:
    op.execute("DROP VIEW IF EXISTS vw_documentos_proximos_vencimento;")
    op.execute("DROP VIEW IF EXISTS vw_estabelecimentos_risco_consolidado;")
    op.drop_table("estabelecimento_fornecedores")
    op.drop_table("estabelecimento_funcionarios")
    op.drop_table("estabelecimento_documentos")
    op.drop_table("estabelecimento_responsaveis_tecnicos")
    op.drop_table("responsaveis_tecnicos")
    op.drop_table("estabelecimento_cnaes")
    op.drop_table("estabelecimentos")
    op.drop_table("representantes_legais")
    op.drop_table("tipos_documentos")
    op.drop_table("cnaes")
    op.execute("DROP TYPE IF EXISTS situacao_documento_estabelecimento;")
    op.execute("DROP TYPE IF EXISTS parecer_projeto;")
    op.execute("DROP TYPE IF EXISTS situacao_alvara;")
    op.execute("DROP TYPE IF EXISTS situacao_cadastral;")
    op.execute("DROP TYPE IF EXISTS nivel_risco_sanitario;")
    op.execute("DROP TYPE IF EXISTS tipo_pessoa;")
    op.execute("DROP TYPE IF EXISTS status_alvara;")
    op.execute("DROP TYPE IF EXISTS categoria_documento;")
    op.execute("DROP TYPE IF EXISTS competencia_fiscalizacao;")
    op.execute("DROP TYPE IF EXISTS nivel_risco_cnae;")
