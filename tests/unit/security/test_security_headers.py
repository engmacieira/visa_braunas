"""
Testes Unitários: Cabeçalhos de Segurança HTTP e Proteção HTTPS / HSTS.
Sprint QA-05 - VigiMinas.
"""
import pytest
from httpx import ASGITransport, AsyncClient
from unittest.mock import patch

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_security_headers_presentes_em_rota_publica():
    """
    Verifica se todos os cabeçalhos de segurança defensivos (OWASP) estão
    presentes na resposta de rotas públicas e de healthcheck.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        # Testa na rota raiz de metadados
        resp_root = await client.get("/")
        assert resp_root.status_code == 200
        headers_root = resp_root.headers
        assert headers_root.get("X-Content-Type-Options") == "nosniff"
        assert headers_root.get("X-Frame-Options") == "DENY"
        assert headers_root.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert headers_root.get("Permissions-Policy") == "geolocation=(), camera=(), microphone=()"
        assert "default-src 'self'" in headers_root.get("Content-Security-Policy", "")
        assert "frame-ancestors 'none'" in headers_root.get("Content-Security-Policy", "")

        # Em ambiente de desenvolvimento/teste, Strict-Transport-Security NÃO deve estar presente
        assert "Strict-Transport-Security" not in headers_root

        # Testa na rota de healthcheck
        resp_health = await client.get("/health")
        assert resp_health.status_code == 200
        headers_health = resp_health.headers
        assert headers_health.get("X-Content-Type-Options") == "nosniff"
        assert headers_health.get("X-Frame-Options") == "DENY"
        assert headers_health.get("Referrer-Policy") == "strict-origin-when-cross-origin"
        assert headers_health.get("Permissions-Policy") == "geolocation=(), camera=(), microphone=()"
        assert "default-src 'self'" in headers_health.get("Content-Security-Policy", "")


@pytest.mark.asyncio
async def test_hsts_e_redirecionamento_https_em_producao():
    """
    Garante que em ambiente de produção (ENVIRONMENT == 'production'):
    1. Requisições HTTP sofrem redirecionamento (307) para HTTPS.
    2. O cabeçalho Strict-Transport-Security é injetado com parâmetros adequados.
    """
    transport = ASGITransport(app=app)

    with patch.object(settings, "ENVIRONMENT", "production"):
        assert settings.is_production is True

        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # 1. Requisição HTTP pura deve ser redirecionada para HTTPS
            resp_redirect = await client.get("/", follow_redirects=False)
            assert resp_redirect.status_code == 307
            assert resp_redirect.headers.get("location", "").startswith("https://")

        async with AsyncClient(transport=transport, base_url="https://testserver") as client_https:
            # 2. Requisição HTTPS já protegida deve conter HSTS e cabeçalhos defensivos
            resp_https = await client_https.get("/", headers={"x-forwarded-proto": "https"})
            assert resp_https.status_code == 200
            assert resp_https.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains; preload"
            assert resp_https.headers.get("X-Content-Type-Options") == "nosniff"
            assert resp_https.headers.get("X-Frame-Options") == "DENY"
