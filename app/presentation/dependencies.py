import uuid
from typing import Callable, List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token
from app.domain.auth.entities import PerfilUsuario, Usuario
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.domain.estabelecimentos.repositories import (
    ICNAERepository,
    IEstabelecimentoRepository,
    IRepresentanteLegalRepository,
)
from app.domain.fiscalizacao.repositories import IInspecaoRepository
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.auditoria_repository import AuditoriaRepository
from app.infrastructure.repositories.cnae_repository import CNAERepository
from app.infrastructure.repositories.estabelecimento_repository import EstabelecimentoRepository
from app.infrastructure.repositories.inspecao_repository import InspecaoRepository
from app.infrastructure.repositories.representante_repository import RepresentanteLegalRepository
from app.infrastructure.repositories.usuario_repository import UsuarioRepository

# Esquema de autenticação via Bearer Token
security_bearer = HTTPBearer(auto_error=False)


async def get_usuario_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IUsuarioRepository:
    """Fornece a instância do repositório de usuários."""
    return UsuarioRepository(session)


async def get_auditoria_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IAuditoriaRepository:
    """Fornece a instância do repositório da trilha de auditoria."""
    return AuditoriaRepository(session)


async def get_estabelecimento_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IEstabelecimentoRepository:
    """Fornece a instância do repositório de estabelecimentos."""
    return EstabelecimentoRepository(session)


async def get_cnae_repository(
    session: AsyncSession = Depends(get_db_session),
) -> ICNAERepository:
    """Fornece a instância do repositório de CNAEs."""
    return CNAERepository(session)


async def get_representante_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IRepresentanteLegalRepository:
    """Fornece a instância do repositório de representantes legais."""
    return RepresentanteLegalRepository(session)


async def get_inspecao_repository(
    session: AsyncSession = Depends(get_db_session),
) -> IInspecaoRepository:
    """Fornece a instância do repositório de inspeções e termos fiscais."""
    return InspecaoRepository(session)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
    usuario_repo: IUsuarioRepository = Depends(get_usuario_repository),
) -> Usuario:
    """
    Decodifica o token JWT do cabeçalho de autorização e carrega a entidade do usuário.
    Lança HTTPException 401 caso o token seja inválido, expirado ou ausente.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Autenticação necessária. Token de acesso ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido ou expirado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id_str = payload.get("sub")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido. Identificador de usuário ausente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Identificador de usuário inválido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    usuario = await usuario_repo.get_by_id(user_uuid)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário associado ao token não foi encontrado.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return usuario


async def get_current_active_user(
    current_user: Usuario = Depends(get_current_user),
) -> Usuario:
    """
    Garante que o usuário autenticado esteja ativo e não tenha sofrido exclusão lógica.
    """
    if not current_user.is_active or current_user.is_deleted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuário inativo ou excluído do sistema VigiMinas.",
        )
    return current_user


def require_roles(allowed_roles: List[PerfilUsuario]) -> Callable:
    """
    Fábrica de dependências RBAC: Restringe o acesso às rotas apenas aos perfis especificados.
    """
    async def role_checker(
        current_user: Usuario = Depends(get_current_active_user),
    ) -> Usuario:
        if current_user.perfil not in allowed_roles:
            perfis_permitidos = ", ".join([r.value for r in allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Acesso negado. Esta operação exige um dos seguintes perfis: [{perfis_permitidos}].",
            )
        return current_user

    return role_checker


def get_client_ip(request: Request) -> Optional[str]:
    """Extrai o IP de origem da requisição HTTP."""
    if request.headers.get("x-forwarded-for"):
        return request.headers.get("x-forwarded-for").split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def get_client_user_agent(request: Request) -> Optional[str]:
    """Extrai o User-Agent da requisição HTTP."""
    return request.headers.get("user-agent")
