"""
Testes de Integração: Resiliência contra Injeção de SQL (SQLi Resilience).
Sprint QA-05 - VigiMinas.
"""
from typing import Dict
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


@pytest.mark.asyncio
async def test_sqli_resilience_busca_estabelecimentos(
    async_client: AsyncClient,
    auth_headers_fiscal: Dict[str, str],
):
    """
    Submete vetores clássicos de SQL Injection na busca de estabelecimentos.
    O sistema deve tratar as entradas estritamente como literais de texto,
    retornando HTTP 200 com array vazio ou resultados correspondentes,
    sem disparar erro de sintaxe SQL (HTTP 500 ou quebra de banco).
    """
    payloads_sqli = [
        "' OR '1'='1",
        "'; DROP TABLE estabelecimentos; --",
        "' UNION SELECT NULL, NULL, NULL, NULL --",
        "1' OR 1=1 --",
        "admin' --",
        "') OR ('1'='1",
    ]

    for payload in payloads_sqli:
        resp = await async_client.get(
            "/api/v1/estabelecimentos",
            params={"busca": payload},
            headers=auth_headers_fiscal,
        )
        assert resp.status_code == 200, f"Falha para payload SQLi: {payload}. Resposta: {resp.status_code} - {resp.text}"
        data = resp.json()
        assert "itens" in data
        assert "total" in data


@pytest.mark.asyncio
async def test_sqli_resilience_busca_cnaes(
    async_client: AsyncClient,
    auth_headers_fiscal: Dict[str, str],
):
    """
    Submete vetores de SQL Injection na busca de CNAEs.
    """
    payloads_sqli = [
        "1091-1/01' OR 1=1 --",
        "' UNION ALL SELECT null, null, null, null --",
        "'; DELETE FROM cnaes; --",
    ]

    for payload in payloads_sqli:
        resp = await async_client.get(
            "/api/v1/cnaes",
            params={"busca": payload},
            headers=auth_headers_fiscal,
        )
        assert resp.status_code == 200, f"Falha no CNAE com payload: {payload}. Status: {resp.status_code}"
        assert isinstance(resp.json(), list)


@pytest.mark.asyncio
async def test_sqli_resilience_validacao_publica_alvara(
    async_client: AsyncClient,
):
    """
    Testa se injeções de SQL na rota pública de validação de autenticidade
    são tratadas estritamente e retornam HTTP 404 (código não encontrado),
    sem vazar mensagens de erro de driver SQL ou retornar HTTP 500.
    """
    payloads_sqli = [
        "' OR 1=1 --",
        "PUB-001' OR '1'='1",
        "'; SELECT * FROM usuarios; --",
    ]

    for payload in payloads_sqli:
        resp = await async_client.get(f"/api/v1/alvaras/validar/{payload}")
        assert resp.status_code == 404, f"Esperado 404 para alvará inexistente com SQLi, obteve: {resp.status_code}"
        data = resp.json()
        assert "não encontrado ou inválido" in data.get("detail", "").lower()
