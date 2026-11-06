"""
Testes de Integração de Rotas: Indicadores Regulatórios e Dashboard de Metas
Sprint QA-04 - VigiMinas.

Cobre:
- Consulta ao endpoint `GET /api/v1/indicadores/dashboard` autenticado.
- Confirmação do payload consolidado das metas sem ocorrência de erros SQL.
- Acesso sem token deve retornar 401 Unauthorized.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_indicadores_dashboard_retorna_payload_consolidado(
    async_client: AsyncClient,
    setup_institucional_exercicio_2026: dict,
    auth_headers_fiscal: dict,
):
    # Consulta autenticada ao dashboard do exercício 2026
    response = await async_client.get(
        "/api/v1/indicadores/dashboard?ano=2026",
        headers=auth_headers_fiscal,
    )
    assert response.status_code == 200

    dados = response.json()
    assert dados["ano_exercicio"] == 2026
    assert "indicador_11_vapt" in dados
    assert "indicador_12_risco_3" in dados
    assert "indicador_13_risco_2" in dados
    assert "indicador_14_risco_1" in dados
    assert "indicador_15_sintetico" in dados
    assert "total_estabelecimentos_cadastrados" in dados
    assert "total_alvaras_ativos" in dados


@pytest.mark.asyncio
async def test_indicadores_dashboard_sem_autenticacao_retorna_401(
    async_client: AsyncClient,
):
    response = await async_client.get("/api/v1/indicadores/dashboard?ano=2026")
    assert response.status_code == 401
