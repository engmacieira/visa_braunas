from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict

from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import _rate_limit_exceeded_custom_handler, limiter
from app.core.security_middleware import SecurityHeadersMiddleware
from app.infrastructure.database import async_engine
from app.presentation.routers.auth_router import router as auth_router
from app.presentation.routers.cnaes_router import router as cnaes_router
from app.presentation.routers.estabelecimentos_router import (
    router as estabelecimentos_router,
)
from app.presentation.routers.indicadores_router import router as indicadores_router
from app.presentation.routers.inspecoes_router import router as inspecoes_router
from app.presentation.routers.licenciamento_router import router as licenciamento_router
from app.presentation.routers.ouvidoria_router import router as ouvidoria_router
from app.presentation.routers.usuarios_router import router as usuarios_router


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """
    Gerencia o ciclo de vida da aplicação FastAPI.
    Garante o encerramento seguro e liberação do pool de conexões assíncronas do banco.
    """
    # Startup: Opcional aquecimento de conexões ou logs
    yield
    # Shutdown: Descarte e fechamento limpo das conexões ativas
    await async_engine.dispose()


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend oficial do Sistema VigiMinas - Vigilância Sanitária Municipal (DDD, FastAPI, SQLAlchemy 2.0)",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs" if not settings.is_production else None,
    redoc_url="/redoc" if not settings.is_production else None,
)

# Configuração do Rate Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_custom_handler)

# Middleware de Cabeçalhos Defensivos e HTTPS/HSTS
app.add_middleware(SecurityHeadersMiddleware)

# Configuração do Middleware de CORS
if settings.BACKEND_CORS_ORIGINS:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.BACKEND_CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Registro de Rotas da API v1
app.include_router(auth_router, prefix="/api/v1")
app.include_router(usuarios_router, prefix="/api/v1")
app.include_router(estabelecimentos_router, prefix="/api/v1")
app.include_router(cnaes_router, prefix="/api/v1")
app.include_router(inspecoes_router, prefix="/api/v1")
app.include_router(licenciamento_router, prefix="/api/v1")
app.include_router(ouvidoria_router, prefix="/api/v1")
app.include_router(indicadores_router, prefix="/api/v1")


@app.get(
    "/",
    tags=["Metadados"],
    summary="Metadados do Sistema",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def root() -> Dict[str, Any]:
    """
    Retorna os metadados do sistema VigiMinas e informações do ambiente.
    """
    return {
        "sistema": settings.PROJECT_NAME,
        "versao": "1.0.0",
        "ambiente": settings.ENVIRONMENT,
        "status": "operacional",
        "documentacao": "/docs" if not settings.is_production else "desabilitada em producao",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@app.get(
    "/health",
    tags=["Monitoramento"],
    summary="Healthcheck da Aplicação e Conectividade",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
)
async def health_check() -> Dict[str, Any]:
    """
    Verifica a saúde operacional da aplicação e a conectividade com o PostgreSQL.
    """
    db_status = "offline"
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            db_status = "online"
    except Exception as exc:
        db_status = f"indisponivel ({exc.__class__.__name__})"

    return {
        "status": "healthy" if db_status == "online" else "degraded",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
