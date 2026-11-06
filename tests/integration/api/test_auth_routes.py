"""
Testes de Integração de Rotas: Autenticação e Sessão (/auth)
Sprint QA-04 - VigiMinas.

Cobre:
- Login com credenciais válidas e retorno do token JWT.
- Falha com senha errada (HTTP 401).
- Consulta ao perfil cadastral na rota `/api/v1/auth/me` com autenticação.
- Bloqueio de acesso a rotas privadas sem token (HTTP 401).
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.infrastructure.models import UsuarioModel
import uuid


@pytest.mark.asyncio
async def test_auth_fluxo_login_sucesso_e_falha(
    async_client: AsyncClient,
    async_db_session: AsyncSession,
):
    # 1. Cria usuário de teste com hash bcrypt válido
    email_teste = f"servidor.login.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br"
    senha_plana = "SenhaForte123@"
    senha_hash = get_password_hash(senha_plana)

    usr = UsuarioModel(
        id=uuid.uuid4(),
        email=email_teste,
        senha_hash=senha_hash,
        perfil="fiscal_tecnico",
        nome_completo="Servidor de Login Teste",
        cpf=f"8{uuid.uuid4().int % 10000000000:010d}",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(usr)
    await async_db_session.flush()

    # 2. Tentativa com senha incorreta -> HTTP 401
    resp_falha = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email_teste, "senha": "SenhaErradaTotal123!"},
    )
    assert resp_falha.status_code == 401

    # 3. Login com senha correta -> HTTP 200 e Token JWT
    resp_ok = await async_client.post(
        "/api/v1/auth/login",
        json={"email": email_teste, "senha": senha_plana},
    )
    assert resp_ok.status_code == 200
    data = resp_ok.json()
    assert "access_token" in data
    assert data["token_type"].lower() == "bearer"
    token = data["access_token"]

    # 4. Acesso à rota protegida /me com o token emitido
    resp_me = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert resp_me.status_code == 200
    dados_me = resp_me.json()
    assert dados_me["email"] == email_teste
    assert dados_me["nome_completo"] == "Servidor de Login Teste"
    assert dados_me["perfil"] == "fiscal_tecnico"


@pytest.mark.asyncio
async def test_auth_me_bloqueia_sem_token_ou_token_invalido(
    async_client: AsyncClient,
):
    # Sem cabeçalho Authorization
    resp_sem = await async_client.get("/api/v1/auth/me")
    assert resp_sem.status_code == 401

    # Com token adulterado/inválido
    resp_inv = await async_client.get(
        "/api/v1/auth/me",
        headers={"Authorization": "Bearer token.completamente.adulterado"},
    )
    assert resp_inv.status_code == 401
