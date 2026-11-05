import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.estabelecimentos.entities import RepresentanteLegal
from app.domain.estabelecimentos.repositories import IRepresentanteLegalRepository
from app.infrastructure.models.estabelecimento_models import RepresentanteLegalModel


class RepresentanteLegalRepository(IRepresentanteLegalRepository):
    """
    Implementação assíncrona do repositório de Representantes Legais.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: RepresentanteLegalModel) -> RepresentanteLegal:
        return RepresentanteLegal(
            id=model.id,
            nome_completo=model.nome_completo,
            cpf=model.cpf,
            rg_numero=model.rg_numero,
            rg_orgao_emissor=model.rg_orgao_emissor,
            telefone=model.telefone,
            email=model.email,
            endereco_residencial=model.endereco_residencial,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def get_by_id(self, rep_id: uuid.UUID) -> Optional[RepresentanteLegal]:
        query = select(RepresentanteLegalModel).where(
            RepresentanteLegalModel.id == rep_id,
            RepresentanteLegalModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_cpf(self, cpf: str) -> Optional[RepresentanteLegal]:
        clean_cpf = "".join(filter(str.isdigit, cpf))
        query = select(RepresentanteLegalModel).where(
            RepresentanteLegalModel.cpf == clean_cpf,
            RepresentanteLegalModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def save(self, rep: RepresentanteLegal) -> RepresentanteLegal:
        clean_cpf = "".join(filter(str.isdigit, rep.cpf))
        model = RepresentanteLegalModel(
            id=rep.id,
            nome_completo=rep.nome_completo.strip(),
            cpf=clean_cpf,
            rg_numero=rep.rg_numero.strip() if rep.rg_numero else None,
            rg_orgao_emissor=rep.rg_orgao_emissor.strip() if rep.rg_orgao_emissor else None,
            telefone=rep.telefone.strip(),
            email=rep.email.strip().lower(),
            endereco_residencial=rep.endereco_residencial.strip(),
            is_active=rep.is_active,
            is_deleted=rep.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)

    async def update(self, rep: RepresentanteLegal) -> RepresentanteLegal:
        query = select(RepresentanteLegalModel).where(
            RepresentanteLegalModel.id == rep.id,
            RepresentanteLegalModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Representante legal com ID {rep.id} não encontrado.")

        model.nome_completo = rep.nome_completo.strip()
        model.cpf = "".join(filter(str.isdigit, rep.cpf))
        model.rg_numero = rep.rg_numero.strip() if rep.rg_numero else None
        model.rg_orgao_emissor = rep.rg_orgao_emissor.strip() if rep.rg_orgao_emissor else None
        model.telefone = rep.telefone.strip()
        model.email = rep.email.strip().lower()
        model.endereco_residencial = rep.endereco_residencial.strip()
        model.is_active = rep.is_active
        model.is_deleted = rep.is_deleted

        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)
