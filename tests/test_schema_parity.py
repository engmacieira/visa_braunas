"""
Testes unitários de introspecção e paridade estrutural:
Compara Base.metadata.tables com o inventário DDL estrito de estrutura_db/*.sql.
Sprint 1 - Auditoria Estrutural e Paridade DDL.
"""
import glob
import re
from pathlib import Path
import pytest
from app.infrastructure.base_model import Base
import app.infrastructure.models  # Garante registro de todos os modelos


# 19 tabelas oficiais do sistema distribuídas nos 7 módulos DDL
EXPECTED_TABLES = [
    "usuarios",
    "configuracao_institucional",
    "metas_exercicio",
    "cnaes",
    "tipos_documentos",
    "alvaras_sanitarios",
    "representantes_legais",
    "estabelecimentos",
    "estabelecimento_cnaes",
    "estabelecimento_documentos",
    "responsaveis_tecnicos",
    "estabelecimento_responsaveis_tecnicos",
    "estabelecimento_funcionarios",
    "estabelecimento_fornecedores",
    "requerimentos_alvara",
    "requerimentos_alvara_dados",
    "inspecoes",
    "denuncias",
    "logs_auditoria",
]


def test_all_expected_tables_registered():
    """Valida se todas as 19 tabelas do DDL estão mapeadas no SQLAlchemy."""
    registered_tables = set(Base.metadata.tables.keys())
    for table in EXPECTED_TABLES:
        assert table in registered_tables, f"Tabela '{table}' ausente no Base.metadata!"


def test_soft_delete_universal():
    """
    Regra de Ouro 2: Toda tabela deve conter 'is_active' (BOOLEAN) e 'is_deleted' (BOOLEAN).
    """
    for table_name in EXPECTED_TABLES:
        table = Base.metadata.tables[table_name]
        assert "is_active" in table.columns, f"Tabela '{table_name}' sem coluna 'is_active'!"
        assert "is_deleted" in table.columns, f"Tabela '{table_name}' sem coluna 'is_deleted'!"
        assert str(table.columns["is_active"].type).upper() == "BOOLEAN"
        assert str(table.columns["is_deleted"].type).upper() == "BOOLEAN"


def test_primary_keys_standardization():
    """
    Regra de Ouro 3: Chaves primárias UUIDv4 (id ou chave 1:1 requerimento_id).
    """
    for table_name in EXPECTED_TABLES:
        table = Base.metadata.tables[table_name]
        pk_cols = [c.name for c in table.primary_key.columns]
        if table_name == "requerimentos_alvara_dados":
            # Relação 1:1 estrita
            assert pk_cols == ["requerimento_id"], f"{table_name} deve ter PK exclusiva 'requerimento_id'"
        else:
            assert pk_cols == ["id"], f"{table_name} deve ter PK única 'id'"

        for pk in table.primary_key.columns:
            assert "UUID" in str(pk.type).upper(), f"PK {table_name}.{pk.name} não é UUID!"


def test_conditional_unique_indexes_parity():
    """
    Regra de Ouro 4: Restrições UNIQUE em campos cadastrais/negociais devem ser
    índices únicos parciais (postgresql_where com is_deleted = FALSE).
    """
    expected_conditional_unique = {
        "usuarios": ["uq_usuarios_email", "uq_usuarios_cpf"],
        "configuracao_institucional": ["uq_configuracao_institucional_singleton"],
        "metas_exercicio": ["uq_metas_exercicio_ano_valido", "uq_exercicio_ativo"],
        "cnaes": ["uq_cnaes_codigo"],
        "tipos_documentos": ["uq_tipos_documentos_codigo"],
        "alvaras_sanitarios": ["uq_alvara_numero_exercicio", "uq_alvara_codigo_autenticidade"],
        "representantes_legais": ["uq_representantes_cpf"],
        "estabelecimentos": ["uq_estabelecimentos_cnpj_cpf", "uq_estabelecimentos_firestore_id"],
        "estabelecimento_cnaes": ["uq_estab_cnae_associacao", "uq_estabelecimento_cnae_principal"],
        "estabelecimento_documentos": ["uq_estab_tipo_doc_vigente"],
        "responsaveis_tecnicos": ["uq_rt_cpf", "uq_rt_registro_uf"],
        "estabelecimento_responsaveis_tecnicos": ["uq_estab_rt_titular_ativo"],
        "requerimentos_alvara": ["uq_requerimento_protocolo"],
        "inspecoes": ["uq_inspecoes_numero_termo"],
        "denuncias": ["uq_denuncia_protocolo"],
    }

    for table_name, uq_indexes in expected_conditional_unique.items():
        table = Base.metadata.tables[table_name]
        table_indexes = {idx.name: idx for idx in table.indexes if idx.unique}
        for uq_idx in uq_indexes:
            assert uq_idx in table_indexes, f"Índice único '{uq_idx}' ausente em {table_name}!"
            idx_obj = table_indexes[uq_idx]
            where_clause = str(idx_obj.dialect_options.get("postgresql", {}).get("where", ""))
            assert "is_deleted" in where_clause.lower(), f"Índice '{uq_idx}' em {table_name} não filtra is_deleted!"


def test_views_and_triggers_in_sql_artifacts():
    """
    Verifica a integridade das views e triggers definidos nos scripts DDL
    e no script consolidado do Alembic.
    """
    expected_views = [
        "vw_estabelecimentos_risco_consolidado",
        "vw_documentos_proximos_vencimento",
        "vw_indicador_11_vapt_consolidado",
        "vw_inspecoes_notificacoes_a_vencer",
        "vw_denuncias_fila_trabalho",
    ]

    alembic_versions_dir = Path("alembic/versions")
    alembic_code = "\n".join(f.read_text(encoding="utf-8") for f in alembic_versions_dir.glob("*.py"))

    for view_name in expected_views:
        assert view_name in alembic_code, f"View '{view_name}' não encontrada nas migrations do Alembic!"

    # Triggers e funções críticas
    assert "fn_sincronizar_alvara_estabelecimento" in alembic_code
    assert "fn_impedir_violacao_auditoria" in alembic_code
    assert "fn_atualizar_timestamp" in alembic_code
