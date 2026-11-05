import uuid
from typing import Optional

from app.application.fiscalizacao.dtos import (
    InspecaoConcluirDTO,
    InspecaoResponseDTO,
)
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria
from app.domain.auth.repositories import IAuditoriaRepository
from app.domain.fiscalizacao.entities import (
    InvarianteInspecaoException,
)
from app.domain.fiscalizacao.repositories import IInspecaoRepository


class InspecaoNaoEncontradaException(Exception):
    pass


class ConcluirInspecaoUseCase:
    """
    Caso de Uso responsável por lavrar o laudo oficial e concluir a inspeção sanitária:
    - Aplicação rigorosa das regras de desfecho fiscal (aprovado, notificado com prazo, auto de infração, etc.)
    - Cálculo da data limite em caso de notificação
    - Registro de evidências fotográficas e respostas de checklist sanitário
    - Registro do evento na Trilha de Auditoria
    """

    def __init__(
        self,
        inspecao_repo: IInspecaoRepository,
        auditoria_repo: Optional[IAuditoriaRepository] = None,
    ) -> None:
        self.inspecao_repo = inspecao_repo
        self.auditoria_repo = auditoria_repo

    async def execute(
        self,
        inspecao_id: uuid.UUID,
        dto: InspecaoConcluirDTO,
        usuario_id: Optional[uuid.UUID] = None,
        usuario_nome: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> InspecaoResponseDTO:
        inspecao = await self.inspecao_repo.get_by_id(inspecao_id)
        if not inspecao:
            raise InspecaoNaoEncontradaException(f"Inspeção com ID {inspecao_id} não encontrada.")

        status_anterior = inspecao.status

        # Aplicação das regras de negócio através do método de domínio da entidade
        inspecao.concluir_com_laudo(
            resultado=dto.resultado,
            data_fim=dto.data_fim,
            relato_vistoria=dto.relato_vistoria,
            irregularidades=dto.irregularidades_constatadas,
            exigencias=dto.exigencias_notificadas,
            prazo_dias=dto.prazo_adequacao_dias,
            data_limite=dto.data_limite_adequacao,
            checklist=dto.checklist_respostas,
            relatorio_fotografico=dto.relatorio_fotografico,
            nome_acompanhou=dto.nome_pessoa_acompanhou,
            cpf_acompanhou=dto.cpf_pessoa_acompanhou,
            url_termo_pdf=dto.url_termo_assinado_pdf,
        )

        atualizada = await self.inspecao_repo.update(inspecao)

        # Trilha de Auditoria da Conclusão
        if self.auditoria_repo:
            log_conclusao = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="inspecoes",
                registro_id=str(atualizada.id),
                identificador_entidade=atualizada.numero_termo,
                operacao=TipoOperacaoAuditoria.UPDATE,
                acao="Conclusão de Laudo de Inspeção Sanitária",
                detalhes=f"Termo '{atualizada.numero_termo}' concluído com resultado '{atualizada.resultado.value if atualizada.resultado else ''}'.",
                dados_anteriores={"status": status_anterior.value},
                dados_novos={
                    "status": atualizada.status.value,
                    "resultado": atualizada.resultado.value if atualizada.resultado else None,
                    "data_fim": atualizada.data_fim.isoformat() if atualizada.data_fim else None,
                    "prazo_adequacao_dias": atualizada.prazo_adequacao_dias,
                    "data_limite_adequacao": atualizada.data_limite_adequacao.isoformat() if atualizada.data_limite_adequacao else None,
                },
                usuario_id=usuario_id,
                usuario_nome=usuario_nome,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_conclusao)

        return InspecaoResponseDTO.model_validate(atualizada)
