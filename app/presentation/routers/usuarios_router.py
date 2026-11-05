import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.application.auth.dtos import (
    UsuarioCreateDTO,
    UsuarioResponseDTO,
    UsuarioUpdateDTO,
)
from app.application.auth.use_cases.cadastrar_usuario import (
    CadastrarUsuarioUseCase,
    UsuarioJaExisteException,
)
from app.domain.auth.entities import (
    LogAuditoria,
    PerfilUsuario,
    TipoOperacaoAuditoria,
    Usuario,
)
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.domain.auth.value_objects import InvalidCPFException, InvalidEmailException
from app.presentation.dependencies import (
    get_auditoria_repository,
    get_client_ip,
    get_client_user_agent,
    get_usuario_repository,
    require_roles,
)

router = APIRouter(prefix="/usuarios", tags=["Gestão de Servidores e Acesso"])

# Dependência RBAC para Administrador Master e Coordenador
require_gestor = require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR])
require_admin_only = require_roles([PerfilUsuario.ADMIN_MASTER])


@router.get(
    "",
    response_model=List[UsuarioResponseDTO],
    status_code=status.HTTP_200_OK,
    summary="Listar Servidores",
    description="Retorna a lista paginada de servidores cadastrados na VISA. Acesso restrito a Coordenadores e Administradores.",
)
async def list_usuarios(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    perfil: Optional[PerfilUsuario] = Query(None, description="Filtrar por perfil"),
    only_active: bool = Query(True, description="Listar apenas servidores ativos"),
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    _: Usuario = Depends(require_gestor),
) -> List[UsuarioResponseDTO]:
    usuarios = await usuario_repo.list_usuarios(
        skip=skip,
        limit=limit,
        perfil=perfil,
        only_active=only_active,
    )
    return [
        UsuarioResponseDTO(
            id=u.id,
            email=u.email,
            perfil=u.perfil,
            nome_completo=u.nome_completo,
            cpf=u.cpf,
            matricula=u.matricula,
            cargo=u.cargo,
            portaria_nomeacao=u.portaria_nomeacao,
            telefone_contato=u.telefone_contato,
            url_assinatura_rubrica=u.url_assinatura_rubrica,
            ultimo_login=u.ultimo_login,
            is_active=u.is_active,
            criado_em=u.criado_em,
            atualizado_em=u.atualizado_em,
        )
        for u in usuarios
    ]


@router.post(
    "",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_201_CREATED,
    summary="Cadastrar Servidor",
    description="Cadastra um novo servidor (fiscal técnico, coordenador ou digitador). Restrito a Gestores.",
)
async def create_usuario(
    dto: UsuarioCreateDTO,
    request: Request,
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_gestor),
) -> UsuarioResponseDTO:
    use_case = CadastrarUsuarioUseCase(usuario_repo, auditoria_repo)
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
    except (InvalidCPFException, InvalidEmailException) as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )
    except UsuarioJaExisteException as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )


@router.get(
    "/{usuario_id}",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Obter Servidor por ID",
    description="Consulta o perfil completo de um servidor pelo UUID.",
)
async def get_usuario_by_id(
    usuario_id: uuid.UUID,
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    _: Usuario = Depends(require_gestor),
) -> UsuarioResponseDTO:
    usuario = await usuario_repo.get_by_id(usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor com ID {usuario_id} não encontrado.",
        )
    return UsuarioResponseDTO(
        id=usuario.id,
        email=usuario.email,
        perfil=usuario.perfil,
        nome_completo=usuario.nome_completo,
        cpf=usuario.cpf,
        matricula=usuario.matricula,
        cargo=usuario.cargo,
        portaria_nomeacao=usuario.portaria_nomeacao,
        telefone_contato=usuario.telefone_contato,
        url_assinatura_rubrica=usuario.url_assinatura_rubrica,
        ultimo_login=usuario.ultimo_login,
        is_active=usuario.is_active,
        criado_em=usuario.criado_em,
        atualizado_em=usuario.atualizado_em,
    )


@router.put(
    "/{usuario_id}",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Atualizar Dados do Servidor",
    description="Atualiza os dados cadastrais, cargo ou perfil de um servidor com auditoria.",
)
async def update_usuario(
    usuario_id: uuid.UUID,
    dto: UsuarioUpdateDTO,
    request: Request,
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_gestor),
) -> UsuarioResponseDTO:
    usuario = await usuario_repo.get_by_id(usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor com ID {usuario_id} não encontrado.",
        )

    # Snapshot anterior para auditoria
    dados_anteriores = {
        "email": usuario.email,
        "perfil": usuario.perfil.value,
        "nome_completo": usuario.nome_completo,
        "cargo": usuario.cargo,
        "is_active": usuario.is_active,
    }

    if dto.email:
        clean_email = dto.email.strip().lower()
        if clean_email != usuario.email:
            existente = await usuario_repo.get_by_email(clean_email, include_deleted=False)
            if existente and existente.id != usuario.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"E-mail '{clean_email}' já está em uso por outro servidor ativo.",
                )
            usuario.email = clean_email

    if dto.perfil is not None:
        usuario.perfil = dto.perfil
    if dto.nome_completo:
        usuario.nome_completo = dto.nome_completo.strip()
    if dto.matricula is not None:
        usuario.matricula = dto.matricula.strip() if dto.matricula else None
    if dto.cargo:
        usuario.cargo = dto.cargo.strip()
    if dto.portaria_nomeacao is not None:
        usuario.portaria_nomeacao = dto.portaria_nomeacao.strip() if dto.portaria_nomeacao else None
    if dto.telefone_contato is not None:
        usuario.telefone_contato = dto.telefone_contato.strip() if dto.telefone_contato else None
    if dto.url_assinatura_rubrica is not None:
        usuario.url_assinatura_rubrica = dto.url_assinatura_rubrica
    if dto.is_active is not None:
        usuario.is_active = dto.is_active

    atualizado = await usuario_repo.update(usuario)

    # Trilha de Auditoria (UPDATE)
    log_update = LogAuditoria(
        id=uuid.uuid4(),
        tabela_afetada="usuarios",
        registro_id=str(atualizado.id),
        identificador_entidade=atualizado.email,
        operacao=TipoOperacaoAuditoria.UPDATE,
        acao="Atualização Cadastral de Servidor",
        detalhes=f"Servidor {atualizado.nome_completo} atualizado por {current_user.nome_completo}.",
        dados_anteriores=dados_anteriores,
        dados_novos={
            "email": atualizado.email,
            "perfil": atualizado.perfil.value,
            "nome_completo": atualizado.nome_completo,
            "cargo": atualizado.cargo,
            "is_active": atualizado.is_active,
        },
        usuario_id=current_user.id,
        usuario_nome=current_user.nome_completo,
        ip_origem=get_client_ip(request),
        user_agent=get_client_user_agent(request),
    )
    await auditoria_repo.registrar(log_update)

    return UsuarioResponseDTO(
        id=atualizado.id,
        email=atualizado.email,
        perfil=atualizado.perfil,
        nome_completo=atualizado.nome_completo,
        cpf=atualizado.cpf,
        matricula=atualizado.matricula,
        cargo=atualizado.cargo,
        portaria_nomeacao=atualizado.portaria_nomeacao,
        telefone_contato=atualizado.telefone_contato,
        url_assinatura_rubrica=atualizado.url_assinatura_rubrica,
        ultimo_login=atualizado.ultimo_login,
        is_active=atualizado.is_active,
        criado_em=atualizado.criado_em,
        atualizado_em=atualizado.atualizado_em,
    )


@router.delete(
    "/{usuario_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Excluir Servidor (Soft Delete)",
    description="Aplica exclusão lógica no servidor. Operação restrita ao Administrador Master.",
)
async def delete_usuario(
    usuario_id: uuid.UUID,
    request: Request,
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
    current_user: Usuario = Depends(require_admin_only),
) -> None:
    if current_user.id == usuario_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Não é permitido ao próprio administrador excluir a sua conta.",
        )

    usuario = await usuario_repo.get_by_id(usuario_id)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Servidor com ID {usuario_id} não encontrado.",
        )

    usuario.soft_delete()
    await usuario_repo.update(usuario)

    # Trilha de Auditoria (SOFT_DELETE)
    log_delete = LogAuditoria(
        id=uuid.uuid4(),
        tabela_afetada="usuarios",
        registro_id=str(usuario.id),
        identificador_entidade=usuario.email,
        operacao=TipoOperacaoAuditoria.SOFT_DELETE,
        acao="Exclusão Lógica de Servidor",
        detalhes=f"Servidor {usuario.nome_completo} desativado e marcado como excluído por {current_user.nome_completo}.",
        dados_anteriores={"is_active": True, "is_deleted": False},
        dados_novos={"is_active": False, "is_deleted": True},
        usuario_id=current_user.id,
        usuario_nome=current_user.nome_completo,
        ip_origem=get_client_ip(request),
        user_agent=get_client_user_agent(request),
    )
    await auditoria_repo.registrar(log_delete)
