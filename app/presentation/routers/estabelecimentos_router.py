import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi_cache.decorator import cache
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.estabelecimentos.dtos import (
    EstabelecimentoCreateDTO,
    EstabelecimentoListResponseDTO,
    EstabelecimentoResponseDTO,
    EstabelecimentoUpdateDTO,
    VinculoCNAEInputDTO,
)
from app.application.estabelecimentos.use_cases.cadastrar_estabelecimento import (
    CadastrarEstabelecimentoUseCase,
    CNAEInvalidoException,
    EstabelecimentoJaExisteException,
    RepresentanteNaoEncontradoException,
)
from app.application.estabelecimentos.use_cases.gerenciar_cnaes import (
    GerenciarCNAEsUseCase,
)
from app.domain.auth.entities import (
    LogAuditoria,
    PerfilUsuario,
    TipoOperacaoAuditoria,
    Usuario,
)
from app.domain.auth.repositories import IAuditoriaRepository
from app.domain.estabelecimentos.entities import (
    NivelRiscoSanitario,
    SituacaoCadastral,
)
from app.domain.estabelecimentos.repositories import (
    ICNAERepository,
    IEstabelecimentoRepository,
    IRepresentanteLegalRepository,
)
from app.domain.estabelecimentos.value_objects import (
    InvalidCEPException,
    InvalidCNPJException,
    InvalidCPFException,
)
from app.infrastructure.database import get_db_session
from app.infrastructure.models import ConfiguracaoInstitucionalModel
from app.presentation.dependencies import (
    get_auditoria_repository,
    get_client_ip,
    get_client_user_agent,
    get_cnae_repository,
    get_current_active_user,
    get_estabelecimento_repository,
    get_representante_repository,
    require_roles,
)

router = APIRouter(prefix="/estabelecimentos", tags=["Gestão de Estabelecimentos"])

# Permissões RBAC: Digitador e acima podem consultar e cadastrar; exclusão restrita a Gestores
require_operacional = require_roles([
    PerfilUsuario.ADMIN_MASTER,
    PerfilUsuario.COORDENADOR,
    PerfilUsuario.FISCAL_TECNICO,
    PerfilUsuario.DIGITADOR,
])
require_gestor = require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR])


@router.get(
    "/configuracao",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Obter Configuração Institucional Municipal",
    description="Retorna os parâmetros institucionais oficiais (município, secretaria, órgão de vigilância sanitária).",
)
@cache(expire=43200)
async def get_configuracao_institucional(
    session: AsyncSession = Depends(get_db_session),
    _: Usuario = Depends(get_current_active_user),
) -> Dict[str, Any]:
    stmt = select(ConfiguracaoInstitucionalModel).where(
        ConfiguracaoInstitucionalModel.singleton_key == 1,
        ConfiguracaoInstitucionalModel.is_deleted.is_(False),
    )
    res = await session.execute(stmt)
    cfg = res.scalars().first()
    if not cfg:
        return {
            "municipio": "Braúnas",
            "uf": "MG",
            "nome_prefeitura": "Prefeitura Municipal de Braúnas",
            "nome_secretaria": "Secretaria Municipal de Saúde",
            "orgao_vigilancia": "Coordenação de Vigilância em Saúde e Vigilância Sanitária",
            "cnpj_institucional": "18.303.187/0001-44",
            "logradouro": "Avenida Juscelino Kubitschek",
            "numero": "100",
            "bairro": "Centro",
            "cep": "35.189-000",
            "telefone_oficial": "(33) 3294-1100",
            "email_oficial": "visa@braunas.mg.gov.br",
        }
    return {
        "municipio": cfg.municipio,
        "uf": cfg.uf,
        "nome_prefeitura": cfg.nome_prefeitura,
        "nome_secretaria": cfg.nome_secretaria,
        "orgao_vigilancia": cfg.orgao_vigilancia,
        "cnpj_institucional": cfg.cnpj_institucional,
        "logradouro": cfg.logradouro,
        "numero": cfg.numero,
        "bairro": cfg.bairro,
        "cep": cfg.cep,
        "telefone_oficial": cfg.telefone_oficial,
        "email_oficial": cfg.email_oficial,
        "url_brasao_prefeitura": cfg.url_brasao_prefeitura,
        "url_logo_vigilancia": cfg.url_logo_vigilancia,
        "texto_padrao_rodape_alvara": cfg.texto_padrao_rodape_alvara,
    }


@router.get(
    "",
    response_model=EstabelecimentoListResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Listar Estabelecimentos",
    description="Retorna a listagem paginada de estabelecimentos com filtros por situação cadastral, grau de risco e busca textual.",
)
async def list_estabelecimentos(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    situacao: Optional[SituacaoCadastral] = Query(None, description="Filtrar por situação cadastral"),
    risco: Optional[NivelRiscoSanitario] = Query(None, description="Filtrar por nível de risco sanitário"),
    busca: Optional[str] = Query(None, description="Busca por razão social, nome fantasia, CNPJ/CPF ou inscrição municipal"),
    only_active: bool = Query(True, description="Exibir apenas registros ativos"),
    order_by: Optional[str] = Query(None, description="Campo para ordenação (ex: 'inscricao_municipal', 'razao_social', 'cnpj_cpf')"),
    order_direction: Optional[str] = Query("asc", pattern="^(asc|desc|ASC|DESC)$", description="Direção da ordenação: 'asc' ou 'desc'"),
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    _: Usuario = Depends(require_operacional),
) -> EstabelecimentoListResponseDTO:
    itens = await estabelecimento_repo.list_estabelecimentos(
        skip=skip,
        limit=limit,
        situacao=situacao,
        risco=risco,
        busca=busca,
        only_active=only_active,
        order_by=order_by,
        order_direction=order_direction,
    )
    total = await estabelecimento_repo.count_estabelecimentos(
        situacao=situacao,
        risco=risco,
        busca=busca,
        only_active=only_active,
    )

    return EstabelecimentoListResponseDTO(
        itens=[EstabelecimentoResponseDTO.model_validate(e) for e in itens],
        total=total,
        skip=skip,
        limit=limit,
    )


@router.post(
    "",
    response_model=EstabelecimentoResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Estabelecimento",
    description="Cadastra um novo estabelecimento regulado pela VISA com validação de documentos, CNAEs e apuração de risco.",
)
async def create_estabelecimento(
    dto: EstabelecimentoCreateDTO,
    request: Request,
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    cnae_repo: ICNAERepository = Depends(get_cnae_repository),
    rep_repo: IRepresentanteLegalRepository = Depends(get_representante_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_operacional),
) -> EstabelecimentoResponseDTO:
    use_case = CadastrarEstabelecimentoUseCase(
        estabelecimento_repo=estabelecimento_repo,
        cnae_repo=cnae_repo,
        rep_repo=rep_repo,
        auditoria_repo=auditoria_repo,
    )
    ip = get_client_ip(request)
    user_agent = get_client_user_agent(request)

    try:
        return await use_case.execute(
            dto,
            cadastrado_por=current_user.id,
            usuario_nome=current_user.nome_completo,
            ip_origem=ip,
            user_agent=user_agent,
        )
    except (InvalidCNPJException, InvalidCPFException, InvalidCEPException) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except EstabelecimentoJaExisteException as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    except (CNAEInvalidoException, RepresentanteNaoEncontradoException) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.get(
    "/{estabelecimento_id}",
    response_model=EstabelecimentoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obter Detalhes do Estabelecimento",
    description="Retorna a ficha cadastral integral do estabelecimento, incluindo CNAEs, representante legal e situação do alvará.",
)
async def get_estabelecimento_by_id(
    estabelecimento_id: uuid.UUID,
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    _: Usuario = Depends(require_operacional),
) -> EstabelecimentoResponseDTO:
    estab = await estabelecimento_repo.get_by_id(estabelecimento_id)
    if not estab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estabelecimento com ID {estabelecimento_id} não encontrado.",
        )
    return EstabelecimentoResponseDTO.model_validate(estab)


@router.put(
    "/{estabelecimento_id}",
    response_model=EstabelecimentoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualizar Dados do Estabelecimento",
    description="Atualiza endereço, contatos e dados operacionais de um estabelecimento cadastrado.",
)
async def update_estabelecimento(
    estabelecimento_id: uuid.UUID,
    dto: EstabelecimentoUpdateDTO,
    request: Request,
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_operacional),
) -> EstabelecimentoResponseDTO:
    estab = await estabelecimento_repo.get_by_id(estabelecimento_id)
    if not estab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estabelecimento com ID {estabelecimento_id} não encontrado.",
        )

    # Aplicação de atualizações
    if dto.razao_social:
        estab.razao_social = dto.razao_social.strip()
    if dto.nome_fantasia is not None:
        estab.nome_fantasia = dto.nome_fantasia.strip() if dto.nome_fantasia else None
    if dto.inscricao_municipal is not None:
        estab.inscricao_municipal = dto.inscricao_municipal.strip() if dto.inscricao_municipal else None
    if dto.natureza_juridica is not None:
        estab.natureza_juridica = dto.natureza_juridica.strip() if dto.natureza_juridica else None
    if dto.cep:
        estab.cep = dto.cep
    if dto.logradouro:
        estab.logradouro = dto.logradouro.strip()
    if dto.numero:
        estab.numero = dto.numero.strip()
    if dto.complemento is not None:
        estab.complemento = dto.complemento.strip() if dto.complemento else None
    if dto.bairro:
        estab.bairro = dto.bairro.strip()
    if dto.municipio:
        estab.municipio = dto.municipio.strip()
    if dto.uf:
        estab.uf = dto.uf.strip().upper()
    if dto.ponto_referencia is not None:
        estab.ponto_referencia = dto.ponto_referencia
    if dto.acesso_compartilhado_residencia is not None:
        estab.acesso_compartilhado_residencia = dto.acesso_compartilhado_residencia
    if dto.telefone_fixo is not None:
        estab.telefone_fixo = dto.telefone_fixo
    if dto.telefone_celular:
        estab.telefone_celular = dto.telefone_celular.strip()
    if dto.email:
        estab.email = dto.email.strip().lower()
    if dto.competencia_fiscalizacao:
        estab.competencia_fiscalizacao = dto.competencia_fiscalizacao
    if dto.situacao_estabelecimento:
        estab.situacao_estabelecimento = dto.situacao_estabelecimento
    if dto.observacoes_baixa is not None:
        estab.observacoes_baixa = dto.observacoes_baixa
    if dto.horario_funcionamento is not None:
        estab.horario_funcionamento = dto.horario_funcionamento
    if dto.fonte_abastecimento_agua is not None:
        estab.fonte_abastecimento_agua = dto.fonte_abastecimento_agua
    if dto.possui_reservatorio_proprio is not None:
        estab.possui_reservatorio_proprio = dto.possui_reservatorio_proprio
    if dto.capacidade_reservatorio_litros is not None:
        estab.capacidade_reservatorio_litros = dto.capacidade_reservatorio_litros
    if dto.representante_legal_id is not None:
        estab.representante_legal_id = dto.representante_legal_id

    atualizado = await estabelecimento_repo.update(estab)

    # Trilha de Auditoria
    log_up = LogAuditoria(
        id=uuid.uuid4(),
        tabela_afetada="estabelecimentos",
        registro_id=str(atualizado.id),
        identificador_entidade=atualizado.razao_social,
        operacao=TipoOperacaoAuditoria.UPDATE,
        acao="Atualização Cadastral de Estabelecimento",
        detalhes=f"Dados do estabelecimento '{atualizado.razao_social}' atualizados.",
        usuario_id=current_user.id,
        usuario_nome=current_user.nome_completo,
        ip_origem=get_client_ip(request),
        user_agent=get_client_user_agent(request),
    )
    await auditoria_repo.registrar(log_up)

    return EstabelecimentoResponseDTO.model_validate(atualizado)


@router.put(
    "/{estabelecimento_id}/cnaes",
    response_model=EstabelecimentoResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Gerenciar CNAEs do Estabelecimento",
    description="Substitui a grade de atividades CNAE, valida a obrigatoriedade de 1 principal e recalcula o risco sanitário.",
)
async def update_estabelecimento_cnaes(
    estabelecimento_id: uuid.UUID,
    cnaes_input: List[VinculoCNAEInputDTO],
    request: Request,
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    cnae_repo: ICNAERepository = Depends(get_cnae_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_operacional),
) -> EstabelecimentoResponseDTO:
    use_case = GerenciarCNAEsUseCase(estabelecimento_repo, cnae_repo, auditoria_repo)
    ip = get_client_ip(request)
    user_agent = get_client_user_agent(request)

    try:
        return await use_case.execute(
            estabelecimento_id=estabelecimento_id,
            cnaes_input=cnaes_input,
            usuario_id=current_user.id,
            usuario_nome=current_user.nome_completo,
            ip_origem=ip,
            user_agent=user_agent,
        )
    except (CNAEInvalidoException, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        )


@router.delete(
    "/{estabelecimento_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir Estabelecimento (Soft Delete)",
    description="Aplica exclusão lógica e inativação no estabelecimento. Restrito a Gestores.",
)
async def delete_estabelecimento(
    estabelecimento_id: uuid.UUID,
    request: Request,
    estabelecimento_repo: IEstabelecimentoRepository = Depends(get_estabelecimento_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_gestor),
) -> None:
    estab = await estabelecimento_repo.get_by_id(estabelecimento_id)
    if not estab:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Estabelecimento com ID {estabelecimento_id} não encontrado.",
        )

    estab.soft_delete()
    await estabelecimento_repo.update(estab)

    # Trilha de Auditoria (SOFT_DELETE)
    log_del = LogAuditoria(
        id=uuid.uuid4(),
        tabela_afetada="estabelecimentos",
        registro_id=str(estab.id),
        identificador_entidade=estab.razao_social,
        operacao=TipoOperacaoAuditoria.SOFT_DELETE,
        acao="Exclusão Lógica de Estabelecimento",
        detalhes=f"Estabelecimento '{estab.razao_social}' desativado por {current_user.nome_completo}.",
        dados_anteriores={"is_active": True, "is_deleted": False},
        dados_novos={"is_active": False, "is_deleted": True},
        usuario_id=current_user.id,
        usuario_nome=current_user.nome_completo,
        ip_origem=get_client_ip(request),
        user_agent=get_client_user_agent(request),
    )
    await auditoria_repo.registrar(log_del)
