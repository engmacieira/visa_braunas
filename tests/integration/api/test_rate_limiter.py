"""
Testes de Integração: Proteção de Borda e Rate Limiting com SlowAPI.
Sprint QA-05 - VigiMinas.
"""
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.limiter import limiter
from app.core.security import get_password_hash
from app.infrastructure.models.auth_models import UsuarioModel


@pytest.mark.asyncio
async def test_rate_limiter_login_bloqueia_na_sexta_requisicao(
    async_client: AsyncClient,
    async_db_session: AsyncSession,
):
    """
    Testa se o limitador de 5 requisições por minuto na rota de login:
    - Permite as primeiras 5 chamadas.
    - Bloqueia a 6ª chamada com status HTTP 429 Too Many Requests e cabeçalho Retry-After.
    Utiliza IP fixo simulado no cabeçalho X-Forwarded-For para isolamento total.
    """
    limiter.reset()

    # Cria usuário no banco para responder às requisições
    email_teste = f"servidor.ratelimit.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br"
    senha = "SenhaSegura123@"
    usr = UsuarioModel(
        id=uuid.uuid4(),
        email=email_teste,
        senha_hash=get_password_hash(senha),
        perfil="fiscal_tecnico",
        nome_completo="Servidor Rate Limit Teste",
        cpf=f"7{uuid.uuid4().int % 10000000000:010d}",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(usr)
    await async_db_session.flush()

    ip_simulado = f"192.168.100.{uuid.uuid4().int % 250 + 1}"
    headers = {"X-Forwarded-For": ip_simulado}

    payload = {"email": email_teste, "senha": "SenhaErradaTentativa"}

    # Dispara 5 requisições consecutivas (devem passar e retornar 401 por credencial errada, e não 429)
    for i in range(5):
        resp = await async_client.post("/api/v1/auth/login", json=payload, headers=headers)
        assert resp.status_code == 401, f"Requisição {i+1} deveria retornar 401 mas retornou {resp.status_code}"

    # A 6ª requisição deve ser sumariamente bloqueada pelo SlowAPI (HTTP 429)
    resp_bloqueada = await async_client.post("/api/v1/auth/login", json=payload, headers=headers)
    assert resp_bloqueada.status_code == 429, f"A 6ª requisição deveria retornar 429 mas retornou {resp_bloqueada.status_code}"

    # Verifica o payload explicativo retornado pelo handler customizado
    corpo = resp_bloqueada.json()
    assert "detail" in corpo
    assert "Muitas requisições" in corpo.get("erro", "")
    assert "Retry-After" in resp_bloqueada.headers


@pytest.mark.asyncio
async def test_rate_limiter_isolamento_por_ip_diferente(
    async_client: AsyncClient,
):
    """
    Garante que outro IP diferente não seja afetado pelo esgotamento de taxa do IP anterior.
    """
    ip_bloqueado = "192.168.200.1"
    headers_bloqueado = {"X-Forwarded-For": ip_bloqueado}

    # Esgota o IP 1 (senha precisa ter no mínimo 6 caracteres para passar na validação Pydantic)
    payload_valido_schema = {"email": "inexistente@braunas.mg.gov.br", "senha": "senha123"}
    for _ in range(5):
        await async_client.post(
            "/api/v1/auth/login",
            json=payload_valido_schema,
            headers=headers_bloqueado,
        )
    resp_bloq = await async_client.post(
        "/api/v1/auth/login",
        json=payload_valido_schema,
        headers=headers_bloqueado,
    )
    assert resp_bloq.status_code == 429

    # Novo IP limpo deve conseguir fazer requisição sem ser bloqueado
    ip_novo = "192.168.200.2"
    headers_novo = {"X-Forwarded-For": ip_novo}
    resp_novo = await async_client.post(
        "/api/v1/auth/login",
        json=payload_valido_schema,
        headers=headers_novo,
    )
    assert resp_novo.status_code == 401  # Não foi bloqueado com 429
