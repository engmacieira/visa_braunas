"""
Caso de Uso: Submeter e Analisar Requerimento de Licenciamento Sanitário
"""
from datetime import datetime
import uuid

from app.application.licenciamento.dtos import (
    AnalisarRequerimentoInputDTO,
    RequerimentoDadosDeclaradosDTO,
    RequerimentoOutputDTO,
    SubmeterRequerimentoInputDTO,
)
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.domain.licenciamento.entities import (
    RequerimentoAlvara,
    RequerimentoDadosDeclarados,
    StatusRequerimento,
)
from app.domain.licenciamento.repositories import IRequerimentoRepository
from app.domain.licenciamento.value_objects import NumeroProtocoloRequerimento


class SubmeterRequerimentoUseCase:
    """
    Submissão do requerimento de licença com criação de snapshot dos dados declarados
    """
    def __init__(
        self,
        requerimento_repo: IRequerimentoRepository,
        estabelecimento_repo: IEstabelecimentoRepository,
    ):
        self.requerimento_repo = requerimento_repo
        self.estabelecimento_repo = estabelecimento_repo

    async def execute(self, input_dto: SubmeterRequerimentoInputDTO) -> RequerimentoOutputDTO:
        # 1. Validar existência e situação do estabelecimento
        estab = await self.estabelecimento_repo.buscar_por_id(input_dto.estabelecimento_id)
        if not estab:
            raise ValueError(f"Estabelecimento com ID '{input_dto.estabelecimento_id}' não encontrado.")
        if not estab.is_active or estab.is_deleted:
            raise ValueError("Não é possível solicitar alvará para estabelecimento inativo ou excluído logicamente.")

        # 2. Gerar número de protocolo sequencial anual
        ano_corrente = datetime.now().year
        seq = await self.requerimento_repo.obter_proximo_sequencial(ano_corrente)
        protocolo = NumeroProtocoloRequerimento.gerar(sequencial=seq, exercicio=ano_corrente)

        req_id = uuid.uuid4()
        d = input_dto.dados

        # 3. Snapshot dos dados declarados (1:1)
        dados_entidade = RequerimentoDadosDeclarados(
            requerimento_id=req_id,
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
        )

        req = RequerimentoAlvara(
            id=req_id,
            numero_protocolo=protocolo,
            estabelecimento_id=input_dto.estabelecimento_id,
            tipo_solicitacao=input_dto.tipo_solicitacao,
            status=StatusRequerimento.PENDENTE,
            alvara_anterior_numero=input_dto.alvara_anterior_numero,
            alvara_anterior_exercicio=input_dto.alvara_anterior_exercicio,
            origem_solicitacao=input_dto.origem_solicitacao,
            dados_declarados=dados_entidade,
        )

        salvo = await self.requerimento_repo.salvar(req)

        dados_dto = None
        if salvo.dados_declarados:
            dados_dto = RequerimentoDadosDeclaradosDTO.model_validate(salvo.dados_declarados)

        return RequerimentoOutputDTO(
            id=salvo.id,
            numero_protocolo=salvo.numero_protocolo.valor,
            estabelecimento_id=salvo.estabelecimento_id,
            tipo_solicitacao=salvo.tipo_solicitacao,
            status=salvo.status,
            alvara_anterior_numero=salvo.alvara_anterior_numero,
            alvara_anterior_exercicio=salvo.alvara_anterior_exercicio,
            data_submissao=salvo.data_submissao,
            origem_solicitacao=salvo.origem_solicitacao,
            analisado_por=salvo.analisado_por,
            data_inicio_analise=salvo.data_inicio_analise,
            data_conclusao=salvo.data_conclusao,
            parecer_fiscal=salvo.parecer_fiscal,
            motivo_indeferimento=salvo.motivo_indeferimento,
            dados_declarados=dados_dto,
            criado_em=salvo.criado_em,
        )


class AnalisarRequerimentoUseCase:
    """
    Parecer fiscal e transição de status no processo de licenciamento
    """
    def __init__(self, requerimento_repo: IRequerimentoRepository):
        self.requerimento_repo = requerimento_repo

    async def execute(
        self,
        requerimento_id: uuid.UUID,
        fiscal_id: uuid.UUID,
        input_dto: AnalisarRequerimentoInputDTO,
    ) -> RequerimentoOutputDTO:
        req = await self.requerimento_repo.buscar_por_id(requerimento_id)
        if not req:
            raise ValueError(f"Requerimento com ID '{requerimento_id}' não encontrado.")

        acao = input_dto.acao.strip().lower()
        motivo_ou_parecer = (input_dto.parecer_ou_motivo or "").strip()

        if acao == "iniciar_analise":
            req.iniciar_analise(fiscal_id)
        elif acao == "encaminhar_inspecao":
            req.encaminhar_para_inspecao()
        elif acao == "solicitar_adequacao":
            req.solicitar_adequacao(motivo_ou_parecer)
        elif acao == "deferir":
            req.deferir(fiscal_id, motivo_ou_parecer or "Requerimento deferido após parecer conclusivo favorável.")
        elif acao == "indeferir":
            req.indeferir(fiscal_id, motivo_ou_parecer)
        elif acao == "cancelar":
            req.cancelar(motivo_ou_parecer)
        else:
            raise ValueError(f"Ação de análise documental desconhecida: '{acao}'.")

        salvo = await self.requerimento_repo.salvar(req)

        dados_dto = None
        if salvo.dados_declarados:
            dados_dto = RequerimentoDadosDeclaradosDTO.model_validate(salvo.dados_declarados)

        return RequerimentoOutputDTO(
            id=salvo.id,
            numero_protocolo=salvo.numero_protocolo.valor,
            estabelecimento_id=salvo.estabelecimento_id,
            tipo_solicitacao=salvo.tipo_solicitacao,
            status=salvo.status,
            alvara_anterior_numero=salvo.alvara_anterior_numero,
            alvara_anterior_exercicio=salvo.alvara_anterior_exercicio,
            data_submissao=salvo.data_submissao,
            origem_solicitacao=salvo.origem_solicitacao,
            analisado_por=salvo.analisado_por,
            data_inicio_analise=salvo.data_inicio_analise,
            data_conclusao=salvo.data_conclusao,
            parecer_fiscal=salvo.parecer_fiscal,
            motivo_indeferimento=salvo.motivo_indeferimento,
            dados_declarados=dados_dto,
            criado_em=salvo.criado_em,
        )
