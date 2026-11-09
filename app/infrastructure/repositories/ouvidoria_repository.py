"""
Repositório Concreto SQLAlchemy 2.0: Ouvidoria e Denúncias Sanitárias
"""
from typing import Any, Dict, List, Optional, Tuple
import uuid

from sqlalchemy import case, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.ouvidoria.entities import (
    CanalDenuncia,
    Denuncia,
    GravidadeDenuncia,
    NumeroProtocoloDenuncia,
    StatusDenuncia,
)
from app.domain.ouvidoria.repositories import IDenunciaRepository
from app.infrastructure.models.auth_models import UsuarioModel
from app.infrastructure.models.estabelecimento_models import EstabelecimentoModel
from app.infrastructure.models.ouvidoria_models import DenunciaModel


class DenunciaRepository(IDenunciaRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: DenunciaModel) -> Denuncia:
        return Denuncia(
            id=model.id,
            numero_protocolo=NumeroProtocoloDenuncia(model.numero_protocolo),
            local_denunciado_identificacao=model.local_denunciado_identificacao,
            relato_denuncia=model.relato_denuncia,
            data_recebimento=model.data_recebimento,
            origem=CanalDenuncia(model.origem),
            gravidade=GravidadeDenuncia(model.gravidade),
            status=StatusDenuncia(model.status),
            estabelecimento_id=model.estabelecimento_id,
            logradouro=model.logradouro,
            numero=model.numero,
            bairro=model.bairro,
            ponto_referencia=model.ponto_referencia,
            denunciante_anonimo=model.denunciante_anonimo,
            denunciante_nome=model.denunciante_nome,
            denunciante_telefone=model.denunciante_telefone,
            denunciante_email=model.denunciante_email,
            url_anexos_evidencias=model.url_anexos_evidencias or [],
            fiscal_designado_id=model.fiscal_designado_id,
            despacho_coordenacao=model.despacho_coordenacao,
            conclusao_apuracao=model.conclusao_apuracao,
            resposta_ao_denunciante=model.resposta_ao_denunciante,
            data_encerramento=model.data_encerramento,
            finalizado_por=model.finalizado_por,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def obter_proximo_sequencial(self, ano: int) -> int:
        stmt = (
            select(func.count(DenunciaModel.id))
            .where(
                func.extract("year", DenunciaModel.data_recebimento) == ano,
                DenunciaModel.is_deleted.is_(False),
            )
        )
        result = await self.session.execute(stmt)
        total = result.scalar_one() or 0
        return total + 1

    async def salvar(self, denuncia: Denuncia) -> Denuncia:
        stmt = (
            select(DenunciaModel)
            .where(
                DenunciaModel.id == denuncia.id,
                DenunciaModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            model = DenunciaModel(
                id=denuncia.id,
                numero_protocolo=denuncia.numero_protocolo.valor,
                data_recebimento=denuncia.data_recebimento,
                origem=denuncia.origem.value,
                gravidade=denuncia.gravidade.value,
                status=denuncia.status.value,
                estabelecimento_id=denuncia.estabelecimento_id,
                local_denunciado_identificacao=denuncia.local_denunciado_identificacao,
                logradouro=denuncia.logradouro,
                numero=denuncia.numero,
                bairro=denuncia.bairro,
                ponto_referencia=denuncia.ponto_referencia,
                denunciante_anonimo=denuncia.denunciante_anonimo,
                denunciante_nome=denuncia.denunciante_nome,
                denunciante_telefone=denuncia.denunciante_telefone,
                denunciante_email=denuncia.denunciante_email,
                relato_denuncia=denuncia.relato_denuncia,
                url_anexos_evidencias=denuncia.url_anexos_evidencias,
                fiscal_designado_id=denuncia.fiscal_designado_id,
                despacho_coordenacao=denuncia.despacho_coordenacao,
                conclusao_apuracao=denuncia.conclusao_apuracao,
                resposta_ao_denunciante=denuncia.resposta_ao_denunciante,
                data_encerramento=denuncia.data_encerramento,
                finalizado_por=denuncia.finalizado_por,
                is_active=denuncia.is_active,
                is_deleted=denuncia.is_deleted,
            )
            self.session.add(model)
        else:
            model.origem = denuncia.origem.value
            model.gravidade = denuncia.gravidade.value
            model.status = denuncia.status.value
            model.estabelecimento_id = denuncia.estabelecimento_id
            model.local_denunciado_identificacao = denuncia.local_denunciado_identificacao
            model.logradouro = denuncia.logradouro
            model.numero = denuncia.numero
            model.bairro = denuncia.bairro
            model.ponto_referencia = denuncia.ponto_referencia
            model.denunciante_anonimo = denuncia.denunciante_anonimo
            model.denunciante_nome = denuncia.denunciante_nome
            model.denunciante_telefone = denuncia.denunciante_telefone
            model.denunciante_email = denuncia.denunciante_email
            model.relato_denuncia = denuncia.relato_denuncia
            model.url_anexos_evidencias = denuncia.url_anexos_evidencias
            model.fiscal_designado_id = denuncia.fiscal_designado_id
            model.despacho_coordenacao = denuncia.despacho_coordenacao
            model.conclusao_apuracao = denuncia.conclusao_apuracao
            model.resposta_ao_denunciante = denuncia.resposta_ao_denunciante
            model.data_encerramento = denuncia.data_encerramento
            model.finalizado_por = denuncia.finalizado_por
            model.is_active = denuncia.is_active
            model.is_deleted = denuncia.is_deleted

        await self.session.flush()
        await self.session.refresh(model)
        return self._to_domain(model)

    async def buscar_por_id(self, id: uuid.UUID) -> Optional[Denuncia]:
        stmt = (
            select(DenunciaModel)
            .where(
                DenunciaModel.id == id,
                DenunciaModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def buscar_por_protocolo(self, protocolo: str) -> Optional[Denuncia]:
        stmt = (
            select(DenunciaModel)
            .where(
                DenunciaModel.numero_protocolo == protocolo.strip().upper(),
                DenunciaModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[StatusDenuncia] = None,
        gravidade: Optional[GravidadeDenuncia] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        estabelecimento_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Denuncia], int]:
        filters = [DenunciaModel.is_deleted.is_(False)]

        if status:
            filters.append(DenunciaModel.status == status.value)
        if gravidade:
            filters.append(DenunciaModel.gravidade == gravidade.value)
        if fiscal_id:
            filters.append(DenunciaModel.fiscal_designado_id == fiscal_id)
        if estabelecimento_id:
            filters.append(DenunciaModel.estabelecimento_id == estabelecimento_id)

        count_stmt = select(func.count(DenunciaModel.id)).where(*filters)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        stmt = (
            select(DenunciaModel)
            .where(*filters)
            .order_by(DenunciaModel.data_recebimento.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models], total

    async def listar_fila_trabalho(
        self,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        ordem_gravidade = case(
            (DenunciaModel.gravidade == "urgente", 1),
            (DenunciaModel.gravidade == "alta", 2),
            (DenunciaModel.gravidade == "media", 3),
            else_=4,
        )

        stmt = (
            select(
                DenunciaModel.id,
                DenunciaModel.numero_protocolo,
                DenunciaModel.data_recebimento,
                DenunciaModel.gravidade,
                DenunciaModel.status,
                DenunciaModel.local_denunciado_identificacao,
                DenunciaModel.bairro,
                EstabelecimentoModel.razao_social.label("estabelecimento_cadastrado"),
                UsuarioModel.nome_completo.label("fiscal_designado"),
                (func.current_date() - func.cast(DenunciaModel.data_recebimento, text("date"))).label("dias_em_aberto"),
            )
            .outerjoin(EstabelecimentoModel, (DenunciaModel.estabelecimento_id == EstabelecimentoModel.id) & (EstabelecimentoModel.is_deleted.is_(False)))
            .outerjoin(UsuarioModel, (DenunciaModel.fiscal_designado_id == UsuarioModel.id) & (UsuarioModel.is_deleted.is_(False)))
            .where(
                DenunciaModel.status.in_(["recebida", "em_analise", "em_apuracao_fiscal"]),
                DenunciaModel.is_deleted.is_(False),
                DenunciaModel.is_active.is_(True),
            )
            .order_by(ordem_gravidade, DenunciaModel.data_recebimento.asc())
            .offset(skip)
            .limit(limit)
        )

        res = await self.session.execute(stmt)
        rows = res.mappings().all()
        return [dict(row) for row in rows]
