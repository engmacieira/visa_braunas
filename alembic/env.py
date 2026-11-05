import sys
from pathlib import Path
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# Adiciona o diretório raiz ao PYTHONPATH para resolução dos módulos de app
BASE_DIR = Path(__file__).resolve().parent.parent
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.infrastructure.base_model import Base
import app.infrastructure.models  # noqa: F401 - Registra todas as tabelas na Base.metadata

# Configuração de logging do Alembic
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Vinculação dos metadados declarativos para autogenerate
target_metadata = Base.metadata

# Força a URL de conexão do Alembic a utilizar a URL síncrona (psycopg2) configurada nas Settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)


def run_migrations_offline() -> None:
    """
    Executa migrações no modo 'offline'.
    Configura o contexto apenas com uma URL sem criar Engine física.
    """
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """
    Executa migrações no modo 'online'.
    Cria a conexão síncrona com psycopg2 e associa ao contexto de migração.
    Configurado com compare_type=True para auditoria de enums e tipos estritos,
    além de manter fidelidade aos índices parciais (WHERE is_deleted = FALSE).
    """
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
            include_schemas=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
