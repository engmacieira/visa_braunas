import uuid
from typing import Optional

from app.application.fiscalizacao.dtos import (
    InspecaoCreateDTO,
    InspecaoResponseDTO,
)
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.domain.fiscalizacao.entities import (
    Inspecao,
    InvarianteInspecaoException,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.domain.fiscalizacao.repositories import IInspecaoRepository
from app.domain.fiscalizacao.value_objects import NumeroTermo


class InspecaoJaExisteException(Exception):
    pass


class EstabelecimentoInvalidoException(Exception):
    pass


class FiscalInvalidoException(Exception):
    pass


class AgendarInspecaoUseCase:
    """
    Caso de Uso responsável por agendar ou abrir uma nova inspeção sanitária/vistoria de campo:
    - Validação de formato e unicidade do número do termo
    - Verificação de existência e atividade do estabelecimento
    - Verificação de habilitação legal do fiscal responsável
    - Validação de preenchimento dos campos obrigatórios do Indicador 11 (VAPT)
    - Registro na Trilha de Auditoria
    """

    def __init__(
        self,
        inspecao_repo: IInspecaoRepository,
        estabelecimento_repo: IEstabelecimentoRepository,
        usuario_repo: IUsuarioRepository,
        auditoria_repo: Optional[IAuditoriaRepository] = None,
    ) -> None:
        self.inspecao_repo = inspecao_repo
        self.estabelecimento_repo = estabelecimento_repo
        self.usuario_repo = usuario_repo
        self.auditoria_repo = auditoria_repo

    async def execute(
        self,
        dto: InspecaoCreateDTO,
        autor_id: Optional[uuid.UUID] = None,
        autor_nome: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> InspecaoResponseDTO:
        # 1. Validação do Número do Termo e Unicidade
        vo_termo = NumeroTermo(dto.numero_termo)
        existente = await self.inspecao_repo.get_by_numero_termo(vo_termo.valor)
        if existente:
            raise InspecaoJaExisteException(
                f"Já existe uma inspeção ativa registrada com o número de termo '{vo_termo.valor}'."
            )

        # 2. Verificação do Estabelecimento
        estabelecimento = await self.estabelecimento_repo.get_by_id(dto.estabelecimento_id)
        if not estabelecimento or not estabelecimento.is_active or estabelecimento.is_deleted:
            raise EstabelecimentoInvalidoException(
                "O estabelecimento informado não foi encontrado ou está inativo no sistema."
            )

        # 3. Verificação do Fiscal Responsável
        fiscal = await self.usuario_repo.get_by_id(dto.fiscal_responsavel_id)
        if not fiscal or not fiscal.is_active or fiscal.is_deleted:
            raise FiscalInvalidoException("O fiscal responsável informado não foi encontrado ou está inativo.")

        if not fiscal.pode_assinar_termos():
            raise FiscalInvalidoException(
                f"O servidor {fiscal.nome_completo} ({fiscal.perfil.value}) não possui competência legal para assinar termos fiscais."
            )

        # 4. Criação da Entidade Pura de Domínio
        nova_inspecao = Inspecao(
            id=uuid.uuid4(),
            numero_termo=vo_termo.valor,
            estabelecimento_id=dto.estabelecimento_id,
            fiscal_responsavel_id=dto.fiscal_responsavel_id,
            motivo=dto.motivo,
            status=StatusInspecao.AGENDADA,
            data_inicio=dto.data_inicio,
            data_agendamento=dto.data_agendamento or dto.data_inicio,
            hora_inspecao=dto.hora_inspecao,
            fiscais_acompanhantes=dto.fiscais_acompanhantes.strip() if dto.fiscais_acompanhantes else None,
            requerimento_id=dto.requerimento_id,
            denuncia_id=dto.denuncia_id,
            nome_local_trabalho=dto.nome_local_trabalho.strip() if dto.nome_local_trabalho else None,
            principais_riscos_identificados=dto.principais_riscos_identificados.strip() if dto.principais_riscos_identificados else None,
            recomendacoes_orientacoes=dto.recomendacoes_orientacoes.strip() if dto.recomendacoes_orientacoes else None,
        )

        salvo = await self.inspecao_repo.save(nova_inspecao)

        # 5. Trilha de Auditoria
        if self.auditoria_repo:
            log_agendamento = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="inspecoes",
                registro_id=str(salvo.id),
                identificador_entidade=salvo.numero_termo,
                operacao=TipoOperacaoAuditoria.INSERT,
                acao="Agendamento de Inspeção Sanitária",
                detalhes=f"Termo '{salvo.numero_termo}' agendado para o estabelecimento '{estabelecimento.razao_social}' sob motivo '{salvo.motivo.value}'.",
                dados_novos={
                    "id": str(salvo.id),
                    "numero_termo": salvo.numero_termo,
                    "estabelecimento_id": str(salvo.estabelecimento_id),
                    "fiscal_responsavel_id": str(salvo.fiscal_responsavel_id),
                    "motivo": salvo.motivo.value,
                    "data_inicio": salvo.data_inicio.isoformat(),
                },
                usuario_id=autor_id,
                usuario_nome=autor_nome,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_agendamento)

        return InspecaoResponseDTO.model_validate(salvo)
