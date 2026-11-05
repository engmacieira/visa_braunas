from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.application.estabelecimentos.dtos import CNAEResponseDTO
from app.domain.auth.entities import Usuario
from app.domain.estabelecimentos.entities import NivelRiscoCNAE
from app.domain.estabelecimentos.repositories import ICNAERepository
from app.presentation.dependencies import (
    get_cnae_repository,
    get_current_active_user,
)

router = APIRouter(prefix="/cnaes", tags=["Catálogo de CNAEs e Riscos"])


@router.get(
    "",
    response_model=List[CNAEResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar / Buscar CNAEs",
    description="Retorna a lista paginada de CNAEs com suporte a busca rápida por código ou descrição (autocomplete).",
)
async def list_cnaes(
    busca: Optional[str] = Query(None, description="Termo para busca em código ou descrição"),
    risco: Optional[NivelRiscoCNAE] = Query(None, description="Filtrar por grau de risco"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    cnae_repo: ICNAERepository = Depends(get_cnae_repository),
    _: Usuario = Depends(get_current_active_user),
) -> List[CNAEResponseDTO]:
    cnaes = await cnae_repo.list_cnaes(skip=skip, limit=limit, busca=busca, risco=risco)
    return [CNAEResponseDTO.model_validate(c) for c in cnaes]


@router.get(
    "/{codigo}",
    response_model=CNAEResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Consultar CNAE por Código",
    description="Retorna os parâmetros sanitários regulatórios (grau de risco, exigência de RT/projeto) de um CNAE específico.",
)
async def get_cnae_by_codigo(
    codigo: str,
    cnae_repo: ICNAERepository = Depends(get_cnae_repository),
    _: Usuario = Depends(get_current_active_user),
) -> CNAEResponseDTO:
    cnae = await cnae_repo.get_by_codigo(codigo)
    if not cnae:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"CNAE com o código '{codigo}' não encontrado.",
        )
    return CNAEResponseDTO.model_validate(cnae)
