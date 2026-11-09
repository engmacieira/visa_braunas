"""
Router FastAPI: Ouvidoria e Gestão de Denúncias Sanitárias
"""
from typing import List, Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.ouvidoria.dtos import (
    ConcluirDenunciaInputDTO,
    DenunciaOutputDTO,
    DenunciaPublicaOutputDTO,
    DespacharDenunciaInputDTO,
    FilaTrabalhoDenunciaOutputDTO,
    PaginatedDenunciasOutputDTO,
    RegistrarDenunciaInputDTO,
)
from app.application.ouvidoria.use_cases.gerenciar_denuncia import (
    ConcluirDenunciaUseCase,
    DespacharDenunciaUseCase,
    RegistrarDenunciaUseCase,
)
from app.domain.auth.entities import PerfilUsuario, Usuario
from app.domain.ouvidoria.enums import GravidadeDenuncia, StatusDenuncia
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.estabelecimento_repository import EstabelecimentoRepository
from app.infrastructure.repositories.ouvidoria_repository import DenunciaRepository
from app.infrastructure.repositories.usuario_repository import UsuarioRepository
from app.presentation.dependencies import get_current_active_user, require_roles

router = APIRouter(prefix="/denuncias", tags=["Ouvidoria e Denúncias Sanitárias"])


def get_registrar_denuncia_use_case(session: AsyncSession = Depends(get_db_session)) -> RegistrarDenunciaUseCase:
    denuncia_repo = DenunciaRepository(session)
    estab_repo = EstabelecimentoRepository(session)
    return RegistrarDenunciaUseCase(denuncia_repo, estab_repo)


def get_despachar_denuncia_use_case(session: AsyncSession = Depends(get_db_session)) -> DespacharDenunciaUseCase:
    denuncia_repo = DenunciaRepository(session)
    usuario_repo = UsuarioRepository(session)
    return DespacharDenunciaUseCase(denuncia_repo, usuario_repo)


def get_concluir_denuncia_use_case(session: AsyncSession = Depends(get_db_session)) -> ConcluirDenunciaUseCase:
    denuncia_repo = DenunciaRepository(session)
    return ConcluirDenunciaUseCase(denuncia_repo)


@router.post(
    "",
    response_model=DenunciaOutputDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Registrar Nova Denúncia Sanitária (Anônima ou Identificada)",
)
async def registrar_denuncia(
    input_dto: RegistrarDenunciaInputDTO,
    use_case: RegistrarDenunciaUseCase = Depends(get_registrar_denuncia_use_case),
):
    try:
        return await use_case.execute(input_dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao registrar denúncia: {str(e)}",
        )


@router.get(
    "/consultar/{numero_protocolo}",
    response_model=DenunciaPublicaOutputDTO,
    summary="Consulta Pública do Status da Denúncia por Protocolo (Sigilo Absoluto)",
)
async def consultar_protocolo_publico(
    numero_protocolo: str,
    session: AsyncSession = Depends(get_db_session),
):
    repo = DenunciaRepository(session)
    denuncia = await repo.buscar_por_protocolo(numero_protocolo)
    if not denuncia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Denúncia com protocolo '{numero_protocolo}' não encontrada.",
        )

    return DenunciaPublicaOutputDTO(
        numero_protocolo=denuncia.numero_protocolo.valor,
        data_recebimento=denuncia.data_recebimento,
        status=denuncia.status,
        gravidade=denuncia.gravidade,
        local_denunciado_identificacao=denuncia.local_denunciado_identificacao,
        resposta_ao_denunciante=denuncia.resposta_ao_denunciante,
        data_encerramento=denuncia.data_encerramento,
    )


@router.get(
    "/fila-trabalho",
    response_model=List[FilaTrabalhoDenunciaOutputDTO],
    summary="Fila Priorizada de Denúncias a Apurar (Painel de Gestão)",
)
async def listar_fila_trabalho(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR, PerfilUsuario.FISCAL_TECNICO])),
):
    repo = DenunciaRepository(session)
    items = await repo.listar_fila_trabalho(skip=skip, limit=limit)
    return [FilaTrabalhoDenunciaOutputDTO(**item) for item in items]


@router.get(
    "",
    response_model=PaginatedDenunciasOutputDTO,
    summary="Listar Denúncias com Filtros e Paginação",
)
async def listar_denuncias(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    status_filtro: Optional[StatusDenuncia] = Query(None, alias="status"),
    gravidade: Optional[GravidadeDenuncia] = Query(None),
    fiscal_id: Optional[uuid.UUID] = Query(None),
    estabelecimento_id: Optional[uuid.UUID] = Query(None),
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    repo = DenunciaRepository(session)
    items, total = await repo.listar(
        skip=skip,
        limit=limit,
        status=status_filtro,
        gravidade=gravidade,
        fiscal_id=fiscal_id,
        estabelecimento_id=estabelecimento_id,
    )

    result_items = [
        DenunciaOutputDTO(
            id=d.id,
            numero_protocolo=d.numero_protocolo.valor,
            data_recebimento=d.data_recebimento,
            origem=d.origem,
            gravidade=d.gravidade,
            status=d.status,
            estabelecimento_id=d.estabelecimento_id,
            local_denunciado_identificacao=d.local_denunciado_identificacao,
            logradouro=d.logradouro,
            numero=d.numero,
            bairro=d.bairro,
            ponto_referencia=d.ponto_referencia,
            denunciante_anonimo=d.denunciante_anonimo,
            denunciante_nome=d.denunciante_nome,
            denunciante_telefone=d.denunciante_telefone,
            denunciante_email=d.denunciante_email,
            url_anexos_evidencias=d.url_anexos_evidencias,
            fiscal_designado_id=d.fiscal_designado_id,
            despacho_coordenacao=d.despacho_coordenacao,
            conclusao_apuracao=d.conclusao_apuracao,
            resposta_ao_denunciante=d.resposta_ao_denunciante,
            data_encerramento=d.data_encerramento,
            finalizado_por=d.finalizado_por,
            criado_em=d.criado_em,
        )
        for d in items
    ]

    return PaginatedDenunciasOutputDTO(total=total, skip=skip, limit=limit, items=result_items)


@router.get(
    "/{id}",
    response_model=DenunciaOutputDTO,
    summary="Obter Detalhes da Denúncia por ID",
)
async def obter_denuncia(
    id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
):
    repo = DenunciaRepository(session)
    denuncia = await repo.buscar_por_id(id)
    if not denuncia:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Denúncia com ID '{id}' não encontrada.",
        )

    return DenunciaOutputDTO(
        id=denuncia.id,
        numero_protocolo=denuncia.numero_protocolo.valor,
        data_recebimento=denuncia.data_recebimento,
        origem=denuncia.origem,
        gravidade=denuncia.gravidade,
        status=denuncia.status,
        estabelecimento_id=denuncia.estabelecimento_id,
        local_denunciado_identificacao=denuncia.local_denunciado_identificacao,
        logradouro=denuncia.logradouro,
        numero=denuncia.numero,
        bairro=denuncia.bairro,
        ponto_referencia=denuncia.ponto_referencia,
        denunciante_anonimo=denuncia.denunciante_anonimo,
        denunciante_nome=denuncia.denunciante_nome,
        denunciante_telefone=denuncia.denunciante_telefone,
        denunciante_email=denuncia.denunciante_email,
        url_anexos_evidencias=denuncia.url_anexos_evidencias,
        fiscal_designado_id=denuncia.fiscal_designado_id,
        despacho_coordenacao=denuncia.despacho_coordenacao,
        conclusao_apuracao=denuncia.conclusao_apuracao,
        resposta_ao_denunciante=denuncia.resposta_ao_denunciante,
        data_encerramento=denuncia.data_encerramento,
        finalizado_por=denuncia.finalizado_por,
        criado_em=denuncia.criado_em,
    )


@router.patch(
    "/{id}/despacho",
    response_model=DenunciaOutputDTO,
    summary="Despachar Denúncia e Designar Fiscal",
)
async def despachar_denuncia(
    id: uuid.UUID,
    input_dto: DespacharDenunciaInputDTO,
    current_user: Usuario = Depends(require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR])),
    use_case: DespacharDenunciaUseCase = Depends(get_despachar_denuncia_use_case),
):
    try:
        return await use_case.execute(denuncia_id=id, input_dto=input_dto)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao despachar denúncia: {str(e)}",
        )


@router.patch(
    "/{id}/concluir",
    response_model=DenunciaOutputDTO,
    summary="Concluir e Encerrar Denúncia Sanitária",
)
async def concluir_denuncia(
    id: uuid.UUID,
    input_dto: ConcluirDenunciaInputDTO,
    current_user: Usuario = Depends(require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR, PerfilUsuario.FISCAL_TECNICO])),
    use_case: ConcluirDenunciaUseCase = Depends(get_concluir_denuncia_use_case),
):
    try:
        return await use_case.execute(
            denuncia_id=id,
            finalizado_por_id=current_user.id,
            input_dto=input_dto,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro interno ao concluir denúncia: {str(e)}",
        )
