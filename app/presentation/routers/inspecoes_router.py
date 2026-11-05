import uuid
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.application.fiscalizacao.dtos import (
    Indicador11ConsolidadoDTO,
    InspecaoConcluirDTO,
    InspecaoCreateDTO,
    InspecaoResponseDTO,
    NotificacaoPrazoAlertaDTO,
)
from app.application.fiscalizacao.use_cases.agendar_inspecao import (
    AgendarInspecaoUseCase,
    EstabelecimentoInvalidoException,
    FiscalInvalidoException,
    InspecaoJaExisteException,
)
from app.application.fiscalizacao.use_cases.concluir_inspecao import (
    ConcluirInspecaoUseCase,
    InspecaoNaoEncontradaException,
)
from app.domain.auth.entities import PerfilUsuario, Usuario
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.domain.fiscalizacao.entities import (
    InvarianteInspecaoException,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.domain.fiscalizacao.repositories import IInspecaoRepository
from app.domain.fiscalizacao.value_objects import InvalidNumeroTermoException
from app.presentation.dependencies import (
    get_auditoria_repository,
    get_client_ip,
    get_client_user_agent,
    get_current_active_user,
    get_estabelecimento_repository,
    get_inspecao_repository,
    get_usuario_repository,
    require_roles,
)

router = APIRouter(prefix="/inspecoes", tags=["Fiscalização e Inspeções Sanitárias"])

# RBAC: Fiscais, Coordenadores e Admin Master realizam e concluem inspeções
require_equipe_fiscal = require_roles([
    PerfilUsuario.ADMIN_MASTER,
    PerfilUsuario.COORDENADOR,
    PerfilUsuario.FISCAL_TECNICO,
])
require_leitura_geral = require_roles([
    PerfilUsuario.ADMIN_MASTER,
    PerfilUsuario.COORDENADOR,
    PerfilUsuario.FISCAL_TECNICO,
    PerfilUsuario.DIGITADOR,
])


@router.post(
    "",
    response_model=InspecaoResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Agendar / Criar Termo de Inspeção",
    description="Abre uma nova ordem de inspeção fiscalizatória vinculada a um estabelecimento e a um fiscal habilitado.",
)
async def create_inspecao(
    dto: InspecaoCreateDTO,
    request: Request,
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_equipe_fiscal),
) -> InspecaoResponseDTO:
    use_case = AgendarInspecaoUseCase(
        inspecao_repo=inspecao_repo,
        estabelecimento_repo=estabelecimento_repo,
        usuario_repo=usuario_repo,
        auditoria_repo=auditoria_repo,
    )
    ip = get_client_ip(request)
    user_agent = get_client_user_agent(request)

    try:
        return await use_case.execute(
            dto,
            autor_id=current_user.id,
            autor_nome=current_user.nome_completo,
            ip_origem=ip,
            user_agent=user_agent,
        )
    except InvalidNumeroTermoException as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(exc))
    except InspecaoJaExisteException as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    except (EstabelecimentoInvalidoException, FiscalInvalidoException, InvarianteInspecaoException) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get(
    "",
    response_model=List[InspecaoResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar Inspeções com Filtros",
    description="Retorna a listagem de termos e vistorias filtrando por estabelecimento, fiscal, motivo, status e período.",
)
async def list_inspecoes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    estabelecimento_id: Optional[uuid.UUID] = Query(None, description="Filtrar por estabelecimento"),
    fiscal_id: Optional[uuid.UUID] = Query(None, description="Filtrar por fiscal responsável"),
    motivo: Optional[TipoMotivoInspecao] = Query(None, description="Filtrar por motivo"),
    status: Optional[StatusInspecao] = Query(None, description="Filtrar por status"),
    data_inicio_de: Optional[date] = Query(None, description="Data início inicial"),
    data_inicio_ate: Optional[date] = Query(None, description="Data início final"),
    only_active: bool = Query(True, description="Apenas registros ativos"),
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    _: Usuario = Depends(require_leitura_geral),
) -> List[InspecaoResponseDTO]:
    inspecoes = await inspecao_repo.list_inspecoes(
        skip=skip,
        limit=limit,
        estabelecimento_id=estabelecimento_id,
        fiscal_id=fiscal_id,
        motivo=motivo,
        status=status,
        data_inicio_de=data_inicio_de,
        data_inicio_ate=data_inicio_ate,
        only_active=only_active,
    )
    return [InspecaoResponseDTO.model_validate(i) for i in inspecoes]


@router.get(
    "/alertas/notificacoes-pendentes",
    response_model=List[NotificacaoPrazoAlertaDTO],
    status_code=status.HTTP_200_OK,
    summary="Alertas de Notificações com Prazo a Vencer",
    description="Consulta as inspeções com resultado 'notificado_com_prazo' cuja data limite está próxima do vencimento.",
)
async def get_alertas_notificacoes(
    limite_dias: int = Query(30, ge=1, le=180, description="Janela de dias para alerta"),
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    _: Usuario = Depends(require_equipe_fiscal),
) -> List[NotificacaoPrazoAlertaDTO]:
    alertas = await inspecao_repo.obter_notificacoes_pendentes(limite_dias=limite_dias)
    return [NotificacaoPrazoAlertaDTO(**a) for a in alertas]


@router.get(
    "/indicadores/vapt",
    response_model=List[Indicador11ConsolidadoDTO],
    status_code=status.HTTP_200_OK,
    summary="Consolidação do Indicador 11 (VAPT - Saúde do Trabalhador)",
    description="Totaliza as ações de Vigilância em Ambientes e Processos de Trabalho por exercício anual.",
)
async def get_indicador_11_vapt(
    exercicio: Optional[int] = Query(None, ge=2020, le=2100, description="Ano civil de exercício"),
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    _: Usuario = Depends(require_leitura_geral),
) -> List[Indicador11ConsolidadoDTO]:
    dados = await inspecao_repo.obter_indicador_11_consolidado(exercicio=exercicio)
    return [Indicador11ConsolidadoDTO(**d) for d in dados]


@router.get(
    "/{inspecao_id}",
    response_model=InspecaoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obter Detalhes da Inspeção",
    description="Retorna o termo de inspeção completo com relato, exigências, evidências e desfecho.",
)
async def get_inspecao_by_id(
    inspecao_id: uuid.UUID,
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    _: Usuario = Depends(require_leitura_geral),
) -> InspecaoResponseDTO:
    inspecao = await inspecao_repo.get_by_id(inspecao_id)
    if not inspecao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inspeção com ID {inspecao_id} não encontrada.",
        )
    return InspecaoResponseDTO.model_validate(inspecao)


@router.patch(
    "/{inspecao_id}/concluir",
    response_model=InspecaoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Concluir Vistoria com Laudo Fiscal",
    description="Lavra o laudo sanitário, aplica o resultado (aprovado/notificado/interditado), calcula prazos e conclui a vistoria.",
)
async def concluir_inspecao(
    inspecao_id: uuid.UUID,
    dto: InspecaoConcluirDTO,
    request: Request,
    inspecao_repo: IInspecaoRepository = Depends(get_inspecao_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_equipe_fiscal),
) -> InspecaoResponseDTO:
    use_case = ConcluirInspecaoUseCase(inspecao_repo, auditoria_repo)
    ip = get_client_ip(request)
    user_agent = get_client_user_agent(request)

    try:
        return await use_case.execute(
            inspecao_id=inspecao_id,
            dto=dto,
            usuario_id=current_user.id,
            usuario_nome=current_user.nome_completo,
            ip_origem=ip,
            user_agent=user_agent,
        )
    except InspecaoNaoEncontradaException as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc))
    except InvarianteInspecaoException as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
