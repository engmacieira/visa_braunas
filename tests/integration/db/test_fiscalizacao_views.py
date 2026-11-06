"""
Testes de Integração de Fiscalização e Views Regulatórias
Sprint QA-04 - VigiMinas.

Cobre:
- Inserção de inspeção VAPT e consulta à view `vw_indicador_11_vapt_consolidado` (Indicador 11).
- Inserção de vistoria com notificação e prazo e conferência na view `vw_inspecoes_notificacoes_a_vencer`.
"""

from datetime import date, timedelta
import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.estabelecimentos.entities import TipoPessoa, NivelRiscoSanitario, SituacaoCadastral, SituacaoAlvara, CompetenciaFiscalizacao
from app.infrastructure.models import (
    EstabelecimentoModel,
    InspecaoModel,
    UsuarioModel,
)


def _criar_modelo_estabelecimento_base(cnpj_cpf: str, razao_social: str, **kwargs) -> EstabelecimentoModel:
    params = {
        "id": uuid.uuid4(),
        "tipo_cadastro": TipoPessoa.PJ,
        "cnpj_cpf": cnpj_cpf,
        "razao_social": razao_social,
        "nome_fantasia": razao_social,
        "cep": "35.189-000",
        "logradouro": "Avenida JK",
        "numero": "100",
        "bairro": "Centro",
        "municipio": "Braúnas",
        "uf": "MG",
        "telefone_celular": "(33) 99999-0000",
        "email": f"empresa.{uuid.uuid4().hex[:6]}@teste.com",
        "nivel_risco": NivelRiscoSanitario.RISCO_II,
        "competencia_fiscalizacao": CompetenciaFiscalizacao.MUNICIPAL,
        "situacao_estabelecimento": SituacaoCadastral.ATIVO,
        "situacao_alvara": SituacaoAlvara.NAO_POSSUI_IRREGULAR,
        "is_active": True,
        "is_deleted": False,
    }
    params.update(kwargs)
    return EstabelecimentoModel(**params)


@pytest.mark.asyncio
async def test_view_indicador_11_vapt_consolidado(async_db_session: AsyncSession):
    # 1. Usuário fiscal
    fiscal = UsuarioModel(
        id=uuid.uuid4(),
        email=f"fiscal.vapt.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br",
        senha_hash="dummyhash",
        perfil="fiscal_tecnico",
        nome_completo="Fiscal VAPT Teste",
        cpf=f"1{uuid.uuid4().int % 10000000000:010d}",
    )
    async_db_session.add(fiscal)

    # 2. Estabelecimento
    estab = _criar_modelo_estabelecimento_base(
        cnpj_cpf=f"77.666.555/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Fábrica de Ração e Grãos Braúnas Ltda",
    )
    async_db_session.add(estab)
    await async_db_session.flush()

    # 3. Inspeção VAPT Concluída no exercício 2026
    hoje = date(2026, 6, 15)
    inspecao_vapt = InspecaoModel(
        id=uuid.uuid4(),
        numero_termo=f"VAPT-2026/{uuid.uuid4().hex[:4].upper()}",
        estabelecimento_id=estab.id,
        fiscal_responsavel_id=fiscal.id,
        motivo="vapt_trabalhador",
        status="concluida",
        resultado="aprovado",
        data_inicio=hoje,
        data_fim=hoje,
        relato_vistoria="Ação de VAPT concluída com êxito.",
        nome_local_trabalho="Galpão de Moagem e Silos",
        principais_riscos_identificados="Poeira vegetal em suspensão e ruído de maquinário",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(inspecao_vapt)
    await async_db_session.flush()

    # 4. Consulta à view consolidada
    query = text(
        "SELECT ano_exercicio, total_inspecoes_vapt, inspecoes_concluidas, estabelecimentos_distintos_atendidos "
        "FROM vw_indicador_11_vapt_consolidado "
        "WHERE ano_exercicio = 2026"
    )
    res = await async_db_session.execute(query)
    row = res.first()

    assert row is not None
    assert row.ano_exercicio == 2026
    assert row.total_inspecoes_vapt >= 1
    assert row.inspecoes_concluidas >= 1
    assert row.estabelecimentos_distintos_atendidos >= 1


@pytest.mark.asyncio
async def test_view_inspecoes_notificacoes_a_vencer(async_db_session: AsyncSession):
    fiscal = UsuarioModel(
        id=uuid.uuid4(),
        email=f"fiscal.notif.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br",
        senha_hash="dummyhash",
        perfil="fiscal_tecnico",
        nome_completo="Fiscal Notificações Teste",
        cpf=f"2{uuid.uuid4().int % 10000000000:010d}",
    )
    async_db_session.add(fiscal)

    estab = _criar_modelo_estabelecimento_base(
        cnpj_cpf=f"88.777.666/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Padaria e Confeitaria Braúnas Ltda",
    )
    async_db_session.add(estab)
    await async_db_session.flush()

    hoje = date.today()
    data_limite = hoje + timedelta(days=10)

    inspecao_notif = InspecaoModel(
        id=uuid.uuid4(),
        numero_termo=f"NOTIF-2026/{uuid.uuid4().hex[:4].upper()}",
        estabelecimento_id=estab.id,
        fiscal_responsavel_id=fiscal.id,
        motivo="rotina_programada",
        status="concluida",
        resultado="notificado_com_prazo",
        data_inicio=hoje,
        data_fim=hoje,
        prazo_adequacao_dias=10,
        data_limite_adequacao=data_limite,
        relato_vistoria="Notificação sanitária para conserto da câmara frigorífica.",
        exigencias_notificadas="Substituir borracha de vedação e aferir termostato.",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(inspecao_notif)
    await async_db_session.flush()

    # Consulta à view de notificações a vencer
    query = text(
        "SELECT inspecao_id, numero_termo, dias_restantes, data_limite_adequacao "
        "FROM vw_inspecoes_notificacoes_a_vencer "
        "WHERE inspecao_id = :iid"
    )
    res = await async_db_session.execute(query, {"iid": inspecao_notif.id})
    row = res.first()

    assert row is not None
    assert row.inspecao_id == inspecao_notif.id
    assert row.numero_termo == inspecao_notif.numero_termo
    assert row.dias_restantes is not None
    assert row.dias_restantes == 10
    assert row.data_limite_adequacao == data_limite
