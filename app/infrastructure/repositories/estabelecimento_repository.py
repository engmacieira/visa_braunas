import uuid
from typing import List, Optional

from sqlalchemy import delete, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload, selectinload

from app.domain.estabelecimentos.entities import (
    CNAE,
    Estabelecimento,
    NivelRiscoSanitario,
    RepresentanteLegal,
    ResponsavelTecnico,
    SituacaoCadastral,
    VinculoCNAE,
    VinculoRT,
)
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.infrastructure.models.estabelecimento_models import (
    EstabelecimentoCnaeModel,
    EstabelecimentoModel,
    EstabelecimentoResponsavelTecnicoModel,
)


class EstabelecimentoRepository(IEstabelecimentoRepository):
    """
    Implementação concreta e assíncrona do repositório de Estabelecimentos via SQLAlchemy 2.0.
    Garante o carregamento de relacionamentos através de joinedload e selectinload.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @classmethod
    def _to_entity(cls, model: EstabelecimentoModel) -> Estabelecimento:
        cnaes_entities: List[VinculoCNAE] = []
        if model.cnaes_associados:
            for c_assoc in model.cnaes_associados:
                cnae_obj: Optional[CNAE] = None
                if c_assoc.cnae:
                    cnae_obj = CNAE(
                        id=c_assoc.cnae.id,
                        codigo=c_assoc.cnae.codigo,
                        descricao=c_assoc.cnae.descricao,
                        grau_risco_padrao=c_assoc.cnae.grau_risco_padrao,
                        competencia_padrao=c_assoc.cnae.competencia_padrao,
                        exige_rt=c_assoc.cnae.exige_rt,
                        exige_projeto_arquitetonico=c_assoc.cnae.exige_projeto_arquitetonico,
                        is_active=c_assoc.cnae.is_active,
                        is_deleted=c_assoc.cnae.is_deleted,
                        criado_em=c_assoc.cnae.criado_em,
                        atualizado_em=c_assoc.cnae.atualizado_em,
                    )
                cnaes_entities.append(
                    VinculoCNAE(
                        id=c_assoc.id,
                        estabelecimento_id=c_assoc.estabelecimento_id,
                        cnae_id=c_assoc.cnae_id,
                        cnae_codigo=c_assoc.cnae_codigo,
                        eh_principal=c_assoc.eh_principal,
                        data_inicio_atividade=c_assoc.data_inicio_atividade,
                        is_active=c_assoc.is_active,
                        is_deleted=c_assoc.is_deleted,
                        criado_em=c_assoc.criado_em,
                        atualizado_em=c_assoc.atualizado_em,
                        cnae=cnae_obj,
                    )
                )

        rep_entity: Optional[RepresentanteLegal] = None
        if model.representante_legal:
            m_rep = model.representante_legal
            rep_entity = RepresentanteLegal(
                id=m_rep.id,
                nome_completo=m_rep.nome_completo,
                cpf=m_rep.cpf,
                rg_numero=m_rep.rg_numero,
                rg_orgao_emissor=m_rep.rg_orgao_emissor,
                telefone=m_rep.telefone,
                email=m_rep.email,
                endereco_residencial=m_rep.endereco_residencial,
                is_active=m_rep.is_active,
                is_deleted=m_rep.is_deleted,
                criado_em=m_rep.criado_em,
                atualizado_em=m_rep.atualizado_em,
            )

        rt_entities: List[VinculoRT] = []
        if model.responsaveis_tecnicos_associados:
            for rt_assoc in model.responsaveis_tecnicos_associados:
                rt_obj: Optional[ResponsavelTecnico] = None
                if rt_assoc.responsavel_tecnico:
                    m_rt = rt_assoc.responsavel_tecnico
                    rt_obj = ResponsavelTecnico(
                        id=m_rt.id,
                        nome_completo=m_rt.nome_completo,
                        cpf=m_rt.cpf,
                        conselho_classe=m_rt.conselho_classe,
                        numero_registro_conselho=m_rt.numero_registro_conselho,
                        uf_conselho=m_rt.uf_conselho,
                        telefone=m_rt.telefone,
                        email=m_rt.email,
                        is_active=m_rt.is_active,
                        is_deleted=m_rt.is_deleted,
                        criado_em=m_rt.criado_em,
                        atualizado_em=m_rt.atualizado_em,
                    )
                rt_entities.append(
                    VinculoRT(
                        id=rt_assoc.id,
                        estabelecimento_id=rt_assoc.estabelecimento_id,
                        responsavel_tecnico_id=rt_assoc.responsavel_tecnico_id,
                        eh_substituto=rt_assoc.eh_substituto,
                        carga_horaria_semanal=rt_assoc.carga_horaria_semanal,
                        horario_permanencia=rt_assoc.horario_permanencia,
                        numero_art_crt=rt_assoc.numero_art_crt,
                        data_inicio=rt_assoc.data_inicio,
                        data_fim=rt_assoc.data_fim,
                        is_active=rt_assoc.is_active,
                        is_deleted=rt_assoc.is_deleted,
                        criado_em=rt_assoc.criado_em,
                        atualizado_em=rt_assoc.atualizado_em,
                        responsavel_tecnico=rt_obj,
                    )
                )

        return Estabelecimento(
            id=model.id,
            tipo_cadastro=model.tipo_cadastro,
            cnpj_cpf=model.cnpj_cpf,
            razao_social=model.razao_social,
            cep=model.cep,
            logradouro=model.logradouro,
            numero=model.numero,
            bairro=model.bairro,
            telefone_celular=model.telefone_celular,
            email=model.email,
            nivel_risco=model.nivel_risco,
            inscricao_municipal=model.inscricao_municipal,
            nome_fantasia=model.nome_fantasia,
            natureza_juridica=model.natureza_juridica,
            complemento=model.complemento,
            municipio=model.municipio,
            uf=model.uf,
            ponto_referencia=model.ponto_referencia,
            acesso_compartilhado_residencia=model.acesso_compartilhado_residencia,
            telefone_fixo=model.telefone_fixo,
            competencia_fiscalizacao=model.competencia_fiscalizacao,
            situacao_estabelecimento=model.situacao_estabelecimento,
            observacoes_baixa=model.observacoes_baixa,
            horario_funcionamento=model.horario_funcionamento,
            fonte_abastecimento_agua=model.fonte_abastecimento_agua,
            possui_reservatorio_proprio=bool(model.possui_reservatorio_proprio),
            capacidade_reservatorio_litros=model.capacidade_reservatorio_litros or 0,
            numero_alvara=model.numero_alvara,
            data_validade_alvara=model.data_validade_alvara,
            situacao_alvara=model.situacao_alvara,
            representante_legal_id=model.representante_legal_id,
            firestore_id=model.firestore_id,
            cadastrado_por=model.cadastrado_por,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
            cnaes=cnaes_entities,
            responsaveis_tecnicos=rt_entities,
            representante_legal=rep_entity,
        )

    def _base_query(self):
        return (
            select(EstabelecimentoModel)
            .options(
                joinedload(EstabelecimentoModel.representante_legal),
                selectinload(EstabelecimentoModel.cnaes_associados).joinedload(EstabelecimentoCnaeModel.cnae),
                selectinload(EstabelecimentoModel.responsaveis_tecnicos_associados).joinedload(
                    EstabelecimentoResponsavelTecnicoModel.responsavel_tecnico
                ),
            )
        )

    async def get_by_id(self, estabelecimento_id: uuid.UUID) -> Optional[Estabelecimento]:
        query = self._base_query().where(
            EstabelecimentoModel.id == estabelecimento_id,
            EstabelecimentoModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.unique().scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def get_by_cnpj_cpf(self, cnpj_cpf: str, include_deleted: bool = False) -> Optional[Estabelecimento]:
        clean = "".join(filter(str.isdigit, cnpj_cpf))
        query = self._base_query().where(EstabelecimentoModel.cnpj_cpf == clean)
        if not include_deleted:
            query = query.where(EstabelecimentoModel.is_deleted.is_(False))
        result = await self.session.execute(query)
        model = result.unique().scalar_one_or_none()
        return self._to_entity(model) if model else None

    async def list_estabelecimentos(
        self,
        skip: int = 0,
        limit: int = 50,
        situacao: Optional[SituacaoCadastral] = None,
        risco: Optional[NivelRiscoSanitario] = None,
        busca: Optional[str] = None,
        only_active: bool = True,
    ) -> List[Estabelecimento]:
        query = self._base_query().where(EstabelecimentoModel.is_deleted.is_(False))

        if only_active:
            query = query.where(EstabelecimentoModel.is_active.is_(True))
        if situacao:
            query = query.where(EstabelecimentoModel.situacao_estabelecimento == situacao)
        if risco:
            query = query.where(EstabelecimentoModel.nivel_risco == risco)
        if busca:
            termo = f"%{busca.strip()}%"
            clean_digits = "".join(filter(str.isdigit, busca))
            conditions = [
                EstabelecimentoModel.razao_social.ilike(termo),
                EstabelecimentoModel.nome_fantasia.ilike(termo),
            ]
            if clean_digits:
                conditions.append(EstabelecimentoModel.cnpj_cpf.ilike(f"%{clean_digits}%"))
            query = query.where(or_(*conditions))

        query = query.order_by(EstabelecimentoModel.razao_social.asc()).offset(skip).limit(limit)
        result = await self.session.execute(query)
        models = result.unique().scalars().all()
        return [self._to_entity(m) for m in models]

    async def count_estabelecimentos(
        self,
        situacao: Optional[SituacaoCadastral] = None,
        risco: Optional[NivelRiscoSanitario] = None,
        busca: Optional[str] = None,
        only_active: bool = True,
    ) -> int:
        query = select(func.count()).select_from(EstabelecimentoModel).where(EstabelecimentoModel.is_deleted.is_(False))
        if only_active:
            query = query.where(EstabelecimentoModel.is_active.is_(True))
        if situacao:
            query = query.where(EstabelecimentoModel.situacao_estabelecimento == situacao)
        if risco:
            query = query.where(EstabelecimentoModel.nivel_risco == risco)
        if busca:
            termo = f"%{busca.strip()}%"
            clean_digits = "".join(filter(str.isdigit, busca))
            conditions = [
                EstabelecimentoModel.razao_social.ilike(termo),
                EstabelecimentoModel.nome_fantasia.ilike(termo),
            ]
            if clean_digits:
                conditions.append(EstabelecimentoModel.cnpj_cpf.ilike(f"%{clean_digits}%"))
            query = query.where(or_(*conditions))

        result = await self.session.execute(query)
        return int(result.scalar_one() or 0)

    async def save(self, estabelecimento: Estabelecimento) -> Estabelecimento:
        clean_doc = "".join(filter(str.isdigit, estabelecimento.cnpj_cpf))
        clean_cep = "".join(filter(str.isdigit, estabelecimento.cep))
        formatted_cep = f"{clean_cep[:5]}-{clean_cep[5:]}" if len(clean_cep) == 8 else estabelecimento.cep

        model = EstabelecimentoModel(
            id=estabelecimento.id,
            tipo_cadastro=estabelecimento.tipo_cadastro,
            cnpj_cpf=clean_doc,
            inscricao_municipal=estabelecimento.inscricao_municipal,
            razao_social=estabelecimento.razao_social.strip(),
            nome_fantasia=estabelecimento.nome_fantasia.strip() if estabelecimento.nome_fantasia else None,
            natureza_juridica=estabelecimento.natureza_juridica,
            cep=formatted_cep,
            logradouro=estabelecimento.logradouro.strip(),
            numero=estabelecimento.numero.strip(),
            complemento=estabelecimento.complemento.strip() if estabelecimento.complemento else None,
            bairro=estabelecimento.bairro.strip(),
            municipio=estabelecimento.municipio.strip(),
            uf=estabelecimento.uf.strip().upper(),
            ponto_referencia=estabelecimento.ponto_referencia,
            acesso_compartilhado_residencia=estabelecimento.acesso_compartilhado_residencia,
            telefone_fixo=estabelecimento.telefone_fixo,
            telefone_celular=estabelecimento.telefone_celular.strip(),
            email=estabelecimento.email.strip().lower(),
            nivel_risco=estabelecimento.nivel_risco,
            competencia_fiscalizacao=estabelecimento.competencia_fiscalizacao,
            situacao_estabelecimento=estabelecimento.situacao_estabelecimento,
            observacoes_baixa=estabelecimento.observacoes_baixa,
            horario_funcionamento=estabelecimento.horario_funcionamento,
            fonte_abastecimento_agua=estabelecimento.fonte_abastecimento_agua,
            possui_reservatorio_proprio=estabelecimento.possui_reservatorio_proprio,
            capacidade_reservatorio_litros=estabelecimento.capacidade_reservatorio_litros,
            numero_alvara=estabelecimento.numero_alvara,
            data_validade_alvara=estabelecimento.data_validade_alvara,
            situacao_alvara=estabelecimento.situacao_alvara,
            representante_legal_id=estabelecimento.representante_legal_id,
            firestore_id=estabelecimento.firestore_id,
            cadastrado_por=estabelecimento.cadastrado_por,
            is_active=estabelecimento.is_active,
            is_deleted=estabelecimento.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()

        # Insere os CNAEs associados
        for vinculo in estabelecimento.cnaes:
            cnae_model = EstabelecimentoCnaeModel(
                id=vinculo.id,
                estabelecimento_id=estabelecimento.id,
                cnae_id=vinculo.cnae_id,
                cnae_codigo=vinculo.cnae_codigo,
                eh_principal=vinculo.eh_principal,
                data_inicio_atividade=vinculo.data_inicio_atividade,
                is_active=vinculo.is_active,
                is_deleted=vinculo.is_deleted,
            )
            self.session.add(cnae_model)

        await self.session.flush()
        return await self.get_by_id(estabelecimento.id)  # type: ignore

    async def update(self, estabelecimento: Estabelecimento) -> Estabelecimento:
        query = select(EstabelecimentoModel).where(
            EstabelecimentoModel.id == estabelecimento.id,
            EstabelecimentoModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        if not model:
            raise ValueError(f"Estabelecimento com ID {estabelecimento.id} não encontrado.")

        clean_doc = "".join(filter(str.isdigit, estabelecimento.cnpj_cpf))
        clean_cep = "".join(filter(str.isdigit, estabelecimento.cep))

        model.tipo_cadastro = estabelecimento.tipo_cadastro
        model.cnpj_cpf = clean_doc
        model.inscricao_municipal = estabelecimento.inscricao_municipal
        model.razao_social = estabelecimento.razao_social.strip()
        model.nome_fantasia = estabelecimento.nome_fantasia.strip() if estabelecimento.nome_fantasia else None
        model.natureza_juridica = estabelecimento.natureza_juridica
        model.cep = f"{clean_cep[:5]}-{clean_cep[5:]}" if len(clean_cep) == 8 else estabelecimento.cep
        model.logradouro = estabelecimento.logradouro.strip()
        model.numero = estabelecimento.numero.strip()
        model.complemento = estabelecimento.complemento.strip() if estabelecimento.complemento else None
        model.bairro = estabelecimento.bairro.strip()
        model.municipio = estabelecimento.municipio.strip()
        model.uf = estabelecimento.uf.strip().upper()
        model.ponto_referencia = estabelecimento.ponto_referencia
        model.acesso_compartilhado_residencia = estabelecimento.acesso_compartilhado_residencia
        model.telefone_fixo = estabelecimento.telefone_fixo
        model.telefone_celular = estabelecimento.telefone_celular.strip()
        model.email = estabelecimento.email.strip().lower()
        model.nivel_risco = estabelecimento.nivel_risco
        model.competencia_fiscalizacao = estabelecimento.competencia_fiscalizacao
        model.situacao_estabelecimento = estabelecimento.situacao_estabelecimento
        model.observacoes_baixa = estabelecimento.observacoes_baixa
        model.horario_funcionamento = estabelecimento.horario_funcionamento
        model.fonte_abastecimento_agua = estabelecimento.fonte_abastecimento_agua
        model.possui_reservatorio_proprio = estabelecimento.possui_reservatorio_proprio
        model.capacidade_reservatorio_litros = estabelecimento.capacidade_reservatorio_litros
        model.numero_alvara = estabelecimento.numero_alvara
        model.data_validade_alvara = estabelecimento.data_validade_alvara
        model.situacao_alvara = estabelecimento.situacao_alvara
        model.representante_legal_id = estabelecimento.representante_legal_id
        model.is_active = estabelecimento.is_active
        model.is_deleted = estabelecimento.is_deleted

        await self.session.flush()
        return await self.get_by_id(estabelecimento.id)  # type: ignore

    async def adicionar_cnae(self, vinculo: VinculoCNAE) -> VinculoCNAE:
        model = EstabelecimentoCnaeModel(
            id=vinculo.id,
            estabelecimento_id=vinculo.estabelecimento_id,
            cnae_id=vinculo.cnae_id,
            cnae_codigo=vinculo.cnae_codigo,
            eh_principal=vinculo.eh_principal,
            data_inicio_atividade=vinculo.data_inicio_atividade,
            is_active=vinculo.is_active,
            is_deleted=vinculo.is_deleted,
        )
        self.session.add(model)
        await self.session.flush()
        await self.session.refresh(model)
        return VinculoCNAE(
            id=model.id,
            estabelecimento_id=model.estabelecimento_id,
            cnae_id=model.cnae_id,
            cnae_codigo=model.cnae_codigo,
            eh_principal=model.eh_principal,
            data_inicio_atividade=model.data_inicio_atividade,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def remover_cnae(self, estabelecimento_id: uuid.UUID, cnae_id: uuid.UUID) -> None:
        query = select(EstabelecimentoCnaeModel).where(
            EstabelecimentoCnaeModel.estabelecimento_id == estabelecimento_id,
            EstabelecimentoCnaeModel.cnae_id == cnae_id,
            EstabelecimentoCnaeModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        model = result.scalar_one_or_none()
        if model:
            model.is_deleted = True
            model.is_active = False
            await self.session.flush()

    async def substituir_cnaes(
        self, estabelecimento_id: uuid.UUID, novos_vinculos: List[VinculoCNAE]
    ) -> None:
        # Exclui logicamente os vínculos atuais
        query = select(EstabelecimentoCnaeModel).where(
            EstabelecimentoCnaeModel.estabelecimento_id == estabelecimento_id,
            EstabelecimentoCnaeModel.is_deleted.is_(False),
        )
        result = await self.session.execute(query)
        atuais = result.scalars().all()
        for v in atuais:
            v.is_deleted = True
            v.is_active = False

        await self.session.flush()

        # Insere os novos vínculos
        for v in novos_vinculos:
            novo_model = EstabelecimentoCnaeModel(
                id=v.id,
                estabelecimento_id=estabelecimento_id,
                cnae_id=v.cnae_id,
                cnae_codigo=v.cnae_codigo,
                eh_principal=v.eh_principal,
                data_inicio_atividade=v.data_inicio_atividade,
                is_active=True,
                is_deleted=False,
            )
            self.session.add(novo_model)

        await self.session.flush()
