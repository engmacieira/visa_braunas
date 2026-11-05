"""
DTOs Pydantic v2 para Licenciamento Sanitário e Alvarás
"""
from datetime import date, datetime
from typing import List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.domain.licenciamento.enums import (
    StatusAlvara,
    StatusRequerimento,
    TipoSolicitacaoAlvara,
)


class RequerimentoDadosDeclaradosDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    tipo_cadastro: Optional[str] = None
    cpf_cnpj: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    natureza_juridica: Optional[str] = None

    telefone_fixo: Optional[str] = None
    telefone_celular: Optional[str] = None
    email_comercial: Optional[str] = None

    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: Optional[str] = None

    cnae_principal_selecionado: Optional[str] = None
    cnae_principal_codigo_manual: Optional[str] = None
    cnae_principal_descricao: Optional[str] = None
    cnaes_secundarios_declarados: Optional[str] = None
    atividades_auxiliares: Optional[str] = None

    projeto_arquitetonico_aprovado: Optional[str] = None
    numero_processo_projeto_sei: Optional[str] = None
    afe_anvisa: Optional[str] = None
    ae_anvisa: Optional[str] = None

    dias_horario_funcionamento: Optional[str] = None
    num_funcionarios_manipuladores: int = 0
    fonte_abastecimento_agua: Optional[str] = None
    possui_caixa_agua_propria: Optional[str] = None
    capacidade_caixa_agua_litros: int = 0
    data_ultima_limpeza_caixa_agua: Optional[date] = None
    possui_coleta_rss: Optional[str] = None
    possui_raio_x: Optional[str] = None

    rep_nome: Optional[str] = None
    rep_cpf: Optional[str] = None
    rep_rg: Optional[str] = None
    rep_orgao_uf: Optional[str] = None
    rep_celular: Optional[str] = None
    rep_email: Optional[str] = None
    rep_endereco_residencial: Optional[str] = None

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

    relacao_documentos_declarados: Optional[str] = None
    link_drive_documentos: Optional[str] = None
    declaracao_veracidade_texto: Optional[str] = None
    preenchedor_nome: Optional[str] = None
    preenchedor_vinculo: Optional[str] = None
    preenchedor_telefone: Optional[str] = None


class SubmeterRequerimentoInputDTO(BaseModel):
    estabelecimento_id: uuid.UUID
    tipo_solicitacao: TipoSolicitacaoAlvara
    alvara_anterior_numero: Optional[str] = None
    alvara_anterior_exercicio: Optional[int] = None
    origem_solicitacao: str = Field(default="Google Forms Web")
    dados: RequerimentoDadosDeclaradosDTO


class AnalisarRequerimentoInputDTO(BaseModel):
    acao: str = Field(..., description="iniciar_analise, encaminhar_inspecao, solicitar_adequacao, deferir, indeferir, cancelar")
    parecer_ou_motivo: Optional[str] = None


class RequerimentoOutputDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_protocolo: str
    estabelecimento_id: uuid.UUID
    tipo_solicitacao: TipoSolicitacaoAlvara
    status: StatusRequerimento
    alvara_anterior_numero: Optional[str]
    alvara_anterior_exercicio: Optional[int]
    data_submissao: datetime
    origem_solicitacao: str
    analisado_por: Optional[uuid.UUID]
    data_inicio_analise: Optional[datetime]
    data_conclusao: Optional[datetime]
    parecer_fiscal: Optional[str]
    motivo_indeferimento: Optional[str]
    dados_declarados: Optional[RequerimentoDadosDeclaradosDTO] = None
    criado_em: datetime


class PaginatedRequerimentosOutputDTO(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[RequerimentoOutputDTO]


class EmitirAlvaraSanitarioInputDTO(BaseModel):
    estabelecimento_id: uuid.UUID
    requerimento_id: Optional[uuid.UUID] = None
    inspecao_conclusiva_id: Optional[uuid.UUID] = None
    validade_meses: int = Field(default=12, ge=1, le=60)
    condicionantes_restricoes: Optional[str] = None
    url_alvara_pdf: Optional[str] = None


class AlvaraSanitarioOutputDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_alvara: int
    exercicio: int
    numero_formatado: str
    estabelecimento_id: uuid.UUID
    requerimento_id: Optional[uuid.UUID]
    inspecao_conclusiva_id: Optional[uuid.UUID]
    codigo_autenticidade: str
    data_emissao: date
    data_vencimento: date
    status: StatusAlvara
    emitido_por: uuid.UUID
    condicionantes_restricoes: Optional[str]
    url_alvara_pdf: Optional[str]
    criado_em: datetime


class PaginatedAlvarasOutputDTO(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[AlvaraSanitarioOutputDTO]
