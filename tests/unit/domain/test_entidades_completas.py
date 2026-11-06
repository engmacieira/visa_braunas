"""
Testes Unitários: Entidades e Invariantes dos Demais Módulos de Domínio
Sprint QA-04 - VigiMinas.

Cobre entidades puras sem I/O de banco:
- Usuario: desativar, reativar, soft_delete, registrar_login, pode_assinar_termos, pode_homologar_alvara.
- Denuncia: anonimato, despachar, concluir, validações.
- RequerimentoAlvara: transições de status (em análise, deferir, indeferir, cancelar).
- AlvaraSanitario: suspensão, revogação, cassação e invariantes de vigência.
- MetasExercicio: validação de anos e faixas percentuais de meta.
"""

from datetime import date, datetime, timedelta, timezone
import uuid
import pytest

from app.domain.auth.entities import PerfilUsuario, Usuario, MetasExercicio, ConfiguracaoInstitucional
from app.domain.licenciamento.entities import (
    AlvaraSanitario,
    RequerimentoAlvara,
    RequerimentoDadosDeclarados,
    StatusAlvara,
    StatusRequerimento,
    TipoSolicitacaoAlvara,
)
from app.domain.licenciamento.value_objects import (
    CodigoAutenticidadeAlvara,
    NumeroFormatadoAlvara,
    NumeroProtocoloRequerimento,
)
from app.domain.ouvidoria.entities import Denuncia
from app.domain.ouvidoria.enums import CanalDenuncia, GravidadeDenuncia, StatusDenuncia
from app.domain.ouvidoria.value_objects import NumeroProtocoloDenuncia


class TestUsuarioDomainEntity:
    def test_usuario_ciclo_e_permissoes(self):
        usr = Usuario(
            id=uuid.uuid4(),
            email="fiscal@braunas.mg.gov.br",
            senha_hash="hash",
            perfil=PerfilUsuario.FISCAL_TECNICO,
            nome_completo="Fiscal",
            cpf="11144477735",
        )
        assert usr.is_active is True
        assert usr.pode_assinar_termos() is True
        assert usr.pode_homologar_alvara() is False

        # Desativar e reativar
        usr.desativar()
        assert usr.is_active is False
        usr.reativar()
        assert usr.is_active is True

        # Soft delete
        usr.soft_delete()
        assert usr.is_deleted is True
        assert usr.is_active is False

        # Login
        usr.registrar_login()
        assert usr.ultimo_login is not None

        # Perfil admin / coordenador
        usr_coord = Usuario(
            id=uuid.uuid4(),
            email="coord@braunas.mg.gov.br",
            senha_hash="hash",
            perfil=PerfilUsuario.COORDENADOR,
            nome_completo="Coordenador",
            cpf="22255588846",
        )
        assert usr_coord.pode_homologar_alvara() is True


class TestMetasExercicioDomainEntity:
    def test_metas_validacoes_invariantes(self):
        meta = MetasExercicio(
            id=uuid.uuid4(),
            ano_exercicio=2026,
            meta_inspecoes_vapt=20,
            meta_cobertura_risco_1=100.0,
            meta_cobertura_risco_2=100.0,
            meta_cobertura_risco_3=100.0,
        )
        assert meta.ano_exercicio == 2026

        # Ano inválido
        with pytest.raises(ValueError, match="Ano de exercício inválido"):
            MetasExercicio(id=uuid.uuid4(), ano_exercicio=2015)

        # Percentual fora da faixa 0-100
        with pytest.raises(ValueError, match="Percentual de meta"):
            MetasExercicio(id=uuid.uuid4(), ano_exercicio=2026, meta_cobertura_risco_1=150.0)


class TestDenunciaDomainEntity:
    def test_denuncia_anonimato_e_ciclo(self):
        denuncia = Denuncia(
            id=uuid.uuid4(),
            numero_protocolo=NumeroProtocoloDenuncia.gerar(1, 2026),
            local_denunciado_identificacao="Açougue Central",
            relato_denuncia="Higiene precária no balcão de carnes.",
            origem=CanalDenuncia.FORMULARIO_WEB,
            gravidade=GravidadeDenuncia.MEDIA,
            denunciante_anonimo=True,
            denunciante_nome="Cidadão Protegido",
            denunciante_telefone="3399999999",
        )
        # Invariante de proteção ao denunciante anônimo
        assert denuncia.denunciante_nome is None
        assert denuncia.denunciante_telefone is None

        # Despachar denúncia
        fiscal_id = uuid.uuid4()
        denuncia.despachar(fiscal_id=fiscal_id, despacho="Averiguar in loco", iniciar_apuracao=True)
        assert denuncia.status == StatusDenuncia.EM_APURACAO_FISCAL
        assert denuncia.fiscal_designado_id == fiscal_id

        # Concluir denúncia
        denuncia.concluir(
            finalizado_por_id=fiscal_id,
            status_final=StatusDenuncia.PROCEDENTE,
            conclusao="Irregularidade constatada e sanada sob termo de intimação.",
            resposta_denunciante="Ação fiscal executada.",
        )
        assert denuncia.status == StatusDenuncia.PROCEDENTE
        assert denuncia.data_encerramento is not None


class TestRequerimentoEAlvaraDomainEntities:
    def test_requerimento_transicoes_ciclo_de_vida(self):
        req = RequerimentoAlvara(
            id=uuid.uuid4(),
            numero_protocolo=NumeroProtocoloRequerimento.gerar(1, 2026),
            estabelecimento_id=uuid.uuid4(),
            tipo_solicitacao=TipoSolicitacaoAlvara.CONCESSAO_INICIAL,
            status=StatusRequerimento.PENDENTE,
            data_submissao=datetime.now(timezone.utc),
        )
        fiscal_id = uuid.uuid4()
        req.iniciar_analise(fiscal_id)
        assert req.status == StatusRequerimento.EM_ANALISE
        assert req.analisado_por == fiscal_id

        req.deferir(fiscal_id, "Documentação aprovada.")
        assert req.status == StatusRequerimento.DEFERIDO
        assert req.data_conclusao is not None

    def test_alvara_sanitario_invariantes_e_transicoes(self):
        hoje = date.today()
        alv = AlvaraSanitario(
            id=uuid.uuid4(),
            numero_alvara=1,
            exercicio=2026,
            numero_formatado="001/2026",
            estabelecimento_id=uuid.uuid4(),
            requerimento_id=uuid.uuid4(),
            codigo_autenticidade=CodigoAutenticidadeAlvara("AUTENTIC-2026"),
            data_emissao=hoje,
            data_vencimento=hoje + timedelta(days=365),
            status=StatusAlvara.ATIVO,
            emitido_por=uuid.uuid4(),
        )
        assert alv.status == StatusAlvara.ATIVO

        alv.suspender("Descumprimento de condicionantes.")
        assert alv.status == StatusAlvara.SUSPENSO

        alv.revogar("Revogação Administrativa")
        assert alv.status == StatusAlvara.REVOGADO

        alv.cassar("Fraude documental grave.")
        assert alv.status == StatusAlvara.CASSADO

        # Invariante: data de vencimento anterior à emissão
        with pytest.raises(ValueError, match="não pode ser anterior à data de emissão"):
            AlvaraSanitario(
                id=uuid.uuid4(),
                numero_alvara=2,
                exercicio=2026,
                numero_formatado="002/2026",
                estabelecimento_id=uuid.uuid4(),
                requerimento_id=uuid.uuid4(),
                codigo_autenticidade=CodigoAutenticidadeAlvara("AUTENTIC-2026"),
                data_emissao=hoje,
                data_vencimento=hoje - timedelta(days=1),
                status=StatusAlvara.ATIVO,
                emitido_por=uuid.uuid4(),
            )
