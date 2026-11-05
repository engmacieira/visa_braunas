import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, Dict, List, Optional

from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)


class InvarianteInspecaoException(ValueError):
    """Lançada quando uma regra de negócio ou invariante da inspeção é violada."""
    pass


@dataclass
class Inspecao:
    """
    Entidade pura do Domínio representando uma Vistoria, Termo Fiscal ou Ação VAPT.
    Possui regras de validação estritas para integridade do laudo fiscal.
    """
    id: uuid.UUID
    numero_termo: str
    estabelecimento_id: uuid.UUID
    fiscal_responsavel_id: uuid.UUID
    data_inicio: date
    motivo: TipoMotivoInspecao = TipoMotivoInspecao.ROTINA_PROGRAMADA
    status: StatusInspecao = StatusInspecao.AGENDADA

    requerimento_id: Optional[uuid.UUID] = None
    denuncia_id: Optional[uuid.UUID] = None
    fiscais_acompanhantes: Optional[str] = None

    data_agendamento: Optional[date] = None
    data_fim: Optional[date] = None
    hora_inspecao: Optional[time] = None

    resultado: Optional[ResultadoInspecao] = None
    nome_pessoa_acompanhou: Optional[str] = None
    cpf_pessoa_acompanhou: Optional[str] = None

    relato_vistoria: Optional[str] = None
    irregularidades_constatadas: Optional[str] = None
    exigencias_notificadas: Optional[str] = None
    prazo_adequacao_dias: int = 0
    data_limite_adequacao: Optional[date] = None

    # Específico para VAPT (Saúde do Trabalhador - Indicador 11)
    nome_local_trabalho: Optional[str] = None
    principais_riscos_identificados: Optional[str] = None
    recomendacoes_orientacoes: Optional[str] = None

    # Dados Estruturados e Arquivos
    checklist_respostas: Dict[str, Any] = field(default_factory=dict)
    relatorio_fotografico: List[Dict[str, Any]] = field(default_factory=list)
    url_termo_assinado_pdf: Optional[str] = None

    # Soft Delete & Auditoria
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def __post_init__(self) -> None:
        self.validar_invariantes()

    def validar_invariantes(self) -> None:
        """Valida as regras de integridade do laudo sanitário."""
        # Invariante de Conclusão
        if self.status == StatusInspecao.CONCLUIDA:
            if not self.resultado:
                raise InvarianteInspecaoException(
                    "Uma inspeção concluída exige obrigatoriamente um 'resultado' definido."
                )
            if not self.data_fim:
                raise InvarianteInspecaoException(
                    "Uma inspeção concluída exige o preenchimento da 'data_fim'."
                )

        # Invariante de Notificação com Prazo
        if self.resultado == ResultadoInspecao.NOTIFICADO_COM_PRAZO:
            if self.prazo_adequacao_dias <= 0 and not self.data_limite_adequacao:
                raise InvarianteInspecaoException(
                    "Para o resultado 'notificado_com_prazo', deve ser fornecido 'prazo_adequacao_dias' positivo ou 'data_limite_adequacao'."
                )

        # Invariante VAPT (Indicador 11)
        if self.motivo == TipoMotivoInspecao.VAPT_TRABALHADOR and self.status in (
            StatusInspecao.EM_ANDAMENTO,
            StatusInspecao.CONCLUIDA,
        ):
            if not self.nome_local_trabalho or not self.nome_local_trabalho.strip():
                raise InvarianteInspecaoException(
                    "Ações de VAPT (Indicador 11) exigem obrigatoriamente o preenchimento de 'nome_local_trabalho'."
                )
            if not self.principais_riscos_identificados or not self.principais_riscos_identificados.strip():
                raise InvarianteInspecaoException(
                    "Ações de VAPT (Indicador 11) exigem obrigatoriamente o preenchimento de 'principais_riscos_identificados'."
                )

    def iniciar_vistoria(self, hora: Optional[time] = None) -> None:
        """Transiciona a vistoria para em_andamento com registro da hora de início."""
        if self.status == StatusInspecao.CANCELADA:
            raise InvarianteInspecaoException("Não é possível iniciar uma vistoria cancelada.")
        self.status = StatusInspecao.EM_ANDAMENTO
        if hora:
            self.hora_inspecao = hora
        self.atualizado_em = datetime.now(timezone.utc)

    def concluir_com_laudo(
        self,
        resultado: ResultadoInspecao,
        data_fim: date,
        relato_vistoria: str,
        irregularidades: Optional[str] = None,
        exigencias: Optional[str] = None,
        prazo_dias: int = 0,
        data_limite: Optional[date] = None,
        checklist: Optional[Dict[str, Any]] = None,
        relatorio_fotografico: Optional[List[Dict[str, Any]]] = None,
        nome_acompanhou: Optional[str] = None,
        cpf_acompanhou: Optional[str] = None,
        url_termo_pdf: Optional[str] = None,
    ) -> None:
        """Conclui o laudo da inspeção sanitária com aplicação estrita de prazos e parecer."""
        self.resultado = resultado
        self.data_fim = data_fim
        self.relato_vistoria = relato_vistoria.strip() if relato_vistoria else ""
        self.irregularidades_constatadas = irregularidades
        self.exigencias_notificadas = exigencias
        self.prazo_adequacao_dias = prazo_dias

        if resultado == ResultadoInspecao.NOTIFICADO_COM_PRAZO:
            if data_limite:
                self.data_limite_adequacao = data_limite
            elif prazo_dias > 0:
                self.data_limite_adequacao = data_fim + timedelta(days=prazo_dias)

        if checklist is not None:
            self.checklist_respostas = checklist
        if relatorio_fotografico is not None:
            self.relatorio_fotografico = relatorio_fotografico

        if nome_acompanhou:
            self.nome_pessoa_acompanhou = nome_acompanhou.strip()
        if cpf_acompanhou:
            self.cpf_pessoa_acompanhou = "".join(filter(str.isdigit, cpf_acompanhou))
        if url_termo_pdf:
            self.url_termo_assinado_pdf = url_termo_pdf

        self.status = StatusInspecao.CONCLUIDA
        self.validar_invariantes()
        self.atualizado_em = datetime.now(timezone.utc)

    def prorrogar_prazo(self, novos_dias: int, nova_data_limite: Optional[date] = None) -> None:
        """Prorroga o prazo concedido para cumprimento de notificação sanitária."""
        if self.resultado != ResultadoInspecao.NOTIFICADO_COM_PRAZO:
            raise InvarianteInspecaoException("Prorrogação de prazo só é permitida em inspeções notificadas com prazo.")
        self.prazo_adequacao_dias = novos_dias
        if nova_data_limite:
            self.data_limite_adequacao = nova_data_limite
        elif self.data_fim:
            self.data_limite_adequacao = self.data_fim + timedelta(days=novos_dias)
        self.atualizado_em = datetime.now(timezone.utc)

    def cancelar(self, justificativa: str) -> None:
        """Cancela motivadamente a inspeção."""
        if self.status == StatusInspecao.CONCLUIDA:
            raise InvarianteInspecaoException("Não é permitido cancelar uma inspeção já concluída com laudo.")
        self.status = StatusInspecao.CANCELADA
        motivo_anterior = self.relato_vistoria or ""
        self.relato_vistoria = f"[CANCELADA: {justificativa.strip()}] {motivo_anterior}".strip()
        self.atualizado_em = datetime.now(timezone.utc)

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.is_active = False
        self.atualizado_em = datetime.now(timezone.utc)
