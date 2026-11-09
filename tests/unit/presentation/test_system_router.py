"""
Testes Unitários: Endpoint de Informações e Metadados do Sistema (GET /api/v1/system/info).
Sprint QA-08 - Fonte Única de Verdade (SSOT).
"""
import pytest
from unittest.mock import patch
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.constants import STATUS_OPERACIONAL
from app.main import app


@pytest.mark.asyncio
async def test_system_info_endpoint_sucesso():
    """Valida retorno 200 e integridade dos campos do endpoint /api/v1/system/info."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get(f"{settings.API_V1_STR}/system/info")

    assert response.status_code == 200
    data = response.json()

    assert data["sistema"] == settings.PROJECT_NAME
    assert data["versao"] == settings.APP_VERSION
    assert data["ambiente"] == settings.ENVIRONMENT
    assert data["municipio"] == settings.MUNICIPIO_PADRAO
    assert data["uf"] == settings.UF_PADRAO
    assert data["status"] == STATUS_OPERACIONAL
    assert isinstance(data["database_connected"], bool)
    assert "timestamp" in data


class _FakeFailingEngine:
    def connect(self):
        raise RuntimeError("Banco indisponível para simulação de falha")


@pytest.mark.asyncio
async def test_system_info_database_offline():
    """Valida comportamento resiliente com database_connected == False se houver falha de conexão."""
    with patch("app.presentation.routers.system_router.async_engine", _FakeFailingEngine()):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            response = await client.get(f"{settings.API_V1_STR}/system/info")

        assert response.status_code == 200
        data = response.json()
        assert data["database_connected"] is False
        assert data["status"] == STATUS_OPERACIONAL
        assert data["versao"] == settings.APP_VERSION
