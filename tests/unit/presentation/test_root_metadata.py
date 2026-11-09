"""
Testes Unitários: Metadados da Aplicação e Healthcheck (Root & Health).
Sprint QA-08 - Fonte Única de Verdade (SSOT).
"""
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.constants import STATUS_HEALTHY, STATUS_OPERACIONAL
from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint_metadata():
    """Valida se GET / consome estritamente as variáveis centralizadas em settings."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/")

    assert response.status_code == 200
    data = response.json()

    assert data["sistema"] == settings.PROJECT_NAME
    assert data["versao"] == settings.APP_VERSION
    assert data["ambiente"] == settings.ENVIRONMENT
    assert data["status"] == STATUS_OPERACIONAL
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_check_endpoint():
    """Valida se GET /health retorna status operacional esperado."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        response = await client.get("/health")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] in (STATUS_HEALTHY, "degraded")
    assert "database" in data
    assert "timestamp" in data
