"""
Fixtures assíncronas do Pytest para carga de seeds e testes de integração.
Sprint QA-03 - VigiMinas (Braúnas/MG).

Fornece sessões de banco de dados isoladas e pré-alimentadas com os dados regulatórios reais,
permitindo reutilização nos testes unitários e de ponta a ponta (QA-04 / QA-06).
"""

from typing import AsyncGenerator
import pytest
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.infrastructure.base_model import Base
import app.infrastructure.models  # Garante registro de todas as tabelas
from app.infrastructure.seeds import SeedCounters, run_seeds


def _prepare_metadata_for_sqlite() -> None:
    """
    Remove defaults que contenham sintaxe específica do PostgreSQL (ex: ::jsonb)
    para viabilizar testes unitários e de integração em memória com SQLite.
    """
    for table in Base.metadata.tables.values():
        for col in table.columns:
            if str(col.type) == "JSONB" and col.server_default is not None:
                col.server_default = None


@pytest.fixture(scope="function")
async def async_test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Cria uma engine assíncrona isolada em memória para cada função de teste."""
    _prepare_metadata_for_sqlite()
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        echo=False,
        future=True,
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture(scope="function")
async def async_db_session(
    async_test_engine: AsyncEngine,
) -> AsyncGenerator[AsyncSession, None]:
    """Gera uma AsyncSession isolada vazia sobre o banco de teste."""
    session_factory = async_sessionmaker(
        bind=async_test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )
    async with session_factory() as session:
        yield session
        await session.rollback()


@pytest.fixture(scope="function")
async def seeded_db_session(
    async_db_session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Fornece uma AsyncSession com o banco de dados já populado com o seed
    oficial de Braúnas/MG (62 registros padrão), pronto para testes da QA-04.
    """
    await run_seeds(async_db_session)
    await async_db_session.commit()
    yield async_db_session


@pytest.fixture(scope="function")
async def seed_counters(
    async_db_session: AsyncSession,
) -> SeedCounters:
    """Executa o seed e retorna o relatório com os contadores de inserção."""
    counters = await run_seeds(async_db_session)
    await async_db_session.commit()
    return counters
