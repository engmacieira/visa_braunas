import uuid
from typing import List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.estabelecimentos.entities import CNAE, NivelRiscoCNAE
from app.domain.estabelecimentos.repositories import ICNAERepository
from app.infrastructure.models.estabelecimento_models import CnaeModel


class CNAERepository(ICNAERepository):
    """
    Implementação assíncrona do repositório de CNAEs.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: CnaeModel) -> CNAE:
        return CNAE(
            id=model.id,
            codigo=model.codigo,
            descricao=model.descricao,
            grau_risco_padrao=model.grau_risco_padrao,
            competencia_padrao=model.competencia_padrao,
            exige_rt=model.exige_rt,
            exige_projeto_arquitetonico=model.exige_projeto_arquitetonico,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def get_by_id(self, cnae_id: uuid.UUID) -> Optional[CNAE]:
        query = select(CnaeModel).where(CnaeModel.id == cnae_id, CnaeModel.is_deleted.is_(False))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_codigo(self, codigo: str) -> Optional[CNAE]:
        clean_cod = codigo.strip()
        query = select(CnaeModel).where(CnaeModel.codigo == clean_cod, CnaeModel.is_deleted.is_(False))
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_cnaes(
        self,
        skip: int = 0,
        limit: int = 50,
        busca: Optional[str] = None,
        risco: Optional[NivelRiscoCNAE] = None,
    ) -> List[CNAE]:
        query = select(CnaeModel).where(CnaeModel.is_deleted.is_(False), CnaeModel.is_active.is_(True))

        if busca:
            termo = f"%{busca.strip()}%"
            query = query.where(or_(CnaeModel.codigo.ilike(termo), CnaeModel.descricao.ilike(termo)))

        if risco:
            query = query.where(CnaeModel.grau_risco_padrao == risco)

        query = query.order_by(CnaeModel.codigo.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        models = result.scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_cnaes(
        self,
        busca: Optional[str] = None,
        risco: Optional[NivelRiscoCNAE] = None,
    ) -> int:
        query = select(func.count()).select_from(CnaeModel).where(
            CnaeModel.is_deleted.is_(False), CnaeModel.is_active.is_(True)
        )
        if busca:
            termo = f"%{busca.strip()}%"
            query = query.where(or_(CnaeModel.codigo.ilike(termo), CnaeModel.descricao.ilike(termo)))
        if risco:
            query = query.where(CnaeModel.grau_risco_padrao == risco)

        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def save(self, cnae: CNAE) -> CNAE:
        model = CnaeModel(
            id=cnae.id,
            codigo=cnae.codigo.strip(),
            descricao=cnae.descricao.strip(),
            grau_risco_padrao=cnae.grau_risco_padrao,
            competencia_padrao=cnae.competencia_padrao,
            exige_rt=cnae.exige_rt,
            exige_projeto_arquitetonico=cnae.exige_projeto_arquitetonico,
            is_active=cnae.is_active,
            is_deleted=cnae.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)
