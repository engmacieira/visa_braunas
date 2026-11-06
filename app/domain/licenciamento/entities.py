"""
Módulo de Domínio: Entidades Puras de Licenciamento Sanitário e Alvarás
"""
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Optional
import uuid

from app.domain.licenciamento.value_objects import (
    CodigoAutenticidadeAlvara,
    NumeroProtocoloRequerimento,
)


from app.domain.licenciamento.enums import (
    StatusAlvara,
    StatusRequerimento,
    TipoSolicitacaoAlvara,
)


@dataclass
class RequerimentoDadosDeclarados:
    """
    Espelho cadastral integral da petição enviada pelo requerente (1:1 com requerimento_id)
    """
    requerimento_id: uuid.UUID
    cpf_cnpj: str
    razao_social: str
    tipo_cadastro: Optional[str] = None
    nome_fantasia: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    natureza_juridica: Optional[str] = None

    # Contatos Declarados
    telefone_fixo: Optional[str] = None
    telefone_celular: Optional[str] = None
    email_comercial: Optional[str] = None

    # Localização Declarada
    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: Optional[str] = None

    # Atividades Econômicas
    cnae_principal_selecionado: Optional[str] = None
    cnae_principal_codigo_manual: Optional[str] = None
    cnae_principal_descricao: Optional[str] = None
    cnaes_secundarios_declarados: Optional[str] = None
    atividades_auxiliares: Optional[str] = None

    # Projetos e Autorizações Federais
    projeto_arquitetonico_aprovado: Optional[str] = None
    numero_processo_projeto_sei: Optional[str] = None
    afe_anvisa: Optional[str] = None
    ae_anvisa: Optional[str] = None

    # Condições Físico-Operacionais
    dias_horario_funcionamento: Optional[str] = None
    num_funcionarios_manipuladores: int = 0
    fonte_abastecimento_agua: Optional[str] = None
    possui_caixa_agua_propria: Optional[str] = None
    capacidade_caixa_agua_litros: int = 0
    data_ultima_limpeza_caixa_agua: Optional[date] = None
    possui_coleta_rss: Optional[str] = None
    possui_raio_x: Optional[str] = None

    # Representante Legal Declarado
    rep_nome: Optional[str] = None
    rep_cpf: Optional[str] = None
    rep_rg: Optional[str] = None
    rep_orgao_uf: Optional[str] = None
    rep_celular: Optional[str] = None
    rep_email: Optional[str] = None
    rep_endereco_residencial: Optional[str] = None

    # Responsável Técnico (RT) Declarado
    exige_rt: Optional[str] = None
    rt_proprio_representante: Optional[str] = None
    rt_nome: Optional[str] = None
    rt_cpf: Optional[str] = None
    rt_conselho_classe: Optional[str] = None
    rt_numero_conselho: Optional[str] = None
    rt_conselho_uf: Optional[str] = None
    rt_carga_horaria: Optional[str] = None
    rt_telefone: Optional[str] = None
    rt_email: Optional[str] = None
    possui_rt_substituto: Optional[str] = None
    rt_substituto_dados: Optional[str] = None

    # Anexos e Declaração de Veracidade
    relacao_documentos_declarados: Optional[str] = None
    link_drive_documentos: Optional[str] = None
    declaracao_veracidade_texto: Optional[str] = None
    preenchedor_nome: Optional[str] = None
    preenchedor_vinculo: Optional[str] = None
    preenchedor_telefone: Optional[str] = None

    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)


@dataclass
class RequerimentoAlvara:
    """
    Livro de registro dos pedidos de licenciamento sanitário municipal
    """
    id: uuid.UUID
    numero_protocolo: NumeroProtocoloRequerimento
    estabelecimento_id: uuid.UUID
    tipo_solicitacao: TipoSolicitacaoAlvara
    status: StatusRequerimento = StatusRequerimento.PENDENTE
    alvara_anterior_numero: Optional[str] = None
    alvara_anterior_exercicio: Optional[int] = None
    data_submissao: datetime = field(default_factory=datetime.now)
    origem_solicitacao: str = "Google Forms Web"
    analisado_por: Optional[uuid.UUID] = None
    data_inicio_analise: Optional[datetime] = None
    data_conclusao: Optional[datetime] = None
    parecer_fiscal: Optional[str] = None
    motivo_indeferimento: Optional[str] = None
    dados_declarados: Optional[RequerimentoDadosDeclarados] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)

    def iniciar_analise(self, fiscal_id: uuid.UUID) -> None:
        if self.status in [StatusRequerimento.DEFERIDO, StatusRequerimento.INDEFERIDO, StatusRequerimento.CANCELADO]:
            raise ValueError(f"Não é possível iniciar análise em requerimento já finalizado com status '{self.status.value}'.")
        self.status = StatusRequerimento.EM_ANALISE
        self.analisado_por = fiscal_id
        if not self.data_inicio_analise:
            self.data_inicio_analise = datetime.now()
        self.atualizado_em = datetime.now()

    def encaminhar_para_inspecao(self) -> None:
        if self.status != StatusRequerimento.EM_ANALISE:
            raise ValueError("O requerimento deve estar em análise documental para ser encaminhado à inspeção sanitária.")
        self.status = StatusRequerimento.AGUARDANDO_INSPECAO
        self.atualizado_em = datetime.now()

    def solicitar_adequacao(self, pendencias: str) -> None:
        if not pendencias or not pendencias.strip():
            raise ValueError("A descrição das adequações necessárias é obrigatória.")
        self.status = StatusRequerimento.AGUARDANDO_ADEQUACAO
        self.parecer_fiscal = (self.parecer_fiscal or "") + f"\n[Notificação de Adequação]: {pendencias.strip()}"
        self.atualizado_em = datetime.now()

    def deferir(self, fiscal_id: uuid.UUID, parecer: str) -> None:
        if self.status == StatusRequerimento.CANCELADO:
            raise ValueError("Requerimento cancelado não pode ser deferido.")
        self.status = StatusRequerimento.DEFERIDO
        self.analisado_por = fiscal_id
        self.parecer_fiscal = parecer.strip()
        self.data_conclusao = datetime.now()
        self.atualizado_em = datetime.now()

    def indeferir(self, fiscal_id: uuid.UUID, motivo: str) -> None:
        if not motivo or not motivo.strip():
            raise ValueError("O motivo do indeferimento fiscal é obrigatório.")
        self.status = StatusRequerimento.INDEFERIDO
        self.analisado_por = fiscal_id
        self.motivo_indeferimento = motivo.strip()
        self.data_conclusao = datetime.now()
        self.atualizado_em = datetime.now()

    def cancelar(self, motivo: str) -> None:
        self.status = StatusRequerimento.CANCELADO
        self.motivo_indeferimento = f"[Cancelado]: {motivo.strip()}"
        self.data_conclusao = datetime.now()
        self.atualizado_em = datetime.now()


@dataclass
class AlvaraSanitario:
    """
    Título oficial de Licença Sanitária emitido pelo município
    """
    id: uuid.UUID
    numero_alvara: int
    exercicio: int
    numero_formatado: str
    estabelecimento_id: uuid.UUID
    codigo_autenticidade: CodigoAutenticidadeAlvara
    data_emissao: date
    data_vencimento: date
    emitido_por: uuid.UUID
    requerimento_id: Optional[uuid.UUID] = None
    inspecao_conclusiva_id: Optional[uuid.UUID] = None
    status: StatusAlvara = StatusAlvara.ATIVO
    condicionantes_restricoes: Optional[str] = None
    url_alvara_pdf: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        # Invariante de Datas
        if self.data_vencimento < self.data_emissao:
            raise ValueError("A data de vencimento do alvará não pode ser anterior à data de emissão.")

        # Invariante de Emissão: Exige deferimento documental ou inspeção conclusiva
        if self.status == StatusAlvara.ATIVO and not self.requerimento_id and not self.inspecao_conclusiva_id:
            raise ValueError(
                "Invariante violada: Um Alvará Sanitário ativo só pode ser emitido mediante deferimento documental "
                "(requerimento_id) ou inspeção conclusiva favorável (inspecao_conclusiva_id)."
            )

    def suspender(self, motivo: str) -> None:
        self.status = StatusAlvara.SUSPENSO
        self.condicionantes_restricoes = (self.condicionantes_restricoes or "") + f"\n[Suspensão Cautelar]: {motivo.strip()}"
        self.atualizado_em = datetime.now()

    def revogar(self, motivo: str) -> None:
        self.status = StatusAlvara.REVOGADO
        self.condicionantes_restricoes = (self.condicionantes_restricoes or "") + f"\n[Revogação Administrativa]: {motivo.strip()}"
        self.atualizado_em = datetime.now()

    def cassar(self, processo: str) -> None:
        self.status = StatusAlvara.CASSADO
        self.condicionantes_restricoes = (self.condicionantes_restricoes or "") + f"\n[Cassação em Processo Sancionatório]: {processo.strip()}"
        self.atualizado_em = datetime.now()
