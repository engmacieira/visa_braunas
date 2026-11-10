"""
Configuração global do Pytest e fixtures compartilhadas.
Sprint QA-04 - VigiMinas (Braúnas/MG).

Isolamento estrito com Docker Compose (PostgreSQL 16), execução automática de migrations
Alembic, bloqueio contra banco de produção, cliente HTTPX ASGITransport,
fixtures de tokens JWT por perfil e carga de contexto institucional/exercício.
"""

import os
import subprocess
import sys
import time
from pathlib import Path
from typing import AsyncGenerator, Dict

from dotenv import load_dotenv
import psycopg2
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

# ==============================================================================
# 1. CARREGAMENTO ESTRITO DO AMBIENTE DE TESTES (.env.test)
# ==============================================================================
ROOT_DIR = Path(__file__).resolve().parent.parent

test_env_path = ROOT_DIR / ".env.test"
if test_env_path.exists():
    load_dotenv(dotenv_path=test_env_path, override=True)

# Defaults seguros garantindo porta 5436 e ambiente de teste isolado
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db",
)
os.environ.setdefault(
    "DATABASE_URL_SYNC",
    "postgresql+psycopg2://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db",
)

# Sincroniza e força configurações do singleton Settings
from app.core.config import settings

settings.DATABASE_URL = os.environ["DATABASE_URL"]
settings.DATABASE_URL_SYNC = os.environ["DATABASE_URL_SYNC"]
settings.ENVIRONMENT = os.environ.get("ENVIRONMENT", "test")

from app.core.security import create_access_token
from app.infrastructure.database import get_db_session
from app.infrastructure.models import (
    ConfiguracaoInstitucionalModel,
    MetasExercicioModel,
    UsuarioModel,
)
from app.core.cache import init_cache
from app.infrastructure.seeds import run_seeds
from app.main import app

from tests.fixtures.seed_fixtures import (  # noqa: F401
    async_test_engine,
    seed_counters,
)


# ==============================================================================
# 2. GUARDA DE SEGURANÇA CONTRA PRODUÇÃO (PRODUCTION SAFETY GUARD)
# ==============================================================================
def pytest_configure(config):
    """
    Guarda de segurança em tempo de execução:
    Bloqueia categoricamente a execução da suíte de testes caso a URL do banco
    aponte para servidores externos, nuvem (Supabase, AWS, etc.) ou produção.
    """
    db_url = os.environ.get("DATABASE_URL", "").lower()
    db_sync = os.environ.get("DATABASE_URL_SYNC", "").lower()
    env = os.environ.get("ENVIRONMENT", "").lower()

    dangerous_indicators = ["supabase", "aws", "rds", "pooler", "production"]
    for indicator in dangerous_indicators:
        if indicator in db_url or indicator in db_sync or env in ("production", "prod"):
            raise RuntimeError(
                f"\n{'='*75}\n"
                f"[BLOQUEIO DE SEGURANÇA CRÍTICO - TESTES ISOLADOS]\n"
                f"A execução dos testes foi CANCELADA para proteger a integridade dos dados!\n"
                f"Detectada referência ao ambiente '{indicator.upper()}' na conexão:\n"
                f"  DATABASE_URL: {os.environ.get('DATABASE_URL')}\n"
                f"  ENVIRONMENT:  {env}\n"
                f"Os testes devem rodar exclusivamente no container Docker local (porta 5436).\n"
                f"{'='*75}\n"
            )


# ==============================================================================
# 3. ORQUESTRAÇÃO AUTOMÁTICA DO DOCKER POSTGRESQL E MIGRATIONS ALEMBIC
# ==============================================================================
def _is_postgres_ready(dsn: str) -> bool:
    """Tenta estabelecer uma conexão SQL real para validar que o Postgres concluiu o startup."""
    try:
        conn = psycopg2.connect(dsn, connect_timeout=1)
        conn.close()
        return True
    except Exception:
        return False


def _ensure_docker_postgres_running():
    """
    Garante que o container Docker 'vigiminas_db_test' esteja em execução e pronto para queries.
    Caso não esteja respondendo, sobe o serviço via Docker Compose e aguarda a autenticação.
    """
    sync_dsn = os.environ["DATABASE_URL_SYNC"].replace("postgresql+psycopg2://", "postgresql://")

    if not _is_postgres_ready(sync_dsn):
        compose_file = ROOT_DIR / "docker-compose.test.yml"
        print(f"\n[VigiMinas Test] Subindo banco de testes no Docker ({compose_file.name})...")
        cmd = ["docker", "compose", "-f", str(compose_file), "up", "-d", "test_db"]
        try:
            subprocess.run(cmd, cwd=str(ROOT_DIR), capture_output=True, text=True, check=True)
        except FileNotFoundError:
            raise RuntimeError(
                "O comando 'docker' não foi encontrado no PATH. Certifique-se de que o Docker Desktop está instalado."
            )
        except subprocess.CalledProcessError as e:
            raise RuntimeError(
                f"Falha ao iniciar o container Docker de testes: {e.stderr or e.stdout}\n"
                "Verifique se o Docker Desktop está aberto e em execução."
            )

        # Polling real com psycopg2 até o Postgres aceitar conexões com sucesso
        max_wait_seconds = 30
        start_time = time.time()
        while time.time() - start_time < max_wait_seconds:
            if _is_postgres_ready(sync_dsn):
                break
            time.sleep(1)
        else:
            raise TimeoutError(
                f"O container PostgreSQL de testes na porta 5436 não aceitou conexões após {max_wait_seconds}s."
            )


def _apply_alembic_migrations():
    """Aplica todas as migrações do Alembic (upgrade head) no banco isolado de teste."""
    from alembic import command
    from alembic.config import Config

    alembic_ini = ROOT_DIR / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    alembic_cfg.set_main_option("sqlalchemy.url", os.environ["DATABASE_URL_SYNC"])
    command.upgrade(alembic_cfg, "head")


@pytest.fixture(scope="session", autouse=True)
def session_test_database_orchestration():
    """
    Fixture Pytest com escopo de sessão e autouse=True:
    1. Garante container Docker de teste ativo;
    2. Executa as migrations do Alembic no banco isolado;
    3. Permite execução imediata e segura de qualquer teste.
    """
    _ensure_docker_postgres_running()
    _apply_alembic_migrations()
    yield


# ==============================================================================
# 4. FIXTURES DE SESSÃO TRANSACIONAL E CLIENTE HTTP
# ==============================================================================
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

    # Garante inicialização do FastAPICache durante os testes com ASGITransport
    await init_cache()

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
