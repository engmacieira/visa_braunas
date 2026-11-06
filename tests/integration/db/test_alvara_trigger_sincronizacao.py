"""
Testes de Integração de Gatilhos e Triggers PostgreSQL: Sincronização de Alvarás
Sprint QA-04 - VigiMinas.

Cobre a trigger `trg_alvara_sincroniza_estabelecimento` e função `fn_sincronizar_alvara_estabelecimento()`:
1. Emissão de alvará ativo -> Atualização automática de `numero_alvara`, `data_validade_alvara` e `situacao_alvara = 'Válido'` no estabelecimento.
2. Alteração para status cassado ou soft delete (`is_deleted = True`) no alvará -> Reversão para `situacao_alvara = 'Não Possui (Irregular)'`.
"""

from datetime import date, timedelta
import uuid
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.estabelecimentos.entities import SituacaoAlvara
from app.infrastructure.models import (
    AlvaraSanitarioModel,
    EstabelecimentoModel,
    UsuarioModel,
)


@pytest.mark.asyncio
async def test_trigger_sincronizacao_alvara_ativo_e_reversao_cassado_ou_soft_delete(async_db_session: AsyncSession):
    # 1. Obter usuário emissor existente (ex: coordenador) ou criar com CPF único
    res_usr = await async_db_session.execute(
        select(UsuarioModel).where(UsuarioModel.perfil == "coordenador", UsuarioModel.is_deleted.is_(False))
    )
    emissor = res_usr.scalars().first()
    if not emissor:
        emissor = UsuarioModel(
            id=uuid.uuid4(),
            email=f"coordenador.alvara.{uuid.uuid4().hex[:6]}@braunas.mg.gov.br",
            senha_hash="dummyhash",
            perfil="coordenador",
            nome_completo="Coordenador Emissor Teste",
            cpf=f"9{uuid.uuid4().int % 10000000000:010d}",
        )
        async_db_session.add(emissor)
        await async_db_session.flush()

    # 2. Estabelecimento inicialmente irregular
    estab = EstabelecimentoModel(
        id=uuid.uuid4(),
        cnpj_cpf=f"55.444.333/0001-{uuid.uuid4().hex[:2]}",
        razao_social="Drogaria e Manipulação Saúde Braúnas Ltda",
        nivel_risco="Risco III",
        cep="35.189-000",
        logradouro="Avenida Principal",
        numero="100",
        bairro="Centro",
        telefone_celular="33999998888",
        email="contato@drogaria.com",
        situacao_alvara=SituacaoAlvara.NAO_POSSUI_IRREGULAR,
        numero_alvara=None,
        data_validade_alvara=None,
    )
    async_db_session.add(estab)
    await async_db_session.flush()

    assert estab.situacao_alvara in ("Não Possui (Irregular)", SituacaoAlvara.NAO_POSSUI_IRREGULAR)
    assert estab.numero_alvara is None

    # 3. Emissão de Alvará Sanitário Ativo
    hoje = date.today()
    vencimento = hoje + timedelta(days=365)
    num_alvara = int(uuid.uuid4().int % 9000 + 1000)
    num_formatado = f"{num_alvara}/{hoje.year}"
    cod_aut = f"AUT{uuid.uuid4().hex[:4].upper()}-{hoje.year}"

    alvara = AlvaraSanitarioModel(
        id=uuid.uuid4(),
        numero_alvara=num_alvara,
        exercicio=hoje.year,
        numero_formatado=num_formatado,
        estabelecimento_id=estab.id,
        codigo_autenticidade=cod_aut,
        data_emissao=hoje,
        data_vencimento=vencimento,
        status="ativo",
        emitido_por=emissor.id,
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(alvara)
    await async_db_session.flush()

    # Recarrega o estabelecimento do banco para verificar a sincronização automática pelo gatilho
    await async_db_session.refresh(estab)
    assert estab.situacao_alvara in ("Válido", SituacaoAlvara.VALIDO)
    assert estab.numero_alvara == num_formatado
    assert estab.data_validade_alvara == vencimento

    # 4. Alteração de status para 'cassado' -> Reversão para 'Não Possui (Irregular)'
    alvara.status = "cassado"
    await async_db_session.flush()
    await async_db_session.refresh(estab)

    assert estab.situacao_alvara in ("Não Possui (Irregular)", SituacaoAlvara.NAO_POSSUI_IRREGULAR)

    # 5. Reativação do alvará para testar em seguida o Soft Delete
    alvara.status = "ativo"
    await async_db_session.flush()
    await async_db_session.refresh(estab)
    assert estab.situacao_alvara in ("Válido", SituacaoAlvara.VALIDO)

    # 6. Soft Delete no Alvará (is_deleted = True) -> Reversão para 'Não Possui (Irregular)'
    alvara.is_deleted = True
    alvara.is_active = False
    await async_db_session.flush()
    await async_db_session.refresh(estab)

    assert estab.situacao_alvara in ("Não Possui (Irregular)", SituacaoAlvara.NAO_POSSUI_IRREGULAR)
