import uuid
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from enum import Enum
from typing import List, Optional


class TipoPessoa(str, Enum):
    PF = "PF"
    PJ = "PJ"


class NivelRiscoSanitario(str, Enum):
    RISCO_I = "Risco I"
    RISCO_II = "Risco II"
    RISCO_III = "Risco III"


class NivelRiscoCNAE(str, Enum):
    DISPENSADO = "Dispensado"
    RISCO_I = "Risco I"
    RISCO_II = "Risco II"
    RISCO_III = "Risco III"


class SituacaoCadastral(str, Enum):
    ATIVO = "Ativo"
    INATIVO = "Inativo"
    SUSPENSO = "Suspenso"


class SituacaoAlvara(str, Enum):
    VALIDO = "Válido"
    VENCIDO = "Vencido"
    ISENTO_DISPENSADO = "Isento/Dispensado"
    NAO_POSSUI_IRREGULAR = "Não Possui (Irregular)"


class CompetenciaFiscalizacao(str, Enum):
    MUNICIPAL = "Municipal"
    ESTADUAL = "Estadual"
    PACTUADO = "Pactuado"


class CategoriaDocumento(str, Enum):
    LICENCIAMENTO = "licenciamento"
    INFRAESTRUTURA_SANEAMENTO = "infraestrutura_saneamento"
    CONTROLE_AMBIENTAL = "controle_ambiental"
    SEGURANCA_SAUDE = "seguranca_saude"
    GESTAO_QUALIDADE = "gestao_qualidade"
    HABILITACAO_PROFISSIONAL = "habilitacao_profissional"


class SituacaoDocumento(str, Enum):
    VIGENTE = "vigente"
    VENCIDO = "vencido"
    EM_ANALISE = "em_analise"
    DISPENSADO = "dispensado"
    REJEITADO = "rejeitado"


@dataclass
class CNAE:
    id: uuid.UUID
    codigo: str
    descricao: str
    grau_risco_padrao: NivelRiscoCNAE = NivelRiscoCNAE.RISCO_II
    competencia_padrao: CompetenciaFiscalizacao = CompetenciaFiscalizacao.MUNICIPAL
    exige_rt: bool = False
    exige_projeto_arquitetonico: bool = False
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class RepresentanteLegal:
    id: uuid.UUID
    nome_completo: str
    cpf: str
    telefone: str
    email: str
    endereco_residencial: str
    rg_numero: Optional[str] = None
    rg_orgao_emissor: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class ResponsavelTecnico:
    id: uuid.UUID
    nome_completo: str
    cpf: str
    conselho_classe: str
    numero_registro_conselho: str
    uf_conselho: str = "MG"
    telefone: str = ""
    email: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


@dataclass
class VinculoCNAE:
    id: uuid.UUID
    estabelecimento_id: uuid.UUID
    cnae_id: uuid.UUID
    cnae_codigo: str
    eh_principal: bool = False
    data_inicio_atividade: Optional[date] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    cnae: Optional[CNAE] = None


@dataclass
class VinculoRT:
    id: uuid.UUID
    estabelecimento_id: uuid.UUID
    responsavel_tecnico_id: uuid.UUID
    eh_substituto: bool = False
    carga_horaria_semanal: Optional[str] = None
    horario_permanencia: Optional[str] = None
    numero_art_crt: Optional[str] = None
    data_inicio: date = field(default_factory=date.today)
    data_fim: Optional[date] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    responsavel_tecnico: Optional[ResponsavelTecnico] = None


@dataclass
class Estabelecimento:
    id: uuid.UUID
    tipo_cadastro: TipoPessoa
    cnpj_cpf: str
    razao_social: str
    cep: str
    logradouro: str
    numero: str
    bairro: str
    telefone_celular: str
    email: str
    nivel_risco: NivelRiscoSanitario

    inscricao_municipal: Optional[str] = None
    nome_fantasia: Optional[str] = None
    natureza_juridica: Optional[str] = None
    complemento: Optional[str] = None
    municipio: str = "Braúnas"
    uf: str = "MG"
    ponto_referencia: Optional[str] = None
    acesso_compartilhado_residencia: bool = False

    telefone_fixo: Optional[str] = None
    competencia_fiscalizacao: CompetenciaFiscalizacao = CompetenciaFiscalizacao.MUNICIPAL
    situacao_estabelecimento: SituacaoCadastral = SituacaoCadastral.ATIVO
    observacoes_baixa: Optional[str] = None

    horario_funcionamento: Optional[str] = None
    fonte_abastecimento_agua: Optional[str] = "Rede Pública (COPASA)"
    possui_reservatorio_proprio: bool = False
    capacidade_reservatorio_litros: int = 0

    numero_alvara: Optional[str] = None
    data_validade_alvara: Optional[date] = None
    situacao_alvara: SituacaoAlvara = SituacaoAlvara.NAO_POSSUI_IRREGULAR

    representante_legal_id: Optional[uuid.UUID] = None
    firestore_id: Optional[str] = None
    cadastrado_por: Optional[uuid.UUID] = None

    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    cnaes: List[VinculoCNAE] = field(default_factory=list)
    responsaveis_tecnicos: List[VinculoRT] = field(default_factory=list)
    representante_legal: Optional[RepresentanteLegal] = None

    def obter_cnae_principal(self) -> Optional[VinculoCNAE]:
        for v in self.cnaes:
            if v.eh_principal and not v.is_deleted and v.is_active:
                return v
        return None

    def atualizar_risco(self, novo_risco: NivelRiscoSanitario) -> None:
        self.nivel_risco = novo_risco
        self.atualizado_em = datetime.now(timezone.utc)

    def desativar(self, motivo: Optional[str] = None) -> None:
        self.situacao_estabelecimento = SituacaoCadastral.INATIVO
        self.is_active = False
        if motivo:
            self.observacoes_baixa = motivo
        self.atualizado_em = datetime.now(timezone.utc)

    def soft_delete(self) -> None:
        self.is_deleted = True
        self.is_active = False
        self.atualizado_em = datetime.now(timezone.utc)
