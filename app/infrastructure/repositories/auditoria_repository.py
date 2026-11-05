import uuid
from typing import List, Optional

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.auth.entities import LogAuditoria
from app.domain.auth.repositories import IAuditoriaRepository
from app.infrastructure.models.auth_models import LogAuditoriaModel


class AuditoriaRepository(IAuditoriaRepository):
    """
    Implementação concreta e assíncrona da trilha de auditoria append-only via SQLAlchemy 2.0.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: LogAuditoriaModel) -> LogAuditoria:
        return LogAuditoria(
            id=model.id,
            tabela_afetada=model.tabela_afetada,
            registro_id=model.registro_id,
            operacao=model.operacao,
            acao=model.acao,
            identificador_entidade=model.identificador_entidade,
            detalhes=model.detalhes,
            dados_anteriores=model.dados_anteriores,
            dados_novos=model.dados_novos,
            usuario_id=model.usuario_id,
            usuario_nome=model.usuario_nome,
            usuario_matricula=model.usuario_matricula,
            ip_origem=model.ip_origem,
            user_agent=model.user_agent,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def registrar(self, log: LogAuditoria) -> LogAuditoria:
        model = LogAuditoriaModel(
            id=log.id,
            tabela_afetada=log.tabela_afetada,
            registro_id=log.registro_id,
            operacao=log.operacao,
            acao=log.acao,
            identificador_entidade=log.identificador_entidade,
            detalhes=log.detalhes,
            dados_anteriores=log.dados_anteriores,
            dados_novos=log.dados_novos,
            usuario_id=log.usuario_id,
            usuario_nome=log.usuario_nome,
            usuario_matricula=log.usuario_matricula,
            ip_origem=log.ip_origem,
            user_agent=log.user_agent,
            is_active=True,
            is_deleted=False,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)

    async def list_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        tabela: Optional[str] = None,
        usuario_id: Optional[uuid.UUID] = None,
    ) -> List[LogAuditoria]:
        query = select(LogAuditoriaModel)
        if tabela:
            query = query.where(LogAuditoriaModel.tabela_afetada == tabela)
        if usuario_id:
            query = query.where(LogAuditoriaModel.usuario_id == usuario_id)

        query = query.order_by(LogAuditoriaModel.criado_em.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_logs(
        self,
        tabela: Optional[str] = None,
        usuario_id: Optional[uuid.UUID] = None,
    ) -> int:
        query = select(func.count()).select_from(LogAuditoriaModel)
        if tabela:
            query = query.where(LogAuditoriaModel.tabela_afetada == tabela)
        if usuario_id:
            query = query.where(LogAuditoriaModel.usuario_id == usuario_id)
        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)
