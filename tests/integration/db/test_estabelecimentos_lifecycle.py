"""
Testes de Integração de Repositório e Banco: Ciclo de Vida do Estabelecimento
Sprint QA-04 - VigiMinas.

Cobre:
- Cadastro completo de estabelecimento via repositório.
- Associação N:N de CNAEs e verificação da unicidade condicional de CNAE principal ativo.
- Vínculo de Responsável Técnico e garantia de apenas 1 RT titular ativo simultâneo.
- Consulta à view `vw_estabelecimentos_risco_consolidado` confirmando cálculo em SQL.
- Comportamento de índices parciais (Soft Delete e recadastro do mesmo CNPJ).
"""

from datetime import date
import uuid
import pytest
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import IntegrityError

from app.domain.estabelecimentos.entities import (
    Estabelecimento,
    TipoPessoa,
    NivelRiscoSanitario,
    SituacaoCadastral,
    SituacaoAlvara,
    CompetenciaFiscalizacao,
)
from app.infrastructure.models import (
    CnaeModel,
    EstabelecimentoModel,
    EstabelecimentoCnaeModel,
    ResponsavelTecnicoModel,
    EstabelecimentoResponsavelTecnicoModel,
)
from app.infrastructure.repositories.estabelecimento_repository import EstabelecimentoRepository


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
async def test_cadastro_completo_estabelecimento_e_consulta_repositorio(async_db_session: AsyncSession):
    repo = EstabelecimentoRepository(async_db_session)

    cnpj_teste = f"45.987.654/0001-{uuid.uuid4().hex[:2]}"
    estab = Estabelecimento(
        id=uuid.uuid4(),
        tipo_cadastro=TipoPessoa.PJ,
        cnpj_cpf=cnpj_teste,
        razao_social="Supermercado Braúnas Central Ltda",
        nome_fantasia="Supermercado Braúnas",
        logradouro="Rua Direita",
        numero="250",
        bairro="Centro",
        cep="35.189-000",
        telefone_celular="(33) 98888-7777",
        email="contato@supermercado.com",
        nivel_risco=NivelRiscoSanitario.RISCO_II,
        situacao_estabelecimento=SituacaoCadastral.ATIVO,
        situacao_alvara=SituacaoAlvara.NAO_POSSUI_IRREGULAR,
        competencia_fiscalizacao=CompetenciaFiscalizacao.MUNICIPAL,
    )

    salvo = await repo.save(estab)
    assert salvo.id == estab.id

    # Busca por ID e busca por CNPJ/CPF
    consultado = await repo.get_by_id(estab.id)
    assert consultado is not None
    assert consultado.razao_social == "Supermercado Braúnas Central Ltda"

    por_cnpj = await repo.get_by_cnpj_cpf(cnpj_teste)
    assert por_cnpj is not None
    assert por_cnpj.id == estab.id


@pytest.mark.asyncio
async def test_associacao_cnaes_e_unicidade_cnae_principal_ativo(async_db_session: AsyncSession):
    """
    Verifica a associação N:N e garante que o banco rejeita 2 CNAEs principais simultâneos ativos
    devido ao índice condicional único.
    """
    estab = _criar_modelo_estabelecimento_base(
        cnpj_cpf=f"12.345.678/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Restaurante Sabor Mineiro Ltda",
    )
    async_db_session.add(estab)

    c1 = CnaeModel(
        id=uuid.uuid4(),
        codigo=f"5611-2/{uuid.uuid4().hex[:2]}",
        descricao="Restaurantes Teste",
        grau_risco_padrao="Risco II",
    )
    c2 = CnaeModel(
        id=uuid.uuid4(),
        codigo=f"5611-2/{uuid.uuid4().hex[:2]}b",
        descricao="Lanchonetes Teste",
        grau_risco_padrao="Risco II",
    )
    async_db_session.add_all([c1, c2])
    await async_db_session.flush()

    # 1º CNAE Principal
    vinc1 = EstabelecimentoCnaeModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        cnae_id=c1.id,
        cnae_codigo=c1.codigo,
        eh_principal=True,
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(vinc1)
    await async_db_session.flush()

    # 2º CNAE Principal Ativo no mesmo estabelecimento -> Deve disparar violação de unicidade
    vinc2 = EstabelecimentoCnaeModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        cnae_id=c2.id,
        cnae_codigo=c2.codigo,
        eh_principal=True,
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(vinc2)
    with pytest.raises(IntegrityError):
        await async_db_session.flush()

    await async_db_session.rollback()


@pytest.mark.asyncio
async def test_vinculo_rt_e_unicidade_rt_titular_ativo(async_db_session: AsyncSession):
    """
    Garante que um estabelecimento aceita apenas 1 RT titular ativo simultâneo.
    """
    estab = _criar_modelo_estabelecimento_base(
        cnpj_cpf=f"23.456.789/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Laboratório Braúnas Ltda",
        nivel_risco=NivelRiscoSanitario.RISCO_III,
    )
    async_db_session.add(estab)

    rt1 = ResponsavelTecnicoModel(
        id=uuid.uuid4(),
        nome_completo="Dr. Alberto Santos",
        cpf=f"0{uuid.uuid4().int % 10000000000:010d}",
        conselho_classe="CRF",
        numero_registro_conselho=str(uuid.uuid4().int % 90000 + 10000),
        telefone="(33) 98765-4321",
    )
    rt2 = ResponsavelTecnicoModel(
        id=uuid.uuid4(),
        nome_completo="Dra. Beatriz Miranda",
        cpf=f"0{uuid.uuid4().int % 10000000000:010d}",
        conselho_classe="CRF",
        numero_registro_conselho=str(uuid.uuid4().int % 90000 + 10000),
        telefone="(33) 98765-4322",
    )
    async_db_session.add_all([rt1, rt2])
    await async_db_session.flush()

    # Primeiro titular (eh_substituto = False)
    vinc_rt1 = EstabelecimentoResponsavelTecnicoModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        responsavel_tecnico_id=rt1.id,
        eh_substituto=False,
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(vinc_rt1)
    await async_db_session.flush()

    # Segundo titular simultâneo ativo -> Violação do índice parcial
    vinc_rt2 = EstabelecimentoResponsavelTecnicoModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        responsavel_tecnico_id=rt2.id,
        eh_substituto=False,
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(vinc_rt2)
    with pytest.raises(IntegrityError):
        await async_db_session.flush()

    await async_db_session.rollback()


@pytest.mark.asyncio
async def test_view_estabelecimentos_risco_consolidado_em_sql(async_db_session: AsyncSession):
    """
    Verifica se a view SQL vw_estabelecimentos_risco_consolidado apura corretamente
    o grau de risco sanitário preponderante:
    - Se houver qualquer CNAE Risco III -> Risco III
    """
    estab = _criar_modelo_estabelecimento_base(
        cnpj_cpf=f"34.567.890/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Clínica Médica e Vacinação Ltda",
        nivel_risco=NivelRiscoSanitario.RISCO_III,
    )
    async_db_session.add(estab)

    cnae_baixo = CnaeModel(
        id=uuid.uuid4(),
        codigo=f"8630-5/{uuid.uuid4().hex[:2]}",
        descricao="Atividade Médica Geral",
        grau_risco_padrao="Risco II",
    )
    cnae_alto = CnaeModel(
        id=uuid.uuid4(),
        codigo=f"8630-5/{uuid.uuid4().hex[:2]}b",
        descricao="Vacinação e Imunização",
        grau_risco_padrao="Risco III",
    )
    async_db_session.add_all([cnae_baixo, cnae_alto])
    await async_db_session.flush()

    async_db_session.add(EstabelecimentoCnaeModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        cnae_id=cnae_baixo.id,
        cnae_codigo=cnae_baixo.codigo,
        eh_principal=True,
        is_active=True,
        is_deleted=False,
    ))
    async_db_session.add(EstabelecimentoCnaeModel(
        id=uuid.uuid4(),
        estabelecimento_id=estab.id,
        cnae_id=cnae_alto.id,
        cnae_codigo=cnae_alto.codigo,
        eh_principal=False,
        is_active=True,
        is_deleted=False,
    ))
    await async_db_session.flush()

    # Consulta à view SQL
    query = text(
        "SELECT risco_sanitario_preponderante, cnae_principal_codigo "
        "FROM vw_estabelecimentos_risco_consolidado "
        "WHERE estabelecimento_id = :eid"
    )
    res = await async_db_session.execute(query, {"eid": estab.id})
    row = res.first()

    assert row is not None
    assert row.risco_sanitario_preponderante == "Risco III"
    assert row.cnae_principal_codigo == cnae_baixo.codigo


@pytest.mark.asyncio
async def test_indices_parciais_soft_delete_permite_recadastro(async_db_session: AsyncSession):
    """
    Valida regra de ouro de índices parciais:
    Cadastra CNPJ, aplica soft delete (is_deleted = True), recadastra o mesmo CNPJ
    e confirma que o PostgreSQL aceita sem violar constraint única.
    """
    cnpj_teste = f"99.888.777/0001-{uuid.uuid4().hex[:2]}"

    estab1 = _criar_modelo_estabelecimento_base(
        cnpj_cpf=cnpj_teste,
        razao_social="Empresa Antiga Ltda",
        is_active=False,
        is_deleted=True,  # Soft delete
    )
    async_db_session.add(estab1)
    await async_db_session.flush()

    # Novo cadastro ativo com exatamente a mesma chave
    estab2 = _criar_modelo_estabelecimento_base(
        cnpj_cpf=cnpj_teste,
        razao_social="Empresa Nova Reativada Ltda",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(estab2)
    await async_db_session.flush()

    res = await async_db_session.execute(
        select(EstabelecimentoModel).where(
            EstabelecimentoModel.cnpj_cpf == cnpj_teste,
            EstabelecimentoModel.is_deleted.is_(False),
        )
    )
    ativo = res.scalars().first()
    assert ativo is not None
    assert ativo.id == estab2.id
    assert ativo.razao_social == "Empresa Nova Reativada Ltda"
