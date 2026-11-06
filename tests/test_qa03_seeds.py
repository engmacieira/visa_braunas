"""
Testes automatizados da Sprint QA-03: Carga Inicial, Fixtures Realistas e Mecanismo Idempotente de Seeds.
Comprova a idempotência estrita, invariantes de soft delete, integridade das entidades,
hashing de senhas e parametrização regulatória oficial de Braúnas/MG.
"""

from decimal import Decimal
import pytest
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import verify_password
from app.domain.fiscalizacao.enums import TipoMotivoInspecao
from app.infrastructure.models import (
    AlvaraSanitarioModel,
    CnaeModel,
    ConfiguracaoInstitucionalModel,
    DenunciaModel,
    EstabelecimentoCnaeModel,
    EstabelecimentoFornecedorModel,
    EstabelecimentoFuncionarioModel,
    EstabelecimentoModel,
    EstabelecimentoResponsavelTecnicoModel,
    InspecaoModel,
    MetasExercicioModel,
    RepresentanteLegalModel,
    RequerimentoAlvaraDadosModel,
    RequerimentoAlvaraModel,
    ResponsavelTecnicoModel,
    TipoDocumentoModel,
    UsuarioModel,
)
from app.infrastructure.seeds import run_seeds
from tests.fixtures.seed_fixtures import (
    async_db_session,
    async_test_engine,
    seed_counters,
    seeded_db_session,
)


@pytest.mark.asyncio
async def test_seed_idempotencia_execucao_dupla(async_db_session: AsyncSession):
    """
    Diretriz 1: IDEMPOTÊNCIA ESTRITA.
    Executa o seed duas vezes consecutivas na mesma sessão/banco.
    Comprova que a 1ª execução cria todos os registros e a 2ª não gera nenhum erro
    nem duplica nenhum registro (todos ignorados por já existirem).
    """
    # 1ª Execução
    counters_1 = await run_seeds(async_db_session)
    await async_db_session.commit()

    total_criados_1 = sum(counters_1.created.values())
    total_ignorados_1 = sum(counters_1.skipped.values())

    assert total_criados_1 == 62, f"Esperado 62 registros criados, obteve {total_criados_1}"
    assert total_ignorados_1 == 0, f"Esperado 0 ignorados na primeira execução, obteve {total_ignorados_1}"

    # 2ª Execução consecutiva
    counters_2 = await run_seeds(async_db_session)
    await async_db_session.commit()

    total_criados_2 = sum(counters_2.created.values())
    total_ignorados_2 = sum(counters_2.skipped.values())

    assert total_criados_2 == 0, f"A segunda execução deveria criar 0 registros, criou {total_criados_2}"
    assert total_ignorados_2 == 62, f"A segunda execução deveria ignorar 62 registros, ignorou {total_ignorados_2}"

    # Valida contagens absolutas nas tabelas após a 2ª execução
    assert (await async_db_session.scalar(select(func.count(ConfiguracaoInstitucionalModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(UsuarioModel.id)))) == 5
    assert (await async_db_session.scalar(select(func.count(MetasExercicioModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(TipoDocumentoModel.id)))) == 6
    assert (await async_db_session.scalar(select(func.count(CnaeModel.id)))) == 10
    assert (await async_db_session.scalar(select(func.count(RepresentanteLegalModel.id)))) == 6
    assert (await async_db_session.scalar(select(func.count(ResponsavelTecnicoModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(EstabelecimentoModel.id)))) == 6
    assert (await async_db_session.scalar(select(func.count(EstabelecimentoCnaeModel.id)))) == 6
    assert (await async_db_session.scalar(select(func.count(EstabelecimentoResponsavelTecnicoModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(EstabelecimentoFuncionarioModel.id)))) == 7
    assert (await async_db_session.scalar(select(func.count(EstabelecimentoFornecedorModel.id)))) == 6
    assert (await async_db_session.scalar(select(func.count(InspecaoModel.id)))) == 2
    assert (await async_db_session.scalar(select(func.count(RequerimentoAlvaraModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(RequerimentoAlvaraDadosModel.requerimento_id)))) == 1
    assert (await async_db_session.scalar(select(func.count(AlvaraSanitarioModel.id)))) == 1
    assert (await async_db_session.scalar(select(func.count(DenunciaModel.id)))) == 1


@pytest.mark.asyncio
async def test_configuracao_institucional_braunas(seeded_db_session: AsyncSession):
    """
    Roteiro 1: Configuração Institucional (Singleton key = 1, Braúnas/MG).
    """
    res = await seeded_db_session.execute(
        select(ConfiguracaoInstitucionalModel).where(
            ConfiguracaoInstitucionalModel.singleton_key == 1,
            ConfiguracaoInstitucionalModel.is_deleted.is_(False),
        )
    )
    config = res.scalars().first()
    assert config is not None
    assert config.municipio == "Braúnas"
    assert config.uf == "MG"
    assert config.cep == "35.189-000"
    assert config.nome_prefeitura == "Prefeitura Municipal de Braúnas"
    assert config.nome_secretaria == "Secretaria Municipal de Saúde"
    assert config.orgao_vigilancia == "Coordenação de Vigilância em Saúde e Vigilância Sanitária"
    assert config.cnpj_institucional == "18.303.187/0001-44"
    assert config.is_active is True
    assert config.is_deleted is False


@pytest.mark.asyncio
async def test_usuarios_servidores_seguranca_senhas(seeded_db_session: AsyncSession):
    """
    Roteiro 2 & Diretriz 3: Utilizadores e Senhas Criptografadas com Bcrypt.
    """
    res = await seeded_db_session.execute(
        select(UsuarioModel).where(UsuarioModel.is_deleted.is_(False))
    )
    usuarios = {u.email: u for u in res.scalars().all()}
    assert len(usuarios) == 5

    # Verificação de perfis esperados
    assert "admin@braunas.mg.gov.br" in usuarios
    assert "coordenador.visa@braunas.mg.gov.br" in usuarios
    assert "fiscal1.visa@braunas.mg.gov.br" in usuarios
    assert "fiscal2.visa@braunas.mg.gov.br" in usuarios
    assert "digitador.visa@braunas.mg.gov.br" in usuarios

    # Portaria do fiscal
    fiscal1 = usuarios["fiscal1.visa@braunas.mg.gov.br"]
    assert "123/2024" in fiscal1.portaria_nomeacao
    assert fiscal1.matricula == "FISC-101"

    # Verificação de hashing de senha (bcrypt / pbkdf2 - nunca texto puro)
    for email, user in usuarios.items():
        assert not user.senha_hash.startswith("AdminMaster")
        assert not user.senha_hash.startswith("Fiscal")
        assert user.is_active is True
        assert user.is_deleted is False

    # Validação de login com a função de segurança
    assert verify_password("AdminMaster@2026", usuarios["admin@braunas.mg.gov.br"].senha_hash)
    assert verify_password("Fiscal1@2026", usuarios["fiscal1.visa@braunas.mg.gov.br"].senha_hash)
    assert not verify_password("SenhaErrada", usuarios["admin@braunas.mg.gov.br"].senha_hash)


@pytest.mark.asyncio
async def test_metas_exercicio_2026(seeded_db_session: AsyncSession):
    """
    Roteiro 3: Metas do Exercício de 2026 (Indicador 11 VAPT = 12, Cobertura 100%).
    """
    res = await seeded_db_session.execute(
        select(MetasExercicioModel).where(
            MetasExercicioModel.ano_exercicio == 2026,
            MetasExercicioModel.is_deleted.is_(False),
        )
    )
    meta = res.scalars().first()
    assert meta is not None
    assert meta.meta_inspecoes_vapt == 12
    assert meta.meta_cobertura_risco_1 == Decimal("100.00")
    assert meta.meta_cobertura_risco_2 == Decimal("100.00")
    assert meta.meta_cobertura_risco_3 == Decimal("100.00")
    assert meta.dias_validade_padrao_alvara == 365
    assert meta.dias_prazo_padrao_notificacao == 30
    assert meta.is_active is True
    assert meta.is_deleted is False


@pytest.mark.asyncio
async def test_catalogo_tipos_documentos(seeded_db_session: AsyncSession):
    """
    Roteiro 4: Catálogo de Tipos de Documentos Regulatórios (mínimo 6 tipos solicitados).
    """
    res = await seeded_db_session.execute(
        select(TipoDocumentoModel).where(TipoDocumentoModel.is_deleted.is_(False))
    )
    docs = {d.codigo_identificador: d for d in res.scalars().all()}
    assert len(docs) >= 6

    esperados = [
        "ALVARA_SANITARIO",
        "LIMPEZA_CAIXA_AGUA",
        "CONTROLE_PRAGAS_VETORES",
        "PGRSS",
        "LIVRO_REGISTRO_ESPECIAIS",
        "CERTIFICADO_CURSO_MANIPULADORES",
    ]
    for cod in esperados:
        assert cod in docs
        assert docs[cod].is_active is True
        assert docs[cod].is_deleted is False

    assert docs["ALVARA_SANITARIO"].validade_padrao_meses == 12
    assert docs["LIMPEZA_CAIXA_AGUA"].validade_padrao_meses == 6
    assert docs["CONTROLE_PRAGAS_VETORES"].validade_padrao_meses == 6


@pytest.mark.asyncio
async def test_catalogo_cnaes(seeded_db_session: AsyncSession):
    """
    Roteiro 5: Catálogo de CNAEs Sanitários Típicos do Município (10 subclasses oficiais).
    """
    res = await seeded_db_session.execute(
        select(CnaeModel).where(CnaeModel.is_deleted.is_(False))
    )
    cnaes = {c.codigo: c for c in res.scalars().all()}
    assert len(cnaes) >= 10

    # Risco III que exige RT
    assert cnaes["4711-3/02"].grau_risco_padrao == "Risco III"
    assert cnaes["4711-3/02"].exige_rt is True
    assert cnaes["4771-7/01"].grau_risco_padrao == "Risco III"
    assert cnaes["4771-7/01"].exige_rt is True

    # Risco II
    assert cnaes["1091-1/02"].grau_risco_padrao == "Risco II"
    assert cnaes["5611-2/01"].grau_risco_padrao == "Risco II"
    assert cnaes["5611-2/03"].grau_risco_padrao == "Risco II"
    assert cnaes["4722-9/01"].grau_risco_padrao == "Risco II"

    # Risco I e Dispensado
    assert cnaes["9602-5/01"].grau_risco_padrao == "Risco I"
    assert cnaes["4520-0/01"].grau_risco_padrao == "Risco I"
    assert cnaes["4789-0/99"].grau_risco_padrao == "Dispensado"


@pytest.mark.asyncio
async def test_estabelecimentos_representantes_rts_vinculos(seeded_db_session: AsyncSession):
    """
    Roteiro 6: 6 estabelecimentos (2 Risco III, 2 Risco II, 2 Risco I/Dispensado)
    com RT farmacêutico ativo e titular na drogaria, vínculos de funcionários e fornecedores.
    """
    res = await seeded_db_session.execute(
        select(EstabelecimentoModel).where(EstabelecimentoModel.is_deleted.is_(False))
    )
    estabs = {e.cnpj_cpf: e for e in res.scalars().all()}
    assert len(estabs) == 6

    # 2 Risco III
    assert estabs["11.222.333/0001-44"].nivel_risco == "Risco III"  # Drogaria
    assert estabs["22.333.444/0001-55"].nivel_risco == "Risco III"  # Supermercado

    # 2 Risco II
    assert estabs["33.444.555/0001-66"].nivel_risco == "Risco II"   # Padaria
    assert estabs["44.555.666/0001-77"].nivel_risco == "Risco II"   # Restaurante

    # 2 Risco I / Dispensado
    assert estabs["55.666.777/0001-88"].nivel_risco == "Risco I"    # Salão de Beleza
    assert estabs["66.777.888/0001-99"].nivel_risco == "Risco I"    # Loja Utilidades

    # RT Titular ativo na Drogaria
    drogaria = estabs["11.222.333/0001-44"]
    res_rt = await seeded_db_session.execute(
        select(EstabelecimentoResponsavelTecnicoModel).where(
            EstabelecimentoResponsavelTecnicoModel.estabelecimento_id == drogaria.id,
            EstabelecimentoResponsavelTecnicoModel.eh_substituto.is_(False),
            EstabelecimentoResponsavelTecnicoModel.is_active.is_(True),
            EstabelecimentoResponsavelTecnicoModel.is_deleted.is_(False),
        )
    )
    vinculo_rt = res_rt.scalars().first()
    assert vinculo_rt is not None
    assert vinculo_rt.responsavel_tecnico.conselho_classe == "CRF"
    assert vinculo_rt.responsavel_tecnico.numero_registro_conselho == "24890"

    # Vínculos de funcionários manipuladores
    res_func = await seeded_db_session.execute(
        select(EstabelecimentoFuncionarioModel).where(
            EstabelecimentoFuncionarioModel.eh_manipulador.is_(True),
            EstabelecimentoFuncionarioModel.is_deleted.is_(False),
        )
    )
    manipuladores = res_func.scalars().all()
    assert len(manipuladores) >= 3  # Açougueiro, Padeiro, Cozinheira

    # Vínculos de fornecedores
    res_forn = await seeded_db_session.execute(
        select(EstabelecimentoFornecedorModel).where(
            EstabelecimentoFornecedorModel.is_deleted.is_(False)
        )
    )
    assert len(res_forn.scalars().all()) == 6


@pytest.mark.asyncio
async def test_casos_operacionais_inspecoes_alvara_denuncia(seeded_db_session: AsyncSession):
    """
    Roteiro 7: Casos Operacionais para Testes:
    - 1 Inspeção VAPT (Indicador 11) com campos obrigatórios preenchidos
    - 1 Inspeção de rotina notificada com prazo
    - 1 Alvará Sanitário emitido ativo no padrão 'XXXXXXXX-YYYY'
    - 1 Denúncia recebida pendente de triagem
    """
    # 1. Inspeção VAPT
    res_vapt = await seeded_db_session.execute(
        select(InspecaoModel).where(
            InspecaoModel.motivo == TipoMotivoInspecao.VAPT_TRABALHADOR,
            InspecaoModel.is_deleted.is_(False),
        )
    )
    vapt = res_vapt.scalars().first()
    assert vapt is not None
    assert vapt.status.value == "concluida"
    assert vapt.nome_local_trabalho is not None and len(vapt.nome_local_trabalho) > 0
    assert vapt.principais_riscos_identificados is not None and len(vapt.principais_riscos_identificados) > 0

    # 2. Inspeção Notificada com Prazo
    res_rotina = await seeded_db_session.execute(
        select(InspecaoModel).where(
            InspecaoModel.numero_termo == "TERM-2026/002",
            InspecaoModel.is_deleted.is_(False),
        )
    )
    rotina = res_rotina.scalars().first()
    assert rotina is not None
    assert rotina.resultado.value == "notificado_com_prazo"
    assert rotina.prazo_adequacao_dias == 30
    assert rotina.data_limite_adequacao is not None

    # 3. Alvará Sanitário Ativo Padrão XXXXXXXX-YYYY
    res_alvara = await seeded_db_session.execute(
        select(AlvaraSanitarioModel).where(
            AlvaraSanitarioModel.numero_alvara == 1,
            AlvaraSanitarioModel.exercicio == 2026,
            AlvaraSanitarioModel.is_deleted.is_(False),
        )
    )
    alvara = res_alvara.scalars().first()
    assert alvara is not None
    assert alvara.status == "ativo"
    assert alvara.numero_formatado == "001/2026"
    assert len(alvara.codigo_autenticidade.split("-")) == 2
    assert len(alvara.codigo_autenticidade.split("-")[0]) == 8
    assert alvara.codigo_autenticidade.split("-")[1] == "2026"

    # Estabelecimento sincronizado com o alvará
    res_estab = await seeded_db_session.execute(
        select(EstabelecimentoModel).where(EstabelecimentoModel.id == alvara.estabelecimento_id)
    )
    estab = res_estab.scalars().first()
    assert estab.numero_alvara == "001/2026"
    assert estab.situacao_alvara == "Válido"

    # 4. Denúncia pendente de triagem
    res_den = await seeded_db_session.execute(
        select(DenunciaModel).where(
            DenunciaModel.numero_protocolo == "DEN-2026-0001",
            DenunciaModel.is_deleted.is_(False),
        )
    )
    den = res_den.scalars().first()
    assert den is not None
    assert den.status == "recebida"
    assert den.gravidade == "media"
    assert den.is_active is True
    assert den.is_deleted is False
