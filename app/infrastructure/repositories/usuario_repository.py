import uuid
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth.entities import PerfilUsuario, Usuario
from app.domain.auth.repositories import IUsuarioRepository
from app.infrastructure.models.auth_models import UsuarioModel


class UsuarioRepository(IUsuarioRepository):
    """
    Implementação concreta e assíncrona do repositório de usuários via SQLAlchemy 2.0.
    Garante o isolamento entre o modelo ORM e a entidade pura de domínio.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: UsuarioModel) -> Usuario:
        return Usuario(
            id=model.id,
            email=model.email,
            senha_hash=model.senha_hash,
            perfil=model.perfil,
            nome_completo=model.nome_completo,
            cpf=model.cpf,
            matricula=model.matricula,
            cargo=model.cargo,
            portaria_nomeacao=model.portaria_nomeacao,
            telefone_contato=model.telefone_contato,
            url_assinatura_rubrica=model.url_assinatura_rubrica,
            ultimo_login=model.ultimo_login,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def get_by_id(self, user_id: uuid.UUID) -> Optional[Usuario]:
        query = select(UsuarioModel).where(
            UsuarioModel.id == user_id,
            UsuarioModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[Usuario]:
        clean_email = email.strip().lower()
        query = select(UsuarioModel).where(func.lower(UsuarioModel.email) == clean_email)
        if not include_deleted:
            query = query.where(UsuarioModel.is_deleted.is_(False))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_cpf(self, cpf: str, include_deleted: bool = False) -> Optional[Usuario]:
        clean_cpf = "".join(filter(str.isdigit, cpf))
        query = select(UsuarioModel).where(UsuarioModel.cpf == clean_cpf)
        if not include_deleted:
            query = query.where(UsuarioModel.is_deleted.is_(False))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_usuarios(
        self,
        skip: int = 0,
        limit: int = 100,
        perfil: Optional[PerfilUsuario] = None,
        only_active: bool = True,
    ) -> List[Usuario]:
        query = select(UsuarioModel).where(UsuarioModel.is_deleted.is_(False))
        if only_active:
            query = query.where(UsuarioModel.is_active.is_(True))
        if perfil:
            query = query.where(UsuarioModel.perfil == perfil)
        query = query.order_by(UsuarioModel.nome_completo.asc()).offset(skip).limit(limit)

        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_usuarios(
        self,
        perfil: Optional[PerfilUsuario] = None,
        only_active: bool = True,
    ) -> int:
        query = select(func.count()).select_from(UsuarioModel).where(UsuarioModel.is_deleted.is_(False))
        if only_active:
            query = query.where(UsuarioModel.is_active.is_(True))
        if perfil:
            query = query.where(UsuarioModel.perfil == perfil)
        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def save(self, usuario: Usuario) -> Usuario:
        model = UsuarioModel(
            id=usuario.id,
            email=usuario.email.strip().lower(),
            senha_hash=usuario.senha_hash,
            perfil=usuario.perfil,
            nome_completo=usuario.nome_completo,
            cpf="".join(filter(str.isdigit, usuario.cpf)),
            matricula=usuario.matricula,
            cargo=usuario.cargo,
            portaria_nomeacao=usuario.portaria_nomeacao,
            telefone_contato=usuario.telefone_contato,
            url_assinatura_rubrica=usuario.url_assinatura_rubrica,
            ultimo_login=usuario.ultimo_login,
            is_active=usuario.is_active,
            is_deleted=usuario.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)

    async def update(self, usuario: Usuario) -> Usuario:
        query = select(UsuarioModel).where(
            UsuarioModel.id == usuario.id,
            UsuarioModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Usuário com ID {usuario.id} não encontrado para atualização.")

        model.email = usuario.email.strip().lower()
        model.senha_hash = usuario.senha_hash
        model.perfil = usuario.perfil
        model.nome_completo = usuario.nome_completo
        model.cpf = "".join(filter(str.isdigit, usuario.cpf))
        model.matricula = usuario.matricula
        model.cargo = usuario.cargo
        model.portaria_nomeacao = usuario.portaria_nomeacao
        model.telefone_contato = usuario.telefone_contato
        model.url_assinatura_rubrica = usuario.url_assinatura_rubrica
        model.ultimo_login = usuario.ultimo_login
        model.is_active = usuario.is_active
        model.is_deleted = usuario.is_deleted

        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)
