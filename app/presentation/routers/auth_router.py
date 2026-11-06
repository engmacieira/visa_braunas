from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.application.auth.dtos import LoginDTO, TokenDTO, UsuarioResponseDTO
from app.application.auth.use_cases.autenticar_usuario import (
    AutenticarUsuarioUseCase,
    CredenciaisInvalidasException,
    UsuarioInativoException,
)
from app.core.limiter import limiter
from app.domain.auth.entities import Usuario
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.presentation.dependencies import (
    get_auditoria_repository,
    get_client_ip,
    get_client_user_agent,
    get_current_active_user,
    get_usuario_repository,
)

router = APIRouter(prefix="/auth", tags=["Autenticação e Sessão"])


@router.post(
    "/login",
    response_model=TokenDTO,
    status_code=status.HTTP_200_OK,
    summary="Autenticação do Servidor",
    description="Autentica o servidor com e-mail e senha, atualiza o último login, registra auditoria e emite token JWT.",
)
@limiter.limit("5/minute")
async def login(
    request: Request,
    dto: LoginDTO,
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
    auditoria_repo: IAuditoriaRepository = Depends(get_auditoria_repository),
) -> TokenDTO:
    use_case = AutenticarUsuarioUseCase(usuario_repo, auditoria_repo)
    ip = get_client_ip(request)
    user_agent = get_client_user_agent(request)

    try:
        return await use_case.execute(dto, ip_origem=ip, user_agent=user_agent)
    except CredenciaisInvalidasException as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        )
    except UsuarioInativoException as exc:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(exc),
        )


@router.get(
    "/me",
    response_model=UsuarioResponseDTO,
    status_code=status.HTTP_200_OK,
    summary="Dados do Usuário Autenticado",
    description="Retorna o perfil cadastral do servidor atualmente autenticado pelo token JWT.",
)
async def get_me(
    current_user: Usuario = Depends(get_current_active_user),
) -> UsuarioResponseDTO:
    return UsuarioResponseDTO(
        id=current_user.id,
        email=current_user.email,
        perfil=current_user.perfil,
        nome_completo=current_user.nome_completo,
        cpf=current_user.cpf,
        matricula=current_user.matricula,
        cargo=current_user.cargo,
        portaria_nomeacao=current_user.portaria_nomeacao,
        telefone_contato=current_user.telefone_contato,
        url_assinatura_rubrica=current_user.url_assinatura_rubrica,
        ultimo_login=current_user.ultimo_login,
        is_active=current_user.is_active,
        criado_em=current_user.criado_em,
        atualizado_em=current_user.atualizado_em,
    )
