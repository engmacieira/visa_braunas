import uuid
from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.estabelecimentos.entities import (
    CompetenciaFiscalizacao,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
    SituacaoAlvara,
    SituacaoCadastral,
    TipoPessoa,
)


class CNAEResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    codigo: str
    descricao: str
    grau_risco_padrao: NivelRiscoCNAE
    competencia_padrao: CompetenciaFiscalizacao
    exige_rt: bool
    exige_projeto_arquitetonico: bool
    is_active: bool


class VinculoCNAEInputDTO(BaseModel):
    cnae_codigo: str = Field(..., description="Código do CNAE cadastrado (ex: '4713-0/02')")
    eh_principal: bool = Field(default=False, description="Indica se é a atividade econômica principal")
    data_inicio_atividade: Optional[date] = None


class VinculoCNAEResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    cnae_id: uuid.UUID
    cnae_codigo: str
    eh_principal: bool
    data_inicio_atividade: Optional[date] = None
    cnae: Optional[CNAEResponseDTO] = None


class RepresentanteLegalCreateDTO(BaseModel):
    nome_completo: str = Field(..., min_length=3, max_length=255)
    cpf: str = Field(..., description="CPF válido do representante")
    telefone: str = Field(..., max_length=20)
    email: EmailStr
    endereco_residencial: str
    rg_numero: Optional[str] = Field(None, max_length=30)
    rg_orgao_emissor: Optional[str] = Field(None, max_length=20)


class RepresentanteLegalResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    nome_completo: str
    cpf: str
    rg_numero: Optional[str] = None
    rg_orgao_emissor: Optional[str] = None
    telefone: str
    email: str
    endereco_residencial: str


class EstabelecimentoCreateDTO(BaseModel):
    tipo_cadastro: TipoPessoa = Field(default=TipoPessoa.PJ)
    cnpj_cpf: str = Field(..., description="CNPJ (14 dígitos) ou CPF (11 dígitos)")
    razao_social: str = Field(..., min_length=2, max_length=200)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    inscricao_municipal: Optional[str] = Field(None, max_length=50)
    natureza_juridica: Optional[str] = Field(None, max_length=100)

    # Localização
    cep: str = Field(..., description="CEP no formato 35189000 ou 35189-000")
    logradouro: str = Field(..., max_length=255)
    numero: str = Field(..., max_length=20)
    complemento: Optional[str] = Field(None, max_length=100)
    bairro: str = Field(..., max_length=100)
    municipio: str = Field(default="Braúnas", max_length=100)
    uf: str = Field(default="MG", max_length=2)
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: bool = False

    # Contatos
    telefone_fixo: Optional[str] = Field(None, max_length=20)
    telefone_celular: str = Field(..., max_length=20)
    email: EmailStr

    # Parâmetros Sanitários
    competencia_fiscalizacao: CompetenciaFiscalizacao = CompetenciaFiscalizacao.MUNICIPAL
    horario_funcionamento: Optional[str] = None
    fonte_abastecimento_agua: Optional[str] = "Rede Pública (COPASA)"
    possui_reservatorio_proprio: bool = False
    capacidade_reservatorio_litros: int = 0

    # Representante Legal (via ID existente ou criação inline)
    representante_legal_id: Optional[uuid.UUID] = None
    representante_legal: Optional[RepresentanteLegalCreateDTO] = None

    # Vínculo Obrigatório de Atividades Econômicas
    cnaes: List[VinculoCNAEInputDTO] = Field(
        ...,
        min_length=1,
        description="Lista de atividades CNAE (deve conter exatamente um principal)",
    )


class EstabelecimentoUpdateDTO(BaseModel):
    razao_social: Optional[str] = Field(None, min_length=2, max_length=200)
    nome_fantasia: Optional[str] = Field(None, max_length=200)
    inscricao_municipal: Optional[str] = Field(None, max_length=50)
    natureza_juridica: Optional[str] = Field(None, max_length=100)

    cep: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    complemento: Optional[str] = None
    bairro: Optional[str] = None
    municipio: Optional[str] = None
    uf: Optional[str] = None
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: Optional[bool] = None

    telefone_fixo: Optional[str] = None
    telefone_celular: Optional[str] = None
    email: Optional[EmailStr] = None

    competencia_fiscalizacao: Optional[CompetenciaFiscalizacao] = None
    situacao_estabelecimento: Optional[SituacaoCadastral] = None
    observacoes_baixa: Optional[str] = None

    horario_funcionamento: Optional[str] = None
    fonte_abastecimento_agua: Optional[str] = None
    possui_reservatorio_proprio: Optional[bool] = None
    capacidade_reservatorio_litros: Optional[int] = None
    representante_legal_id: Optional[uuid.UUID] = None


class EstabelecimentoResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tipo_cadastro: TipoPessoa
    cnpj_cpf: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    inscricao_municipal: Optional[str] = None
    natureza_juridica: Optional[str] = None

    cep: str
    logradouro: str
    numero: str
    complemento: Optional[str] = None
    bairro: str
    municipio: str
    uf: str
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: bool

    telefone_fixo: Optional[str] = None
    telefone_celular: str
    email: str

    nivel_risco: NivelRiscoSanitario
    competencia_fiscalizacao: CompetenciaFiscalizacao
    situacao_estabelecimento: SituacaoCadastral
    observacoes_baixa: Optional[str] = None

    horario_funcionamento: Optional[str] = None
    fonte_abastecimento_agua: Optional[str] = None
    possui_reservatorio_proprio: bool
    capacidade_reservatorio_litros: int

    numero_alvara: Optional[str] = None
    data_validade_alvara: Optional[date] = None
    situacao_alvara: SituacaoAlvara

    representante_legal: Optional[RepresentanteLegalResponseDTO] = None
    cnaes: List[VinculoCNAEResponseDTO] = []

    is_active: bool
    criado_em: datetime
    atualizado_em: datetime


class EstabelecimentoListResponseDTO(BaseModel):
    itens: List[EstabelecimentoResponseDTO]
    total: int
    skip: int
    limit: int
