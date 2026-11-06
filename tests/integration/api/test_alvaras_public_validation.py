"""
Testes de Integração de Rotas: Validação Pública de Alvarás Sanitários
Sprint QA-04 - VigiMinas.

Cobre:
- Chamada ao endpoint público `GET /api/v1/alvaras/validar/{codigo_autenticidade}` SEM cabeçalho Authorization.
- Confirma retorno HTTP 200 OK com os dados públicos do alvará, fé pública e autenticidade.
- Bloqueio/rejeição com 404 caso o código de autenticidade seja inexistente.
"""

from datetime import date, timedelta
import uuid
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.estabelecimentos.entities import (
    TipoPessoa,
    NivelRiscoSanitario,
    SituacaoCadastral,
    SituacaoAlvara,
    CompetenciaFiscalizacao,
)
from app.infrastructure.models import (
    AlvaraSanitarioModel,
    EstabelecimentoModel,
    RequerimentoAlvaraModel,
    UsuarioModel,
)


@pytest.mark.asyncio
async def test_validacao_publica_alvara_sem_token_autorizacao(
    async_client: AsyncClient,
    async_db_session: AsyncSession,
):
    # 1. Usuário emissor e estabelecimento
    emissor = UsuarioModel(
        id=uuid.uuid4(),
        email=f"emissor.pub.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br",
        senha_hash="dummy",
        perfil="coordenador",
        nome_completo="Coordenador Emissor",
        cpf=f"3{uuid.uuid4().int % 10000000000:010d}",
    )
    async_db_session.add(emissor)

    estab = EstabelecimentoModel(
        id=uuid.uuid4(),
        tipo_cadastro=TipoPessoa.PJ,
        cnpj_cpf=f"78.901.234/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Supermercado Braúnas Matriz Ltda",
        nome_fantasia="Supermercado Braúnas Matriz",
        cep="35.189-000",
        logradouro="Praça Central",
        numero="10",
        bairro="Centro",
        municipio="Braúnas",
        uf="MG",
        telefone_celular="(33) 98888-0000",
        email="contato@supermercado.com",
        nivel_risco=NivelRiscoSanitario.RISCO_II,
        competencia_fiscalizacao=CompetenciaFiscalizacao.MUNICIPAL,
        situacao_estabelecimento=SituacaoCadastral.ATIVO,
        situacao_alvara=SituacaoAlvara.VALIDO,
    )
    async_db_session.add(estab)
    await async_db_session.flush()

    # Requerimento deferido para atender à invariante de domínio do Alvará
    req = RequerimentoAlvaraModel(
        id=uuid.uuid4(),
        numero_protocolo=f"REQ-2026-{uuid.uuid4().hex[:4].upper()}",
        estabelecimento_id=estab.id,
        tipo_solicitacao="concessao_inicial",
        status="deferido",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(req)
    await async_db_session.flush()

    # 2. Alvará com código de autenticidade no padrão XXXXXXXX-YYYY
    codigo_teste = f"PUB{uuid.uuid4().hex[:5].upper()}-2026"
    alvara = AlvaraSanitarioModel(
        id=uuid.uuid4(),
        numero_alvara=777,
        exercicio=2026,
        numero_formatado="777/2026",
        estabelecimento_id=estab.id,
        requerimento_id=req.id,
        codigo_autenticidade=codigo_teste,
        data_emissao=date(2026, 1, 10),
        data_vencimento=date(2027, 1, 10),
        status="ativo",
        emitido_por=emissor.id,
        condicionantes_restricoes="Manter alvará em local visível ao público.",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(alvara)
    await async_db_session.flush()

    # 3. Requisição SEM qualquer cabeçalho de autenticação
    response = await async_client.get(f"/api/v1/alvaras/validar/{codigo_teste}")
    assert response.status_code == 200

    dados = response.json()
    assert dados["codigo_autenticidade"] == codigo_teste
    assert dados["numero_formatado"] == "777/2026"
    assert dados["estabelecimento_id"] == str(estab.id)
    assert dados["status"] == "ativo"


@pytest.mark.asyncio
async def test_validacao_publica_alvara_inexistente_retorna_404(
    async_client: AsyncClient,
):
    codigo_inexistente = "INEXIST0-2026"
    response = await async_client.get(f"/api/v1/alvaras/validar/{codigo_inexistente}")
    assert response.status_code == 404
