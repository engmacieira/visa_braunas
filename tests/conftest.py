"""
Configuração global do Pytest e fixtures compartilhadas.
Sprint QA-04 - VigiMinas (Braúnas/MG).

Isolamento transacional assíncrono com PostgreSQL, client HTTPX ASGITransport,
fixtures de tokens JWT por perfil e carga mínima de contexto institucional/exercício.
"""

from typing import AsyncGenerator, Dict
import pytest
import pytest_asyncio
import httpx
from httpx import ASGITransport
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool

from app.core.config import settings
from app.core.security import create_access_token
from app.infrastructure.database import get_db_session
from app.infrastructure.models import (
    ConfiguracaoInstitucionalModel,
    MetasExercicioModel,
    UsuarioModel,
)
from app.infrastructure.seeds import run_seeds
from app.main import app

from tests.fixtures.seed_fixtures import (  # noqa: F401
    async_test_engine,
    seed_counters,
)


@pytest_asyncio.fixture(scope="function")
async def async_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Fixture assíncrona de sessão PostgreSQL envolvida em transação com ROLLBACK automático.
    Utiliza NullPool no create_async_engine para assegurar total independência de event loops
    e fechamento estrito sem vazamento de conexões entre testes assíncronos.
    """
    engine = create_async_engine(
        settings.DATABASE_URL,
        poolclass=NullPool,
        future=True,
    )
    connection = await engine.connect()
    transaction = await connection.begin()

    session_factory = async_sessionmaker(
        bind=connection,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )

    async with session_factory() as session:
        yield session

    if transaction.is_active:
        await transaction.rollback()
    await connection.close()
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def async_client(
    async_db_session: AsyncSession,
) -> AsyncGenerator[httpx.AsyncClient, None]:
    """
    Cliente HTTP assíncrono baseado em httpx.AsyncClient com ASGITransport apontando para o app FastAPI.
    Sobrescreve a dependência get_db_session para utilizar a mesma sessão transacional com rollback.
    """
    async def _override_get_db_session() -> AsyncGenerator[AsyncSession, None]:
        yield async_db_session

    app.dependency_overrides[get_db_session] = _override_get_db_session

    transport = ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://testserver") as client:
        yield client

    app.dependency_overrides.pop(get_db_session, None)


@pytest_asyncio.fixture(scope="function")
async def seeded_db_session(
    async_db_session: AsyncSession,
) -> AsyncGenerator[AsyncSession, None]:
    """
    Sessão assíncrona pré-populada com o seed completo do município de Braúnas/MG.
    Garante integridade referencial para testes de repositórios, views e triggers.
    """
    await run_seeds(async_db_session)
    await async_db_session.flush()
    yield async_db_session


@pytest_asyncio.fixture(scope="function")
async def setup_institucional_exercicio_2026(
    async_db_session: AsyncSession,
) -> Dict[str, object]:
    """
    Fixture de carga mínima para inserção rápida de configuração institucional e exercício 2026,
    sem necessitar de todo o seed de estabelecimentos.
    """
    res_cfg = await async_db_session.execute(
        select(ConfiguracaoInstitucionalModel).where(
            ConfiguracaoInstitucionalModel.singleton_key == 1,
            ConfiguracaoInstitucionalModel.is_deleted.is_(False),
        )
    )
    cfg = res_cfg.scalars().first()
    if not cfg:
        cfg = ConfiguracaoInstitucionalModel(
            singleton_key=1,
            municipio="Braúnas",
            uf="MG",
            nome_prefeitura="Prefeitura Municipal de Braúnas",
            nome_secretaria="Secretaria Municipal de Saúde",
            orgao_vigilancia="Coordenação de Vigilância em Saúde e Vigilância Sanitária",
            cnpj_institucional="18.303.187/0001-44",
            logradouro="Avenida Juscelino Kubitschek",
            numero="100",
            bairro="Centro",
            cep="35.189-000",
            telefone_oficial="(33) 3294-1100",
            email_oficial="visa@braunas.mg.gov.br",
            is_active=True,
            is_deleted=False,
        )
        async_db_session.add(cfg)

    res_meta = await async_db_session.execute(
        select(MetasExercicioModel).where(
            MetasExercicioModel.ano_exercicio == 2026,
            MetasExercicioModel.is_deleted.is_(False),
        )
    )
    meta = res_meta.scalars().first()
    if not meta:
        meta = MetasExercicioModel(
            ano_exercicio=2026,
            meta_inspecoes_vapt=20,
            meta_cobertura_risco_1=100.0,
            meta_cobertura_risco_2=100.0,
            meta_cobertura_risco_3=100.0,
            meta_atendimento_denuncias_dias=15,
            is_active=True,
            is_deleted=False,
        )
        async_db_session.add(meta)

    await async_db_session.flush()
    return {"config": cfg, "meta": meta}


async def _obter_ou_criar_usuario(session: AsyncSession, perfil_str: str, email: str, nome: str, cpf: str) -> UsuarioModel:
    res = await session.execute(
        select(UsuarioModel).where(UsuarioModel.email == email, UsuarioModel.is_deleted.is_(False))
    )
    usr = res.scalars().first()
    if not usr:
        usr = UsuarioModel(
            email=email,
            senha_hash="$2b$12$dummyhashforpytestauthtokens00000000000000000000000000",
            perfil=perfil_str,
            nome_completo=nome,
            cpf=cpf,
            cargo="Servidor Municipal",
            is_active=True,
            is_deleted=False,
        )
        session.add(usr)
        await session.flush()
    return usr


@pytest_asyncio.fixture(scope="function")
async def auth_headers_admin(async_db_session: AsyncSession) -> Dict[str, str]:
    """Cabeçalhos HTTP com Bearer token para usuário com perfil admin_master."""
    usr = await _obter_ou_criar_usuario(
        async_db_session,
        "admin_master",
        "admin.teste@braunas.mg.gov.br",
        "Administrador Teste",
        "11144477735",
    )
    token = create_access_token({"sub": str(usr.id), "perfil": "admin_master", "email": usr.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_headers_coordenador(async_db_session: AsyncSession) -> Dict[str, str]:
    """Cabeçalhos HTTP com Bearer token para usuário com perfil coordenador."""
    usr = await _obter_ou_criar_usuario(
        async_db_session,
        "coordenador",
        "coord.teste@braunas.mg.gov.br",
        "Coordenador Teste",
        "22255588846",
    )
    token = create_access_token({"sub": str(usr.id), "perfil": "coordenador", "email": usr.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_headers_fiscal(async_db_session: AsyncSession) -> Dict[str, str]:
    """Cabeçalhos HTTP com Bearer token para usuário com perfil fiscal_tecnico."""
    usr = await _obter_ou_criar_usuario(
        async_db_session,
        "fiscal_tecnico",
        "fiscal.teste@braunas.mg.gov.br",
        "Fiscal Teste",
        "33366699957",
    )
    token = create_access_token({"sub": str(usr.id), "perfil": "fiscal_tecnico", "email": usr.email})
    return {"Authorization": f"Bearer {token}"}


@pytest_asyncio.fixture(scope="function")
async def auth_headers_digitador(async_db_session: AsyncSession) -> Dict[str, str]:
    """Cabeçalhos HTTP com Bearer token para usuário com perfil digitador."""
    usr = await _obter_ou_criar_usuario(
        async_db_session,
        "digitador",
        "digitador.teste@braunas.mg.gov.br",
        "Digitador Teste",
        "44477700068",
    )
    token = create_access_token({"sub": str(usr.id), "perfil": "digitador", "email": usr.email})
    return {"Authorization": f"Bearer {token}"}
