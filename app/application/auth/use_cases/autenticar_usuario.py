import uuid
from typing import Optional

from app.application.auth.dtos import LoginDTO, TokenDTO
from app.core.config import settings
from app.core.security import create_access_token, verify_password
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository


class CredenciaisInvalidasException(Exception):
    """Lançada quando o e-mail ou senha fornecidos estão incorretos."""
    pass


class UsuarioInativoException(Exception):
    """Lançada quando o usuário está bloqueado ou desativado."""
    pass


class AutenticarUsuarioUseCase:
    """
    Caso de Uso responsável por autenticar o servidor, registrar trilha de auditoria
    e gerar o token JWT com perfil RBAC.
    """

    def __init__(
        self,
        usuario_repo: IUsuarioRepository,
        auditoria_repo: Optional[IAuditoriaRepository] = None,
    ) -> None:
        self.usuario_repo = usuario_repo
        self.auditoria_repo = auditoria_repo

    async def execute(
        self,
        dto: LoginDTO,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> TokenDTO:
        usuario = await self.usuario_repo.get_by_email(dto.email, include_deleted=False)

        if not usuario:
            raise CredenciaisInvalidasException("E-mail ou senha incorretos.")

        if not verify_password(dto.senha, usuario.senha_hash):
            raise CredenciaisInvalidasException("E-mail ou senha incorretos.")

        if not usuario.is_active or usuario.is_deleted:
            raise UsuarioInativoException("Usuário desativado ou excluído. Contate a coordenação da VISA.")

        # Atualiza a data do último login
        usuario.registrar_login()
        await self.usuario_repo.update(usuario)

        # Trilha de auditoria (Login com Sucesso)
        if self.auditoria_repo:
            log_login = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="usuarios",
                registro_id=str(usuario.id),
                identificador_entidade=usuario.email,
                operacao=TipoOperacaoAuditoria.LOGIN,
                acao="Autenticação com Sucesso",
                detalhes=f"Servidor {usuario.nome_completo} realizou login com perfil {usuario.perfil.value}.",
                usuario_id=usuario.id,
                usuario_nome=usuario.nome_completo,
                usuario_matricula=usuario.matricula,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_login)

        # Geração do Token JWT com Perfil para RBAC
        token_data = {
            "sub": str(usuario.id),
            "perfil": usuario.perfil.value,
            "email": usuario.email,
            "nome": usuario.nome_completo,
        }
        access_token = create_access_token(token_data)

        return TokenDTO(
            access_token=access_token,
            token_type="Bearer",
            expires_in_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
            usuario_id=usuario.id,
            perfil=usuario.perfil,
            nome_completo=usuario.nome_completo,
        )
