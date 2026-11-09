"""
Router FastAPI: Metadados Operacionais, Telemetria e Informações do Sistema.
Sprint QA-08 - Fonte Única de Verdade (SSOT).
"""
from datetime import datetime, timezone
from pydantic import BaseModel, ConfigDict
from fastapi import APIRouter, status
from sqlalchemy import text

from app.core.config import settings
from app.core.constants import STATUS_OPERACIONAL
from app.infrastructure.database import async_engine

router = APIRouter(prefix="/system", tags=["Metadados e Telemetria do Sistema"])


class SystemInfoResponseDTO(BaseModel):
    """Contrato tipado de metadados dinâmicos para consumo do frontend e monitoramento."""
    sistema: str
    versao: str
    ambiente: str
    municipio: str
    uf: str
    status: str
    database_connected: bool
    timestamp: datetime

    model_config = ConfigDict(extra="ignore")


@router.get(
    "/info",
    response_model=SystemInfoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Metadados Operacionais e Versão Ativa do Sistema",
    description="Retorna metadados em tempo de execução da API, ambiente, município e conectividade com serviços essenciais.",
)
async def get_system_info() -> SystemInfoResponseDTO:
    database_connected = False
    try:
        async with async_engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
            database_connected = True
    except Exception:
        database_connected = False

    return SystemInfoResponseDTO(
        sistema=settings.PROJECT_NAME,
        versao=settings.APP_VERSION,
        ambiente=settings.ENVIRONMENT,
        municipio=settings.MUNICIPIO_PADRAO,
        uf=settings.UF_PADRAO,
        status=STATUS_OPERACIONAL,
        database_connected=database_connected,
        timestamp=datetime.now(timezone.utc),
    )
