import uuid
from datetime import date
from typing import Any, Dict, List, Optional

from sqlalchemy import extract, func, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.domain.fiscalizacao.entities import Inspecao
from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.domain.fiscalizacao.repositories import IInspecaoRepository
from app.infrastructure.models.auth_models import UsuarioModel
from app.infrastructure.models.estabelecimento_models import EstabelecimentoModel
from app.infrastructure.models.fiscalizacao_models import InspecaoModel


class InspecaoRepository(IInspecaoRepository):
    """
    Implementação concreta e assíncrona do repositório de Inspeções via SQLAlchemy 2.0.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def _to_entity(model: InspecaoModel) -> Inspecao:
        return Inspecao(
            id=model.id,
            numero_termo=model.numero_termo,
            estabelecimento_id=model.estabelecimento_id,
            fiscal_responsavel_id=model.fiscal_responsavel_id,
            data_inicio=model.data_inicio,
            motivo=model.motivo,
            status=model.status,
            requerimento_id=model.requerimento_id,
            denuncia_id=model.denuncia_id,
            fiscais_acompanhantes=model.fiscais_acompanhantes,
            data_agendamento=model.data_agendamento,
            data_fim=model.data_fim,
            hora_inspecao=model.hora_inspecao,
            resultado=model.resultado,
            nome_pessoa_acompanhou=model.nome_pessoa_acompanhou,
            cpf_pessoa_acompanhou=model.cpf_pessoa_acompanhou,
            relato_vistoria=model.relato_vistoria,
            irregularidades_constatadas=model.irregularidades_constatadas,
            exigencias_notificadas=model.exigencias_notificadas,
            prazo_adequacao_dias=model.prazo_adequacao_dias,
            data_limite_adequacao=model.data_limite_adequacao,
            nome_local_trabalho=model.nome_local_trabalho,
            principais_riscos_identificados=model.principais_riscos_identificados,
            recomendacoes_orientacoes=model.recomendacoes_orientacoes,
            checklist_respostas=dict(model.checklist_respostas or {}),
            relatorio_fotografico=list(model.relatorio_fotografico or []),
            url_termo_assinado_pdf=model.url_termo_assinado_pdf,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def get_by_id(self, inspecao_id: uuid.UUID) -> Optional[Inspecao]:
        query = (
            select(InspecaoModel)
            .options(
                joinedload(InspecaoModel.estabelecimento),
                joinedload(InspecaoModel.fiscal_responsavel),
            )
            .where(
                InspecaoModel.id == inspecao_id,
                InspecaoModel.is_deleted.is_(False),
            )
        )
        result = await self.session.execute(query)
        model = result.unique().scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def buscar_por_id(self, inspecao_id: uuid.UUID) -> Optional[Inspecao]:
        return await self.get_by_id(inspecao_id)

    async def get_by_numero_termo(self, numero_termo: str) -> Optional[Inspecao]:
        clean = numero_termo.strip().upper()
        query = (
            select(InspecaoModel)
            .where(
                func.upper(InspecaoModel.numero_termo) == clean,
                InspecaoModel.is_deleted.is_(False),
            )
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_inspecoes(
        self,
        skip: int = 0,
        limit: int = 50,
        estabelecimento_id: Optional[uuid.UUID] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        motivo: Optional[TipoMotivoInspecao] = None,
        status: Optional[StatusInspecao] = None,
        data_inicio_de: Optional[date] = None,
        data_inicio_ate: Optional[date] = None,
        only_active: bool = True,
    ) -> List[Inspecao]:
        query = (
            select(InspecaoModel)
            .options(
                joinedload(InspecaoModel.estabelecimento),
                joinedload(InspecaoModel.fiscal_responsavel),
            )
            .where(InspecaoModel.is_deleted.is_(False))
        )

        if only_active:
            query = query.where(InspecaoModel.is_active.is_(True))
        if estabelecimento_id:
            query = query.where(InspecaoModel.estabelecimento_id == estabelecimento_id)
        if fiscal_id:
            query = query.where(InspecaoModel.fiscal_responsavel_id == fiscal_id)
        if motivo:
            query = query.where(InspecaoModel.motivo == motivo)
        if status:
            query = query.where(InspecaoModel.status == status)
        if data_inicio_de:
            query = query.where(InspecaoModel.data_inicio >= data_inicio_de)
        if data_inicio_ate:
            query = query.where(InspecaoModel.data_inicio <= data_inicio_ate)

        query = query.order_by(InspecaoModel.data_inicio.desc(), InspecaoModel.criado_em.desc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        models = result.unique().scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_inspecoes(
        self,
        estabelecimento_id: Optional[uuid.UUID] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        motivo: Optional[TipoMotivoInspecao] = None,
        status: Optional[StatusInspecao] = None,
        data_inicio_de: Optional[date] = None,
        data_inicio_ate: Optional[date] = None,
        only_active: bool = True,
    ) -> int:
        query = select(func.count()).select_from(InspecaoModel).where(InspecaoModel.is_deleted.is_(False))
        if only_active:
            query = query.where(InspecaoModel.is_active.is_(True))
        if estabelecimento_id:
            query = query.where(InspecaoModel.estabelecimento_id == estabelecimento_id)
        if fiscal_id:
            query = query.where(InspecaoModel.fiscal_responsavel_id == fiscal_id)
        if motivo:
            query = query.where(InspecaoModel.motivo == motivo)
        if status:
            query = query.where(InspecaoModel.status == status)
        if data_inicio_de:
            query = query.where(InspecaoModel.data_inicio >= data_inicio_de)
        if data_inicio_ate:
            query = query.where(InspecaoModel.data_inicio <= data_inicio_ate)

        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def save(self, inspecao: Inspecao) -> Inspecao:
        model = InspecaoModel(
            id=inspecao.id,
            numero_termo=inspecao.numero_termo.strip().upper(),
            motivo=inspecao.motivo,
            status=inspecao.status,
            estabelecimento_id=inspecao.estabelecimento_id,
            requerimento_id=inspecao.requerimento_id,
            denuncia_id=inspecao.denuncia_id,
            fiscal_responsavel_id=inspecao.fiscal_responsavel_id,
            fiscais_acompanhantes=inspecao.fiscais_acompanhantes,
            data_agendamento=inspecao.data_agendamento,
            data_inicio=inspecao.data_inicio,
            data_fim=inspecao.data_fim,
            hora_inspecao=inspecao.hora_inspecao,
            resultado=inspecao.resultado,
            nome_pessoa_acompanhou=inspecao.nome_pessoa_acompanhou,
            cpf_pessoa_acompanhou="".join(filter(str.isdigit, inspecao.cpf_pessoa_acompanhou or "")),
            relato_vistoria=inspecao.relato_vistoria,
            irregularidades_constatadas=inspecao.irregularidades_constatadas,
            exigencias_notificadas=inspecao.exigencias_notificadas,
            prazo_adequacao_dias=inspecao.prazo_adequacao_dias,
            data_limite_adequacao=inspecao.data_limite_adequacao,
            nome_local_trabalho=inspecao.nome_local_trabalho,
            principais_riscos_identificados=inspecao.principais_riscos_identificados,
            recomendacoes_orientacoes=inspecao.recomendacoes_orientacoes,
            checklist_respostas=inspecao.checklist_respostas,
            relatorio_fotografico=inspecao.relatorio_fotografico,
            url_termo_assinado_pdf=inspecao.url_termo_assinado_pdf,
            is_active=inspecao.is_active,
            is_deleted=inspecao.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)

    async def update(self, inspecao: Inspecao) -> Inspecao:
        query = select(InspecaoModel).where(
            InspecaoModel.id == inspecao.id,
            InspecaoModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Inspeção com ID {inspecao.id} não encontrada.")

        model.numero_termo = inspecao.numero_termo.strip().upper()
        model.motivo = inspecao.motivo
        model.status = inspecao.status
        model.estabelecimento_id = inspecao.estabelecimento_id
        model.requerimento_id = inspecao.requerimento_id
        model.denuncia_id = inspecao.denuncia_id
        model.fiscal_responsavel_id = inspecao.fiscal_responsavel_id
        model.fiscais_acompanhantes = inspecao.fiscais_acompanhantes
        model.data_agendamento = inspecao.data_agendamento
        model.data_inicio = inspecao.data_inicio
        model.data_fim = inspecao.data_fim
        model.hora_inspecao = inspecao.hora_inspecao
        model.resultado = inspecao.resultado
        model.nome_pessoa_acompanhou = inspecao.nome_pessoa_acompanhou
        model.cpf_pessoa_acompanhou = "".join(filter(str.isdigit, inspecao.cpf_pessoa_acompanhou or ""))
        model.relato_vistoria = inspecao.relato_vistoria
        model.irregularidades_constatadas = inspecao.irregularidades_constatadas
        model.exigencias_notificadas = inspecao.exigencias_notificadas
        model.prazo_adequacao_dias = inspecao.prazo_adequacao_dias
        model.data_limite_adequacao = inspecao.data_limite_adequacao
        model.nome_local_trabalho = inspecao.nome_local_trabalho
        model.principais_riscos_identificados = inspecao.principais_riscos_identificados
        model.recomendacoes_orientacoes = inspecao.recomendacoes_orientacoes
        model.checklist_respostas = inspecao.checklist_respostas
        model.relatorio_fotografico = inspecao.relatorio_fotografico
        model.url_termo_assinado_pdf = inspecao.url_termo_assinado_pdf
        model.is_active = inspecao.is_active
        model.is_deleted = inspecao.is_deleted

        await self.session.flush()
        await self.session.refresh(model)
        return self._to_entity(model)

    async def obter_notificacoes_pendentes(
        self, limite_dias: int = 30
    ) -> List[Dict[str, Any]]:
        """
        Consulta as notificações sanitárias com prazo de adequação vigente e ordenadas pela data limite.
        Reflete os dados da view 'vw_inspecoes_notificacoes_a_vencer'.
        """
        hoje = date.today()
        query = (
            select(
                InspecaoModel.id.label("inspecao_id"),
                InspecaoModel.numero_termo,
                EstabelecimentoModel.id.label("estabelecimento_id"),
                EstabelecimentoModel.razao_social,
                EstabelecimentoModel.nome_fantasia,
                UsuarioModel.nome_completo.label("fiscal_responsavel"),
                InspecaoModel.data_limite_adequacao,
            )
            .join(EstabelecimentoModel, InspecaoModel.estabelecimento_id == EstabelecimentoModel.id)
            .join(UsuarioModel, InspecaoModel.fiscal_responsavel_id == UsuarioModel.id)
            .where(
                InspecaoModel.resultado == ResultadoInspecao.NOTIFICADO_COM_PRAZO,
                InspecaoModel.data_limite_adequacao.is_not(None),
                InspecaoModel.data_limite_adequacao >= hoje,
                InspecaoModel.is_deleted.is_(False),
                InspecaoModel.is_active.is_(True),
                EstabelecimentoModel.is_deleted.is_(False),
            )
            .order_by(InspecaoModel.data_limite_adequacao.asc())
        )
        result = await self.session.execute(query)
        rows = result.all()

        alertas: List[Dict[str, Any]] = []
        for r in rows:
            dias_restantes = (r.data_limite_adequacao - hoje).days
            if dias_restantes <= limite_dias:
                alertas.append({
                    "inspecao_id": r.inspecao_id,
                    "numero_termo": r.numero_termo,
                    "estabelecimento_id": r.estabelecimento_id,
                    "razao_social": r.razao_social,
                    "nome_fantasia": r.nome_fantasia,
                    "fiscal_responsavel": r.fiscal_responsavel,
                    "data_limite_adequacao": r.data_limite_adequacao,
                    "dias_restantes": dias_restantes,
                })
        return alertas

    async def obter_indicador_11_consolidado(
        self, exercicio: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """
        Consolidação do Indicador 11 (VAPT - Saúde do Trabalhador).
        Reflete a view 'vw_indicador_11_vapt_consolidado'.
        """
        ano_col = extract("year", InspecaoModel.data_inicio).label("exercicio")
        query = (
            select(
                ano_col,
                func.count().label("total_acoes_vapt"),
                func.count().filter(InspecaoModel.status == StatusInspecao.CONCLUIDA).label("vapt_concluidas"),
                func.count().filter(InspecaoModel.status == StatusInspecao.EM_ANDAMENTO).label("vapt_em_acompanhamento"),
            )
            .where(
                InspecaoModel.motivo == TipoMotivoInspecao.VAPT_TRABALHADOR,
                InspecaoModel.is_deleted.is_(False),
                InspecaoModel.is_active.is_(True),
            )
            .group_by(ano_col)
            .order_by(ano_col.desc())
        )
        if exercicio:
            query = query.where(ano_col == exercicio)

        result = await self.session.execute(query)
        rows = result.all()
        return [
            {
                "exercicio": int(r.exercicio),
                "total_acoes_vapt": int(r.total_acoes_vapt),
                "vapt_concluidas": int(r.vapt_concluidas),
                "vapt_em_acompanhamento": int(r.vapt_em_acompanhamento),
            }
            for r in rows
        ]
