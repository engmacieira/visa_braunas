"""
Router FastAPI: Licenciamento Sanitário e Expedição Oficial de Alvarás
"""
from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.licenciamento.dtos import (
    AlvaraSanitarioOutputDTO,
    AnalisarRequerimentoInputDTO,
    EmitirAlvaraSanitarioInputDTO,
    PaginatedAlvarasOutputDTO,
    PaginatedRequerimentosOutputDTO,
    RequerimentoDadosDeclaradosDTO,
    RequerimentoOutputDTO,
    SubmeterRequerimentoInputDTO,
)
from app.application.licenciamento.use_cases.emitir_alvara import (
    EmitirAlvaraSanitarioUseCase,
)
from app.application.licenciamento.use_cases.submeter_requerimento import (
    AnalisarRequerimentoUseCase,
    SubmeterRequerimentoUseCase,
)
from app.domain.auth.entities import Usuario
from app.domain.licenciamento.enums import StatusAlvara, StatusRequerimento
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.estabelecimento_repository import EstabelecimentoRepository
from app.infrastructure.repositories.inspecao_repository import InspecaoRepository
from app.infrastructure.repositories.licenciamento_repository import (
    AlvaraRepository,
    RequerimentoRepository,
)
from app.presentation.dependencies import get_current_active_user, require_roles

router = APIRouter(tags=["Licenciamento Sanitário e Alvarás"])


def get_submeter_requerimento_use_case(session: AsyncSession = Depends(get_db_session)) -> SubmeterRequerimentoUseCase:
    req_repo = RequerimentoRepository(session)
    estab_repo = EstabelecimentoRepository(session)
    return SubmeterRequerimentoUseCase(req_repo, estab_repo)


def get_analisar_requerimento_use_case(session: AsyncSession = Depends(get_db_session)) -> AnalisarRequerimentoUseCase:
    req_repo = RequerimentoRepository(session)
    return AnalisarRequerimentoUseCase(req_repo)


def get_emitir_alvara_use_case(session: AsyncSession = Depends(get_db_session)) -> EmitirAlvaraSanitarioUseCase:
    alvara_repo = AlvaraRepository(session)
    req_repo = RequerimentoRepository(session)
    estab_repo = EstabelecimentoRepository(session)
    insp_repo = InspecaoRepository(session)
    return EmitirAlvaraSanitarioUseCase(alvara_repo, req_repo, estab_repo, insp_repo)


# ==============================================================================
# ENDPOINTS DE REQUERIMENTOS
# ==============================================================================
@router.post(
    "/requerimentos",
    response_model=RequerimentoOutputDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Submeter Requerimento de Licenciamento Sanitário",
)
async def submeter_requerimento(
    input_dto: SubmeterRequerimentoInputDTO,
    use_case: SubmeterRequerimentoUseCase = Depends(get_submeter_requerimento_use_case),
):
    try:
        return await use_case.execute(input_dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao submeter requerimento: {str(e)}",
        )


@router.get(
    "/requerimentos",
    response_model=PaginatedRequerimentosOutputDTO,
    summary="Listar Requerimentos de Licenciamento",
)
async def listar_requerimentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filtro: Optional[StatusRequerimento] = Query(None, alias="status"),
    estabelecimento_id: Optional[uuid.UUID] = Query(None),
    apenas_fila: bool = Query(False, description="Filtra apenas pendências ativas de triagem e vistoria"),
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    req_repo = RequerimentoRepository(session)
    items, total = await req_repo.listar(
        skip=skip,
        limit=limit,
        status=status_filtro,
        estabelecimento_id=estabelecimento_id,
        apenas_fila_trabalho=apenas_fila,
    )

    result_items = []
    for req in items:
        dados_dto = None
        if req.dados_declarados:
            dados_dto = RequerimentoDadosDeclaradosDTO.model_validate(req.dados_declarados)
        result_items.append(
            RequerimentoOutputDTO(
                id=req.id,
                numero_protocolo=req.numero_protocolo.valor,
                estabelecimento_id=req.estabelecimento_id,
                tipo_solicitacao=req.tipo_solicitacao,
                status=req.status,
                alvara_anterior_numero=req.alvara_anterior_numero,
                alvara_anterior_exercicio=req.alvara_anterior_exercicio,
                data_submissao=req.data_submissao,
                origem_solicitacao=req.origem_solicitacao,
                analisado_por=req.analisado_por,
                data_inicio_analise=req.data_inicio_analise,
                data_conclusao=req.data_conclusao,
                parecer_fiscal=req.parecer_fiscal,
                motivo_indeferimento=req.motivo_indeferimento,
                dados_declarados=dados_dto,
                criado_em=req.criado_em,
            )
        )

    return PaginatedRequerimentosOutputDTO(total=total, skip=skip, limit=limit, items=result_items)


@router.get(
    "/requerimentos/{id}",
    response_model=RequerimentoOutputDTO,
    summary="Obter Detalhes do Requerimento e Petição Declarada",
)
async def obter_requerimento(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    req_repo = RequerimentoRepository(session)
    req = await req_repo.buscar_por_id(id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requerimento com ID '{id}' não encontrado.",
        )

    dados_dto = None
    if req.dados_declarados:
        dados_dto = RequerimentoDadosDeclaradosDTO.model_validate(req.dados_declarados)

    return RequerimentoOutputDTO(
        id=req.id,
        numero_protocolo=req.numero_protocolo.valor,
        estabelecimento_id=req.estabelecimento_id,
        tipo_solicitacao=req.tipo_solicitacao,
        status=req.status,
        alvara_anterior_numero=req.alvara_anterior_numero,
        alvara_anterior_exercicio=req.alvara_anterior_exercicio,
        data_submissao=req.data_submissao,
        origem_solicitacao=req.origem_solicitacao,
        analisado_por=req.analisado_por,
        data_inicio_analise=req.data_inicio_analise,
        data_conclusao=req.data_conclusao,
        parecer_fiscal=req.parecer_fiscal,
        motivo_indeferimento=req.motivo_indeferimento,
        dados_declarados=dados_dto,
        criado_em=req.criado_em,
    )


@router.patch(
    "/requerimentos/{id}/analisar",
    response_model=RequerimentoOutputDTO,
    summary="Analisar e Tramitar Requerimento de Licença",
)
async def analisar_requerimento(
    id: uuid.UUID,
    input_dto: AnalisarRequerimentoInputDTO,
    current_user: Usuario = Depends(require_roles(["admin_master", "coordenador", "fiscal_tecnico"])),
    use_case: AnalisarRequerimentoUseCase = Depends(get_analisar_requerimento_use_case),
):
    try:
        return await use_case.execute(
            requerimento_id=id,
            fiscal_id=current_user.id,
            input_dto=input_dto,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao analisar requerimento: {str(e)}",
        )


# ==============================================================================
# ENDPOINTS DE ALVARÁS SANITÁRIOS
# ==============================================================================
@router.post(
    "/alvaras/emitir",
    response_model=AlvaraSanitarioOutputDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Expedir / Emitir Alvará Sanitário Oficial",
)
async def emitir_alvara(
    input_dto: EmitirAlvaraSanitarioInputDTO,
    current_user: Usuario = Depends(require_roles(["admin_master", "coordenador", "fiscal_tecnico"])),
    use_case: EmitirAlvaraSanitarioUseCase = Depends(get_emitir_alvara_use_case),
):
    try:
        return await use_case.execute(
            fiscal_emissor_id=current_user.id,
            input_dto=input_dto,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao emitir alvará sanitário: {str(e)}",
        )


@router.get(
    "/alvaras",
    response_model=PaginatedAlvarasOutputDTO,
    summary="Listar Alvarás Sanitários Emitidos",
)
async def listar_alvaras(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    estabelecimento_id: Optional[uuid.UUID] = Query(None),
    exercicio: Optional[int] = Query(None),
    status_filtro: Optional[StatusAlvara] = Query(None, alias="status"),
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    alvara_repo = AlvaraRepository(session)
    items, total = await alvara_repo.listar(
        skip=skip,
        limit=limit,
        estabelecimento_id=estabelecimento_id,
        exercicio=exercicio,
        status=status_filtro,
    )

    result_items = [
        AlvaraSanitarioOutputDTO(
            id=a.id,
            numero_alvara=a.numero_alvara,
            exercicio=a.exercicio,
            numero_formatado=a.numero_formatado,
            estabelecimento_id=a.estabelecimento_id,
            requerimento_id=a.requerimento_id,
            inspecao_conclusiva_id=a.inspecao_conclusiva_id,
            codigo_autenticidade=a.codigo_autenticidade.valor,
            data_emissao=a.data_emissao,
            data_vencimento=a.data_vencimento,
            status=a.status,
            emitido_por=a.emitido_por,
            condicionantes_restricoes=a.condicionantes_restricoes,
            url_alvara_pdf=a.url_alvara_pdf,
            criado_em=a.criado_em,
        )
        for a in items
    ]

    return PaginatedAlvarasOutputDTO(total=total, skip=skip, limit=limit, items=result_items)


@router.get(
    "/alvaras/{id}",
    response_model=AlvaraSanitarioOutputDTO,
    summary="Obter Alvará por ID",
)
async def obter_alvara(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    alvara_repo = AlvaraRepository(session)
    alvara = await alvara_repo.buscar_por_id(id)
    if not alvara:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alvará com ID '{id}' não encontrado.",
        )

    return AlvaraSanitarioOutputDTO(
        id=alvara.id,
        numero_alvara=alvara.numero_alvara,
        exercicio=alvara.exercicio,
        numero_formatado=alvara.numero_formatado,
        estabelecimento_id=alvara.estabelecimento_id,
        requerimento_id=alvara.requerimento_id,
        inspecao_conclusiva_id=alvara.inspecao_conclusiva_id,
        codigo_autenticidade=alvara.codigo_autenticidade.valor,
        data_emissao=alvara.data_emissao,
        data_vencimento=alvara.data_vencimento,
        status=alvara.status,
        emitido_por=alvara.emitido_por,
        condicionantes_restricoes=alvara.condicionantes_restricoes,
        url_alvara_pdf=alvara.url_alvara_pdf,
        criado_em=alvara.criado_em,
    )


@router.get(
    "/alvaras/validar/{codigo_autenticidade}",
    response_model=AlvaraSanitarioOutputDTO,
    summary="Validação Pública de Autenticidade do Alvará (Ponto de QR Code)",
)
async def validar_alvara_publico(
    codigo_autenticidade: str,
    session: AsyncSession = Depends(get_db_session),
):
    alvara_repo = AlvaraRepository(session)
    alvara = await alvara_repo.buscar_por_autenticidade(codigo_autenticidade)
    if not alvara:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alvará com código de autenticidade '{codigo_autenticidade}' não encontrado ou inválido.",
        )

    return AlvaraSanitarioOutputDTO(
        id=alvara.id,
        numero_alvara=alvara.numero_alvara,
        exercicio=alvara.exercicio,
        numero_formatado=alvara.numero_formatado,
        estabelecimento_id=alvara.estabelecimento_id,
        requerimento_id=alvara.requerimento_id,
        inspecao_conclusiva_id=alvara.inspecao_conclusiva_id,
        codigo_autenticidade=alvara.codigo_autenticidade.valor,
        data_emissao=alvara.data_emissao,
        data_vencimento=alvara.data_vencimento,
        status=alvara.status,
        emitido_por=alvara.emitido_por,
        condicionantes_restricoes=alvara.condicionantes_restricoes,
        url_alvara_pdf=alvara.url_alvara_pdf,
        criado_em=alvara.criado_em,
    )
