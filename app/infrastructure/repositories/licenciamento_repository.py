"""
Repositório Concreto SQLAlchemy 2.0: Licenciamento Sanitário e Alvarás
"""
from typing import List, Optional, Tuple
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.domain.licenciamento.entities import (
    AlvaraSanitario,
    RequerimentoAlvara,
    RequerimentoDadosDeclarados,
    StatusAlvara,
    StatusRequerimento,
    TipoSolicitacaoAlvara,
)
from app.domain.licenciamento.repositories import (
    IAlvaraRepository,
    IRequerimentoRepository,
)
from app.domain.licenciamento.value_objects import (
    CodigoAutenticidadeAlvara,
    NumeroFormatadoAlvara,
    NumeroProtocoloRequerimento,
)
from app.infrastructure.models.licenciamento_models import (
    AlvaraSanitarioModel,
    RequerimentoAlvaraDadosModel,
    RequerimentoAlvaraModel,
)


class RequerimentoRepository(IRequerimentoRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _dados_to_domain(self, model: RequerimentoAlvaraDadosModel) -> RequerimentoDadosDeclarados:
        return RequerimentoDadosDeclarados(
            requerimento_id=model.requerimento_id,
            cpf_cnpj=model.cpf_cnpj,
            razao_social=model.razao_social,
            tipo_cadastro=model.tipo_cadastro,
            nome_fantasia=model.nome_fantasia,
            inscricao_municipal=model.inscricao_municipal,
            natureza_juridica=model.natureza_juridica,
            telefone_fixo=model.telefone_fixo,
            telefone_celular=model.telefone_celular,
            email_comercial=model.email_comercial,
            cep=model.cep,
            logradouro=model.logradouro,
            numero=model.numero,
            complemento=model.complemento,
            bairro=model.bairro,
            ponto_referencia=model.ponto_referencia,
            acesso_compartilhado_residencia=model.acesso_compartilhado_residencia,
            cnae_principal_selecionado=model.cnae_principal_selecionado,
            cnae_principal_codigo_manual=model.cnae_principal_codigo_manual,
            cnae_principal_descricao=model.cnae_principal_descricao,
            cnaes_secundarios_declarados=model.cnaes_secundarios_declarados,
            atividades_auxiliares=model.atividades_auxiliares,
            projeto_arquitetonico_aprovado=model.projeto_arquitetonico_aprovado,
            numero_processo_projeto_sei=model.numero_processo_projeto_sei,
            afe_anvisa=model.afe_anvisa,
            ae_anvisa=model.ae_anvisa,
            dias_horario_funcionamento=model.dias_horario_funcionamento,
            num_funcionarios_manipuladores=model.num_funcionarios_manipuladores,
            fonte_abastecimento_agua=model.fonte_abastecimento_agua,
            possui_caixa_agua_propria=model.possui_caixa_agua_propria,
            capacidade_caixa_agua_litros=model.capacidade_caixa_agua_litros,
            data_ultima_limpeza_caixa_agua=model.data_ultima_limpeza_caixa_agua,
            possui_coleta_rss=model.possui_coleta_rss,
            possui_raio_x=model.possui_raio_x,
            rep_nome=model.rep_nome,
            rep_cpf=model.rep_cpf,
            rep_rg=model.rep_rg,
            rep_orgao_uf=model.rep_orgao_uf,
            rep_celular=model.rep_celular,
            rep_email=model.rep_email,
            rep_endereco_residencial=model.rep_endereco_residencial,
            exige_rt=model.exige_rt,
            rt_proprio_representante=model.rt_proprio_representante,
            rt_nome=model.rt_nome,
            rt_cpf=model.rt_cpf,
            rt_conselho_classe=model.rt_conselho_classe,
            rt_numero_conselho=model.rt_numero_conselho,
            rt_conselho_uf=model.rt_conselho_uf,
            rt_carga_horaria=model.rt_carga_horaria,
            rt_telefone=model.rt_telefone,
            rt_email=model.rt_email,
            possui_rt_substituto=model.possui_rt_substituto,
            rt_substituto_dados=model.rt_substituto_dados,
            relacao_documentos_declarados=model.relacao_documentos_declarados,
            link_drive_documentos=model.link_drive_documentos,
            declaracao_veracidade_texto=model.declaracao_veracidade_texto,
            preenchedor_nome=model.preenchedor_nome,
            preenchedor_vinculo=model.preenchedor_vinculo,
            preenchedor_telefone=model.preenchedor_telefone,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    def _to_domain(self, model: RequerimentoAlvaraModel) -> RequerimentoAlvara:
        dados = self._dados_to_domain(model.dados) if model.dados else None
        return RequerimentoAlvara(
            id=model.id,
            numero_protocolo=NumeroProtocoloRequerimento(model.numero_protocolo),
            estabelecimento_id=model.estabelecimento_id,
            tipo_solicitacao=TipoSolicitacaoAlvara(model.tipo_solicitacao),
            status=StatusRequerimento(model.status),
            alvara_anterior_numero=model.alvara_anterior_numero,
            alvara_anterior_exercicio=model.alvara_anterior_exercicio,
            data_submissao=model.data_submissao,
            origem_solicitacao=model.origem_solicitacao,
            analisado_por=model.analisado_por,
            data_inicio_analise=model.data_inicio_analise,
            data_conclusao=model.data_conclusao,
            parecer_fiscal=model.parecer_fiscal,
            motivo_indeferimento=model.motivo_indeferimento,
            dados_declarados=dados,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def obter_proximo_sequencial(self, ano: int) -> int:
        stmt = (
            select(func.count(RequerimentoAlvaraModel.id))
            .where(
                func.extract("year", RequerimentoAlvaraModel.data_submissao) == ano,
                RequerimentoAlvaraModel.is_deleted.is_(False),
            )
        )
        result = await self.session.execute(stmt)
        total = result.scalar_one() or 0
        return total + 1

    async def salvar(self, requerimento: RequerimentoAlvara) -> RequerimentoAlvara:
        stmt = (
            select(RequerimentoAlvaraModel)
            .options(selectinload(RequerimentoAlvaraModel.dados))
            .where(
                RequerimentoAlvaraModel.id == requerimento.id,
                RequerimentoAlvaraModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            model = RequerimentoAlvaraModel(
                id=requerimento.id,
                numero_protocolo=requerimento.numero_protocolo.valor,
                estabelecimento_id=requerimento.estabelecimento_id,
                tipo_solicitacao=requerimento.tipo_solicitacao.value,
                status=requerimento.status.value,
                alvara_anterior_numero=requerimento.alvara_anterior_numero,
                alvara_anterior_exercicio=requerimento.alvara_anterior_exercicio,
                data_submissao=requerimento.data_submissao,
                origem_solicitacao=requerimento.origem_solicitacao,
                analisado_por=requerimento.analisado_por,
                data_inicio_analise=requerimento.data_inicio_analise,
                data_conclusao=requerimento.data_conclusao,
                parecer_fiscal=requerimento.parecer_fiscal,
                motivo_indeferimento=requerimento.motivo_indeferimento,
                is_active=requerimento.is_active,
                is_deleted=requerimento.is_deleted,
            )
            self.session.add(model)
        else:
            model.status = requerimento.status.value
            model.analisado_por = requerimento.analisado_por
            model.data_inicio_analise = requerimento.data_inicio_analise
            model.data_conclusao = requerimento.data_conclusao
            model.parecer_fiscal = requerimento.parecer_fiscal
            model.motivo_indeferimento = requerimento.motivo_indeferimento
            model.is_active = requerimento.is_active
            model.is_deleted = requerimento.is_deleted

        if requerimento.dados_declarados:
            d = requerimento.dados_declarados
            if model.dados:
                d_model = model.dados
                d_model.tipo_cadastro = d.tipo_cadastro
                d_model.cpf_cnpj = d.cpf_cnpj
                d_model.razao_social = d.razao_social
                d_model.nome_fantasia = d.nome_fantasia
                d_model.inscricao_municipal = d.inscricao_municipal
                d_model.natureza_juridica = d.natureza_juridica
                d_model.telefone_fixo = d.telefone_fixo
                d_model.telefone_celular = d.telefone_celular
                d_model.email_comercial = d.email_comercial
                d_model.cep = d.cep
                d_model.logradouro = d.logradouro
                d_model.numero = d.numero
                d_model.complemento = d.complemento
                d_model.bairro = d.bairro
                d_model.ponto_referencia = d.ponto_referencia
                d_model.acesso_compartilhado_residencia = d.acesso_compartilhado_residencia
                d_model.cnae_principal_selecionado = d.cnae_principal_selecionado
                d_model.cnae_principal_codigo_manual = d.cnae_principal_codigo_manual
                d_model.cnae_principal_descricao = d.cnae_principal_descricao
                d_model.cnaes_secundarios_declarados = d.cnaes_secundarios_declarados
                d_model.atividades_auxiliares = d.atividades_auxiliares
                d_model.projeto_arquitetonico_aprovado = d.projeto_arquitetonico_aprovado
                d_model.numero_processo_projeto_sei = d.numero_processo_projeto_sei
                d_model.afe_anvisa = d.afe_anvisa
                d_model.ae_anvisa = d.ae_anvisa
                d_model.dias_horario_funcionamento = d.dias_horario_funcionamento
                d_model.num_funcionarios_manipuladores = d.num_funcionarios_manipuladores
                d_model.fonte_abastecimento_agua = d.fonte_abastecimento_agua
                d_model.possui_caixa_agua_propria = d.possui_caixa_agua_propria
                d_model.capacidade_caixa_agua_litros = d.capacidade_caixa_agua_litros
                d_model.data_ultima_limpeza_caixa_agua = d.data_ultima_limpeza_caixa_agua
                d_model.possui_coleta_rss = d.possui_coleta_rss
                d_model.possui_raio_x = d.possui_raio_x
                d_model.rep_nome = d.rep_nome
                d_model.rep_cpf = d.rep_cpf
                d_model.rep_rg = d.rep_rg
                d_model.rep_orgao_uf = d.rep_orgao_uf
                d_model.rep_celular = d.rep_celular
                d_model.rep_email = d.rep_email
                d_model.rep_endereco_residencial = d.rep_endereco_residencial
                d_model.exige_rt = d.exige_rt
                d_model.rt_proprio_representante = d.rt_proprio_representante
                d_model.rt_nome = d.rt_nome
                d_model.rt_cpf = d.rt_cpf
                d_model.rt_conselho_classe = d.rt_conselho_classe
                d_model.rt_numero_conselho = d.rt_numero_conselho
                d_model.rt_conselho_uf = d.rt_conselho_uf
                d_model.rt_carga_horaria = d.rt_carga_horaria
                d_model.rt_telefone = d.rt_telefone
                d_model.rt_email = d.rt_email
                d_model.possui_rt_substituto = d.possui_rt_substituto
                d_model.rt_substituto_dados = d.rt_substituto_dados
                d_model.relacao_documentos_declarados = d.relacao_documentos_declarados
                d_model.link_drive_documentos = d.link_drive_documentos
                d_model.declaracao_veracidade_texto = d.declaracao_veracidade_texto
                d_model.preenchedor_nome = d.preenchedor_nome
                d_model.preenchedor_vinculo = d.preenchedor_vinculo
                d_model.preenchedor_telefone = d.preenchedor_telefone
                d_model.is_active = d.is_active
                d_model.is_deleted = d.is_deleted
            else:
                d_model = RequerimentoAlvaraDadosModel(
                    requerimento_id=requerimento.id,
                    tipo_cadastro=d.tipo_cadastro,
                    cpf_cnpj=d.cpf_cnpj,
                    razao_social=d.razao_social,
                    nome_fantasia=d.nome_fantasia,
                    inscricao_municipal=d.inscricao_municipal,
                    natureza_juridica=d.natureza_juridica,
                    telefone_fixo=d.telefone_fixo,
                    telefone_celular=d.telefone_celular,
                    email_comercial=d.email_comercial,
                    cep=d.cep,
                    logradouro=d.logradouro,
                    numero=d.numero,
                    complemento=d.complemento,
                    bairro=d.bairro,
                    ponto_referencia=d.ponto_referencia,
                    acesso_compartilhado_residencia=d.acesso_compartilhado_residencia,
                    cnae_principal_selecionado=d.cnae_principal_selecionado,
                    cnae_principal_codigo_manual=d.cnae_principal_codigo_manual,
                    cnae_principal_descricao=d.cnae_principal_descricao,
                    cnaes_secundarios_declarados=d.cnaes_secundarios_declarados,
                    atividades_auxiliares=d.atividades_auxiliares,
                    projeto_arquitetonico_aprovado=d.projeto_arquitetonico_aprovado,
                    numero_processo_projeto_sei=d.numero_processo_projeto_sei,
                    afe_anvisa=d.afe_anvisa,
                    ae_anvisa=d.ae_anvisa,
                    dias_horario_funcionamento=d.dias_horario_funcionamento,
                    num_funcionarios_manipuladores=d.num_funcionarios_manipuladores,
                    fonte_abastecimento_agua=d.fonte_abastecimento_agua,
                    possui_caixa_agua_propria=d.possui_caixa_agua_propria,
                    capacidade_caixa_agua_litros=d.capacidade_caixa_agua_litros,
                    data_ultima_limpeza_caixa_agua=d.data_ultima_limpeza_caixa_agua,
                    possui_coleta_rss=d.possui_coleta_rss,
                    possui_raio_x=d.possui_raio_x,
                    rep_nome=d.rep_nome,
                    rep_cpf=d.rep_cpf,
                    rep_rg=d.rep_rg,
                    rep_orgao_uf=d.rep_orgao_uf,
                    rep_celular=d.rep_celular,
                    rep_email=d.rep_email,
                    rep_endereco_residencial=d.rep_endereco_residencial,
                    exige_rt=d.exige_rt,
                    rt_proprio_representante=d.rt_proprio_representante,
                    rt_nome=d.rt_nome,
                    rt_cpf=d.rt_cpf,
                    rt_conselho_classe=d.rt_conselho_classe,
                    rt_numero_conselho=d.rt_numero_conselho,
                    rt_conselho_uf=d.rt_conselho_uf,
                    rt_carga_horaria=d.rt_carga_horaria,
                    rt_telefone=d.rt_telefone,
                    rt_email=d.rt_email,
                    possui_rt_substituto=d.possui_rt_substituto,
                    rt_substituto_dados=d.rt_substituto_dados,
                    relacao_documentos_declarados=d.relacao_documentos_declarados,
                    link_drive_documentos=d.link_drive_documentos,
                    declaracao_veracidade_texto=d.declaracao_veracidade_texto,
                    preenchedor_nome=d.preenchedor_nome,
                    preenchedor_vinculo=d.preenchedor_vinculo,
                    preenchedor_telefone=d.preenchedor_telefone,
                    is_active=d.is_active,
                    is_deleted=d.is_deleted,
                )
                self.session.add(d_model)

        await self.session.flush()
        return await self.buscar_por_id(requerimento.id)  # type: ignore

    async def buscar_por_id(self, id: uuid.UUID) -> Optional[RequerimentoAlvara]:
        stmt = (
            select(RequerimentoAlvaraModel)
            .options(selectinload(RequerimentoAlvaraModel.dados))
            .where(
                RequerimentoAlvaraModel.id == id,
                RequerimentoAlvaraModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def buscar_por_protocolo(self, protocolo: str) -> Optional[RequerimentoAlvara]:
        stmt = (
            select(RequerimentoAlvaraModel)
            .options(selectinload(RequerimentoAlvaraModel.dados))
            .where(
                RequerimentoAlvaraModel.numero_protocolo == protocolo.strip().upper(),
                RequerimentoAlvaraModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[StatusRequerimento] = None,
        estabelecimento_id: Optional[uuid.UUID] = None,
        apenas_fila_trabalho: bool = False,
    ) -> Tuple[List[RequerimentoAlvara], int]:
        filters = [RequerimentoAlvaraModel.is_deleted.is_(False)]

        if status:
            filters.append(RequerimentoAlvaraModel.status == status.value)
        elif apenas_fila_trabalho:
            filters.append(
                RequerimentoAlvaraModel.status.in_([
                    StatusRequerimento.PENDENTE.value,
                    StatusRequerimento.EM_ANALISE.value,
                    StatusRequerimento.AGUARDANDO_INSPECAO.value,
                    StatusRequerimento.AGUARDANDO_ADEQUACAO.value,
                ])
            )

        if estabelecimento_id:
            filters.append(RequerimentoAlvaraModel.estabelecimento_id == estabelecimento_id)

        count_stmt = select(func.count(RequerimentoAlvaraModel.id)).where(*filters)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        stmt = (
            select(RequerimentoAlvaraModel)
            .options(selectinload(RequerimentoAlvaraModel.dados))
            .where(*filters)
            .order_by(RequerimentoAlvaraModel.data_submissao.asc() if apenas_fila_trabalho else RequerimentoAlvaraModel.data_submissao.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models], total


class AlvaraRepository(IAlvaraRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    def _to_domain(self, model: AlvaraSanitarioModel) -> AlvaraSanitario:
        return AlvaraSanitario(
            id=model.id,
            numero_alvara=model.numero_alvara,
            exercicio=model.exercicio,
            numero_formatado=model.numero_formatado,
            estabelecimento_id=model.estabelecimento_id,
            requerimento_id=model.requerimento_id,
            inspecao_conclusiva_id=model.inspecao_conclusiva_id,
            codigo_autenticidade=CodigoAutenticidadeAlvara(model.codigo_autenticidade),
            data_emissao=model.data_emissao,
            data_vencimento=model.data_vencimento,
            status=StatusAlvara(model.status),
            emitido_por=model.emitido_por,
            condicionantes_restricoes=model.condicionantes_restricoes,
            url_alvara_pdf=model.url_alvara_pdf,
            is_active=model.is_active,
            is_deleted=model.is_deleted,
            criado_em=model.criado_em,
            atualizado_em=model.atualizado_em,
        )

    async def obter_proximo_numero_exercicio(self, exercicio: int) -> int:
        stmt = (
            select(func.coalesce(func.max(AlvaraSanitarioModel.numero_alvara), 0))
            .where(
                AlvaraSanitarioModel.exercicio == exercicio,
                AlvaraSanitarioModel.is_deleted.is_(False),
            )
        )
        result = await self.session.execute(stmt)
        max_num = result.scalar_one() or 0
        return max_num + 1

    async def salvar(self, alvara: AlvaraSanitario) -> AlvaraSanitario:
        stmt = (
            select(AlvaraSanitarioModel)
            .where(
                AlvaraSanitarioModel.id == alvara.id,
                AlvaraSanitarioModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()

        if not model:
            model = AlvaraSanitarioModel(
                id=alvara.id,
                numero_alvara=alvara.numero_alvara,
                exercicio=alvara.exercicio,
                numero_formatado=alvara.numero_formatado,
                estabelecimento_id=alvara.estabelecimento_id,
                requerimento_id=alvara.requerimento_id,
                inspecao_conclusiva_id=alvara.inspecao_conclusiva_id,
                codigo_autenticidade=alvara.codigo_autenticidade.valor,
                data_emissao=alvara.data_emissao,
                data_vencimento=alvara.data_vencimento,
                status=alvara.status.value,
                emitido_por=alvara.emitido_por,
                condicionantes_restricoes=alvara.condicionantes_restricoes,
                url_alvara_pdf=alvara.url_alvara_pdf,
                is_active=alvara.is_active,
                is_deleted=alvara.is_deleted,
            )
            self.session.add(model)
        else:
            model.status = alvara.status.value
            model.data_vencimento = alvara.data_vencimento
            model.condicionantes_restricoes = alvara.condicionantes_restricoes
            model.url_alvara_pdf = alvara.url_alvara_pdf
            model.is_active = alvara.is_active
            model.is_deleted = alvara.is_deleted

        await self.session.flush()
        return self._to_domain(model)

    async def buscar_por_id(self, id: uuid.UUID) -> Optional[AlvaraSanitario]:
        stmt = (
            select(AlvaraSanitarioModel)
            .where(
                AlvaraSanitarioModel.id == id,
                AlvaraSanitarioModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def buscar_por_autenticidade(self, codigo_autenticidade: str) -> Optional[AlvaraSanitario]:
        stmt = (
            select(AlvaraSanitarioModel)
            .where(
                AlvaraSanitarioModel.codigo_autenticidade == codigo_autenticidade.strip().upper(),
                AlvaraSanitarioModel.is_deleted.is_(False),
            )
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def buscar_alvara_vigente_estabelecimento(self, estabelecimento_id: uuid.UUID) -> Optional[AlvaraSanitario]:
        stmt = (
            select(AlvaraSanitarioModel)
            .where(
                AlvaraSanitarioModel.estabelecimento_id == estabelecimento_id,
                AlvaraSanitarioModel.status == StatusAlvara.ATIVO.value,
                AlvaraSanitarioModel.is_active.is_(True),
                AlvaraSanitarioModel.is_deleted.is_(False),
            )
            .order_by(AlvaraSanitarioModel.data_emissao.desc())
            .limit(1)
        )
        res = await self.session.execute(stmt)
        model = res.scalar_one_or_none()
        return self._to_domain(model) if model else None

    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        estabelecimento_id: Optional[uuid.UUID] = None,
        exercicio: Optional[int] = None,
        status: Optional[StatusAlvara] = None,
    ) -> Tuple[List[AlvaraSanitario], int]:
        filters = [AlvaraSanitarioModel.is_deleted.is_(False)]

        if estabelecimento_id:
            filters.append(AlvaraSanitarioModel.estabelecimento_id == estabelecimento_id)
        if exercicio:
            filters.append(AlvaraSanitarioModel.exercicio == exercicio)
        if status:
            filters.append(AlvaraSanitarioModel.status == status.value)

        count_stmt = select(func.count(AlvaraSanitarioModel.id)).where(*filters)
        count_res = await self.session.execute(count_stmt)
        total = count_res.scalar_one() or 0

        stmt = (
            select(AlvaraSanitarioModel)
            .where(*filters)
            .order_by(AlvaraSanitarioModel.exercicio.desc(), AlvaraSanitarioModel.numero_alvara.desc())
            .offset(skip)
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        models = res.scalars().all()
        return [self._to_domain(m) for m in models], total
