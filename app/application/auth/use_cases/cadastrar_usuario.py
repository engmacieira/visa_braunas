import uuid
from typing import Optional

from app.application.auth.dtos import UsuarioCreateDTO, UsuarioResponseDTO
from app.core.security import get_password_hash
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria, Usuario
from app.domain.auth.repositories import IAuditoriaRepository, IUsuarioRepository
from app.domain.auth.value_objects import CPF, Email


class UsuarioJaExisteException(Exception):
    """Lançada quando já existe usuário ativo com o mesmo CPF ou e-mail."""
    pass


class CadastrarUsuarioUseCase:
    """
    Caso de Uso responsável por cadastrar novos servidores/fiscais da VISA.
    Garante a unicidade lógica de CPF e e-mail ativos e registra trilha de auditoria.
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
        dto: UsuarioCreateDTO,
        autor_id: Optional[uuid.UUID] = None,
        autor_nome: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> UsuarioResponseDTO:
        # Validação de regras de negócio via Value Objects puros
        vo_cpf = CPF(dto.cpf)
        vo_email = Email(dto.email)

        # Checagem de colisão por e-mail ativo (compatível com índice parcial do Postgres)
        existente_email = await self.usuario_repo.get_by_email(str(vo_email), include_deleted=False)
        if existente_email:
            raise UsuarioJaExisteException(f"Já existe um usuário ativo cadastrado com o e-mail '{vo_email}'.")

        # Checagem de colisão por CPF ativo
        existente_cpf = await self.usuario_repo.get_by_cpf(vo_cpf.valor, include_deleted=False)
        if existente_cpf:
            raise UsuarioJaExisteException(f"Já existe um usuário ativo cadastrado com o CPF '{vo_cpf.formatado}'.")

        # Criptografia segura da senha
        senha_hash = get_password_hash(dto.senha)

        novo_usuario = Usuario(
            id=uuid.uuid4(),
            email=str(vo_email),
            senha_hash=senha_hash,
            perfil=dto.perfil,
            nome_completo=dto.nome_completo.strip(),
            cpf=vo_cpf.valor,
            matricula=dto.matricula.strip() if dto.matricula else None,
            cargo=dto.cargo.strip() if dto.cargo else "Fiscal Sanitário",
            portaria_nomeacao=dto.portaria_nomeacao.strip() if dto.portaria_nomeacao else None,
            telefone_contato=dto.telefone_contato.strip() if dto.telefone_contato else None,
            url_assinatura_rubrica=dto.url_assinatura_rubrica,
            is_active=True,
            is_deleted=False,
        )

        salvo = await self.usuario_repo.save(novo_usuario)

        # Trilha de Auditoria Append-Only
        if self.auditoria_repo:
            log_cadastro = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="usuarios",
                registro_id=str(salvo.id),
                identificador_entidade=salvo.email,
                operacao=TipoOperacaoAuditoria.INSERT,
                acao="Cadastro de Usuário/Servidor",
                detalhes=f"Servidor {salvo.nome_completo} ({salvo.perfil.value}) cadastrado no sistema.",
                dados_novos={
                    "id": str(salvo.id),
                    "email": salvo.email,
                    "perfil": salvo.perfil.value,
                    "nome_completo": salvo.nome_completo,
                    "cpf": salvo.cpf,
                    "cargo": salvo.cargo,
                },
                usuario_id=autor_id,
                usuario_nome=autor_nome,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_cadastro)

        return UsuarioResponseDTO(
            id=salvo.id,
            email=salvo.email,
            perfil=salvo.perfil,
            nome_completo=salvo.nome_completo,
            cpf=salvo.cpf,
            matricula=salvo.matricula,
            cargo=salvo.cargo,
            portaria_nomeacao=salvo.portaria_nomeacao,
            telefone_contato=salvo.telefone_contato,
            url_assinatura_rubrica=salvo.url_assinatura_rubrica,
            ultimo_login=salvo.ultimo_login,
            is_active=salvo.is_active,
            criado_em=salvo.criado_em,
            atualizado_em=salvo.atualizado_em,
        )
