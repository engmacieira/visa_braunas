"""
Testes Unitários: Invariantes da Entidade Inspeção (Domínio Puro)
Sprint QA-04 - VigiMinas.

Validação estrita das regras de negócio do laudo fiscal:
- VAPT (Saúde do Trabalhador - Indicador 11): obrigatoriedade de 'nome_local_trabalho' e 'principais_riscos_identificados'.
- Resultado Notificado com Prazo: obrigatoriedade de prazo_adequacao_dias ou data_limite_adequacao.
- Transições de ciclo de vida e integridade de status.
"""

from datetime import date, datetime, time, timedelta, timezone
import uuid
import pytest

from app.domain.fiscalizacao.entities import (
    Inspecao,
    InvarianteInspecaoException,
)
from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)


def _criar_inspecao_base(
    motivo: TipoMotivoInspecao = TipoMotivoInspecao.ROTINA_PROGRAMADA,
    status: StatusInspecao = StatusInspecao.AGENDADA,
    **kwargs,
) -> Inspecao:
    params = {
        "id": uuid.uuid4(),
        "numero_termo": "TI-2026/001",
        "estabelecimento_id": uuid.uuid4(),
        "fiscal_responsavel_id": uuid.uuid4(),
        "data_inicio": date.today(),
        "motivo": motivo,
        "status": status,
    }
    params.update(kwargs)
    return Inspecao(**params)


class TestInvariantesInspecaoVAPT:
    def test_vapt_rejeita_conclusao_sem_nome_local_trabalho(self):
        with pytest.raises(InvarianteInspecaoException, match="nome_local_trabalho"):
            _criar_inspecao_base(
                motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
                status=StatusInspecao.CONCLUIDA,
                resultado=ResultadoInspecao.APROVADO,
                data_fim=date.today(),
                nome_local_trabalho="",
                principais_riscos_identificados="Ruído e calor excessivo",
            )

    def test_vapt_rejeita_conclusao_sem_principais_riscos(self):
        with pytest.raises(InvarianteInspecaoException, match="principais_riscos_identificados"):
            _criar_inspecao_base(
                motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
                status=StatusInspecao.CONCLUIDA,
                resultado=ResultadoInspecao.APROVADO,
                data_fim=date.today(),
                nome_local_trabalho="Setor de Caldeiras e Britagem",
                principais_riscos_identificados=None,
            )

    def test_vapt_sucesso_quando_campos_obrigatorios_preenchidos(self):
        inspecao = _criar_inspecao_base(
            motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
            status=StatusInspecao.AGENDADA,
        )
        inspecao.iniciar_vistoria()
        inspecao.nome_local_trabalho = "Fábrica Central - Linha de Produção"
        inspecao.principais_riscos_identificados = "Poeiras minerais, ergonomia e ruído contínuo"

        inspecao.concluir_com_laudo(
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            relato_vistoria="Ação fiscalizatória VAPT realizada conforme os parâmetros do Indicador 11.",
        )

        assert inspecao.status == StatusInspecao.CONCLUIDA
        assert inspecao.resultado == ResultadoInspecao.APROVADO
        assert inspecao.nome_local_trabalho == "Fábrica Central - Linha de Produção"


class TestInvariantesNotificacaoComPrazo:
    def test_rejeita_notificado_com_prazo_sem_prazo_nem_data_limite(self):
        with pytest.raises(InvarianteInspecaoException, match="prazo_adequacao_dias"):
            _criar_inspecao_base(
                status=StatusInspecao.CONCLUIDA,
                resultado=ResultadoInspecao.NOTIFICADO_COM_PRAZO,
                data_fim=date.today(),
                prazo_adequacao_dias=0,
                data_limite_adequacao=None,
            )

    def test_concluir_com_laudo_calcula_data_limite_automaticamente(self):
        inspecao = _criar_inspecao_base(status=StatusInspecao.EM_ANDAMENTO)
        hoje = date.today()

        inspecao.concluir_com_laudo(
            resultado=ResultadoInspecao.NOTIFICADO_COM_PRAZO,
            data_fim=hoje,
            relato_vistoria="Adequação estrutural necessária na bancada de manipulação.",
            prazo_dias=30,
        )

        assert inspecao.status == StatusInspecao.CONCLUIDA
        assert inspecao.prazo_adequacao_dias == 30
        assert inspecao.data_limite_adequacao == hoje + timedelta(days=30)

    def test_prorrogar_prazo_rejeita_em_inspecao_sem_notificacao(self):
        inspecao = _criar_inspecao_base(
            status=StatusInspecao.CONCLUIDA,
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            relato_vistoria="Regular",
        )

        with pytest.raises(InvarianteInspecaoException, match="só é permitida em inspeções notificadas"):
            inspecao.prorrogar_prazo(15)


class TestTransicoesCicloDeVidaInspecao:
    def test_ciclo_completo_agendada_em_andamento_concluida(self):
        inspecao = _criar_inspecao_base(status=StatusInspecao.AGENDADA)
        assert inspecao.status == StatusInspecao.AGENDADA

        inspecao.iniciar_vistoria(hora=time(9, 30))
        assert inspecao.status == StatusInspecao.EM_ANDAMENTO
        assert inspecao.hora_inspecao == time(9, 30)

        inspecao.concluir_com_laudo(
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            relato_vistoria="Inspeção finalizada com conformidade total aos padrões sanitários.",
        )
        assert inspecao.status == StatusInspecao.CONCLUIDA

    def test_rejeita_iniciar_inspecao_cancelada(self):
        inspecao = _criar_inspecao_base(status=StatusInspecao.AGENDADA)
        inspecao.cancelar("Estabelecimento encontrava-se fechado no dia da vistoria.")
        assert inspecao.status == StatusInspecao.CANCELADA

        with pytest.raises(InvarianteInspecaoException, match="Não é possível iniciar uma vistoria cancelada"):
            inspecao.iniciar_vistoria()

    def test_rejeita_cancelar_inspecao_ja_concluida(self):
        inspecao = _criar_inspecao_base(status=StatusInspecao.AGENDADA)
        inspecao.iniciar_vistoria()
        inspecao.concluir_com_laudo(
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            relato_vistoria="Vistoria satisfatória concluída.",
        )

        with pytest.raises(InvarianteInspecaoException, match="Não é permitido cancelar uma inspeção já concluída"):
            inspecao.cancelar("Tentativa inválida de cancelamento após homologação.")

    def test_conclusao_sem_resultado_ou_sem_data_fim_dispara_excecao(self):
        inspecao = _criar_inspecao_base(status=StatusInspecao.AGENDADA)
        inspecao.iniciar_vistoria()

        # Sem resultado
        with pytest.raises(InvarianteInspecaoException, match="'resultado' definido"):
            inspecao.status = StatusInspecao.CONCLUIDA
            inspecao.data_fim = date.today()
            inspecao.resultado = None
            inspecao.validar_invariantes()

        # Sem data_fim
        with pytest.raises(InvarianteInspecaoException, match="'data_fim'"):
            inspecao.resultado = ResultadoInspecao.APROVADO
            inspecao.data_fim = None
            inspecao.validar_invariantes()
