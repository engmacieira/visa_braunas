"""
Testes Unitários e de Integração: Cache Inteligente e Middleware de Latência
Sprint QA-06 - VigiMinas (Braúnas/MG).

Cobre:
1. Injeção do header X-Response-Time em requisições HTTP normais.
2. Simulação de request lenta (>= 1.0s) e conferência de disparo de log JSON WARNING.
3. Teste de integração de cache: chamadas subsequentes ao endpoint /api/v1/cnaes retornam
   payload idêntico a partir do cache sem acionar a camada de persistência.
"""

import asyncio
import json
import logging
from typing import Dict
from unittest.mock import AsyncMock, patch

import httpx
from httpx import ASGITransport
import pytest
from fastapi import FastAPI
from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend

from app.core.cache import init_cache, clear_cache_all
from app.core.latency_middleware import LatencyMonitoringMiddleware
from app.domain.estabelecimentos.entities import CNAE, NivelRiscoCNAE, CompetenciaFiscalizacao
from app.presentation.dependencies import get_cnae_repository, get_current_active_user


@pytest.mark.asyncio
async def test_latency_middleware_injects_x_response_time_header():
    """Valida se o LatencyMonitoringMiddleware calcula e injeta o header X-Response-Time formatado."""
    dummy_app = FastAPI()
    dummy_app.add_middleware(LatencyMonitoringMiddleware)

    @dummy_app.get("/ping")
    async def ping():
        return {"pong": True}

    async with httpx.AsyncClient(transport=ASGITransport(app=dummy_app), base_url="http://test") as client:
        resp = await client.get("/ping")

    assert resp.status_code == 200
    assert "x-response-time" in resp.headers
    val = resp.headers["x-response-time"]
    assert val.endswith("ms")
    # Confere formatação com ponto decimal e número positivo
    num_str = val[:-2]
    latency_float = float(num_str)
    assert latency_float >= 0.0


@pytest.mark.asyncio
async def test_latency_middleware_slow_request_logs_warning_json(caplog):
    """Valida se uma requisição com tempo >= 1.0s emite log estruturado JSON em nível WARNING."""
    dummy_app = FastAPI()
    dummy_app.add_middleware(LatencyMonitoringMiddleware)

    @dummy_app.get("/lenta")
    async def rota_lenta():
        await asyncio.sleep(1.05)
        return {"ok": True}

    with caplog.at_level(logging.WARNING, logger="vigiminas.latency"):
        async with httpx.AsyncClient(transport=ASGITransport(app=dummy_app), base_url="http://test") as client:
            resp = await client.get(
                "/lenta?origem=teste&page=1",
                headers={"X-Forwarded-For": "192.168.1.100"},
            )

    assert resp.status_code == 200
    assert "x-response-time" in resp.headers

    # Localiza o log de aviso JSON emitido pelo middleware
    json_logs = []
    for record in caplog.records:
        if record.name == "vigiminas.latency" and record.levelno == logging.WARNING:
            try:
                parsed = json.loads(record.message)
                json_logs.append(parsed)
            except Exception:
                pass

    assert len(json_logs) >= 1, "Log estruturado JSON de latência não foi emitido!"
    slow_log = json_logs[0]
    assert slow_log["alerta"] == "LATENCIA_ELEVADA"
    assert slow_log["method"] == "GET"
    assert slow_log["path"] == "/lenta"
    assert slow_log["status_code"] == 200
    assert slow_log["latency_ms"] >= 1000.0
    assert slow_log["client_ip"] == "192.168.1.100"
    assert slow_log["query_params"] == {"origem": "teste", "page": "1"}


@pytest.mark.asyncio
async def test_cache_integration_cnaes_subsequent_calls_hit_cache(
    async_client: httpx.AsyncClient,
    auth_headers_fiscal: Dict[str, str],
):
    """
    Teste de integração do cache inteligente:
    Assegura que após a 1ª consulta a /api/v1/cnaes, chamadas subsequentes com os mesmos parâmetros
    são servidas pelo cache sem consultar o repositório novamente.
    """
    await init_cache()
    await clear_cache_all()

    # Cria mock do repositório de CNAEs para contabilizar as chamadas
    import uuid
    mock_repo = AsyncMock()
    fake_cnae = CNAE(
        id=uuid.uuid4(),
        codigo="0111-3/01",
        descricao="Cultivo de arroz",
        grau_risco_padrao=NivelRiscoCNAE.RISCO_I,
        competencia_padrao=CompetenciaFiscalizacao.MUNICIPAL,
        exige_rt=False,
        exige_projeto_arquitetonico=False,
    )
    mock_repo.list_cnaes.return_value = [fake_cnae]

    from app.main import app

    app.dependency_overrides[get_cnae_repository] = lambda: mock_repo

    try:
        # 1ª Requisição - Popula o cache
        resp1 = await async_client.get(
            "/api/v1/cnaes?busca=arroz&skip=0&limit=50",
            headers=auth_headers_fiscal,
        )
        assert resp1.status_code == 200
        data1 = resp1.json()
        assert len(data1) == 1
        assert data1[0]["codigo"] == "0111-3/01"
        assert mock_repo.list_cnaes.call_count == 1

        # 2ª Requisição - Deve ser servida pelo cache sem invocar list_cnaes do repositório
        resp2 = await async_client.get(
            "/api/v1/cnaes?busca=arroz&skip=0&limit=50",
            headers=auth_headers_fiscal,
        )
        assert resp2.status_code == 200
        data2 = resp2.json()
        assert data2 == data1
        # O repositório não deve ter sido invocado uma segunda vez
        assert mock_repo.list_cnaes.call_count == 1, "Cache falhou: repositório foi invocado na segunda requisição!"

    finally:
        app.dependency_overrides.pop(get_cnae_repository, None)
        await clear_cache_all()
