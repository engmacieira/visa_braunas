"""
Testes de Integração de Rotas: Controle de Acesso Baseado em Papéis (RBAC)
Sprint QA-04 - VigiMinas.

Cobre:
- Tentativa de acesso à rota `POST /api/v1/usuarios` com perfil `digitador` (retorna HTTP 403 Forbidden).
- Criação bem-sucedida de novo servidor com perfil `admin_master` (retorna HTTP 201 Created).
"""

import pytest
import uuid
from httpx import AsyncClient


def _gerar_cpf_valido(base9: str) -> str:
    soma_1 = sum(int(base9[i]) * (10 - i) for i in range(9))
    resto_1 = (soma_1 * 10) % 11
    dv_1 = 0 if resto_1 == 10 else resto_1

    digits10 = base9 + str(dv_1)
    soma_2 = sum(int(digits10[i]) * (11 - i) for i in range(10))
    resto_2 = (soma_2 * 10) % 11
    dv_2 = 0 if resto_2 == 10 else resto_2
    return digits10 + str(dv_2)


@pytest.mark.asyncio
async def test_rbac_digitador_bloqueado_ao_criar_usuario(
    async_client: AsyncClient,
    auth_headers_digitador: dict,
):
    cpf_valido = _gerar_cpf_valido(f"8{uuid.uuid4().int % 100000000:08d}")
    payload = {
        "email": f"novo.servidor.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br",
        "senha": "SenhaForte123@",
        "perfil": "fiscal_tecnico",
        "nome_completo": "Novo Fiscal Sanitário",
        "cpf": cpf_valido,
        "cargo": "Fiscal Sanitário",
    }

    # Perfil digitador tentando cadastrar servidor -> 403 Forbidden
    response = await async_client.post(
        "/api/v1/usuarios",
        json=payload,
        headers=auth_headers_digitador,
    )
    assert response.status_code == 403
    assert "Acesso negado" in response.json()["detail"]


@pytest.mark.asyncio
async def test_rbac_admin_master_permite_criar_usuario(
    async_client: AsyncClient,
    auth_headers_admin: dict,
):
    cpf_valido = _gerar_cpf_valido(f"7{uuid.uuid4().int % 100000000:08d}")
    novo_email = f"novo.fiscal.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br"
    payload = {
        "email": novo_email,
        "senha": "SenhaForte123@",
        "perfil": "fiscal_tecnico",
        "nome_completo": "Fiscal Técnico Autorizado",
        "cpf": cpf_valido,
        "cargo": "Fiscal Sanitário Efetivo",
    }

    # Perfil admin_master criando servidor -> 201 Created
    response = await async_client.post(
        "/api/v1/usuarios",
        json=payload,
        headers=auth_headers_admin,
    )
    assert response.status_code == 201
    dados = response.json()
    assert dados["email"] == novo_email
    assert dados["nome_completo"] == "Fiscal Técnico Autorizado"
    assert dados["perfil"] == "fiscal_tecnico"
