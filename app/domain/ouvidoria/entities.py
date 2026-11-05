"""
Módulo de Domínio: Entidades Puras de Ouvidoria e Gestão de Denúncias Sanitárias
"""
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


class CanalDenuncia(str, Enum):
    FORMULARIO_WEB = "formulario_web"
    PRESENCIAL = "presencial"
    TELEFONE = "telefone"
    OUVIDORIA_GERAL = "ouvidoria_geral"
    OFICIO_MINISTERIO = "oficio_ministerio"


class StatusDenuncia(str, Enum):
    RECEBIDA = "recebida"
    EM_ANALISE = "em_analise"
    EM_APURACAO_FISCAL = "em_apuracao_fiscal"
    PROCEDENTE = "procedente"
    IMPROCEDENTE = "improcedente"
    ARQUIVADA = "arquivada"


class GravidadeDenuncia(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"


@dataclass(frozen=True)
class NumeroProtocoloDenuncia:
    valor: str

    def __post_init__(self):
        if not self.valor or not self.valor.strip():
            raise ValueError("O número do protocolo da denúncia não pode ser vazio.")
        cleaned = self.valor.strip().upper()
        if len(cleaned) > 35:
            raise ValueError("O número do protocolo da denúncia não pode exceder 35 caracteres.")
        object.__setattr__(self, "valor", cleaned)

    @classmethod
    def gerar(cls, sequencial: int, exercicio: int | None = None) -> "NumeroProtocoloDenuncia":
        ano = exercicio or datetime.now().year
        return cls(f"DEN-{ano}-{sequencial:05d}")


@dataclass
class Denuncia:
    """
    Entidade de manifestação popular / ouvidoria fiscal
    """
    id: uuid.UUID
    numero_protocolo: NumeroProtocoloDenuncia
    local_denunciado_identificacao: str
    relato_denuncia: str
    data_recebimento: datetime = field(default_factory=datetime.now)
    origem: CanalDenuncia = CanalDenuncia.FORMULARIO_WEB
    gravidade: GravidadeDenuncia = GravidadeDenuncia.MEDIA
    status: StatusDenuncia = StatusDenuncia.RECEBIDA

    # Associação com Estabelecimento Cadastrado (Opcional, pois pode ser clandestino ou ambulante)
    estabelecimento_id: Optional[uuid.UUID] = None

    # Localização Geográfica
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    ponto_referencia: Optional[str] = None

    # Dados do Denunciante (Controle de Sigilo e Anonimato)
    denunciante_anonimo: bool = True
    denunciante_nome: Optional[str] = None
    denunciante_telefone: Optional[str] = None
    denunciante_email: Optional[str] = None

    # Evidências e Anexos Digitais (JSONB)
    url_anexos_evidencias: List[Dict[str, Any]] = field(default_factory=list)

    # Tramitação, Apuração e Encerramento
    fiscal_designado_id: Optional[uuid.UUID] = None
    despacho_coordenacao: Optional[str] = None
    conclusao_apuracao: Optional[str] = None
    resposta_ao_denunciante: Optional[str] = None
    data_encerramento: Optional[datetime] = None
    finalizado_por: Optional[uuid.UUID] = None

    # Soft Delete Universal e Auditoria
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=datetime.now)
    atualizado_em: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        if not self.local_denunciado_identificacao or not self.local_denunciado_identificacao.strip():
            raise ValueError("A identificação do local denunciado é obrigatória.")
        if not self.relato_denuncia or not self.relato_denuncia.strip():
            raise ValueError("O relato detalhado dos fatos da denúncia é obrigatório.")

        # Invariante de Anonimato: Se denunciante_anonimo=True, dados civis não devem constar
        if self.denunciante_anonimo:
            self.denunciante_nome = None
            self.denunciante_telefone = None
            self.denunciante_email = None

    def despachar(
        self,
        fiscal_id: Optional[uuid.UUID],
        despacho: str,
        nova_gravidade: Optional[GravidadeDenuncia] = None,
        iniciar_apuracao: bool = True,
    ) -> None:
        if self.status in [StatusDenuncia.PROCEDENTE, StatusDenuncia.IMPROCEDENTE, StatusDenuncia.ARQUIVADA]:
            raise ValueError(f"Não é possível despachar uma denúncia já encerrada com status '{self.status.value}'.")

        self.fiscal_designado_id = fiscal_id
        self.despacho_coordenacao = despacho.strip()
        if nova_gravidade:
            self.gravidade = nova_gravidade

        if iniciar_apuracao and fiscal_id:
            self.status = StatusDenuncia.EM_APURACAO_FISCAL
        else:
            self.status = StatusDenuncia.EM_ANALISE

        self.atualizado_em = datetime.now()

    def concluir(
        self,
        finalizado_por_id: uuid.UUID,
        status_final: StatusDenuncia,
        conclusao: str,
        resposta_denunciante: Optional[str] = None,
    ) -> None:
        if status_final not in [StatusDenuncia.PROCEDENTE, StatusDenuncia.IMPROCEDENTE, StatusDenuncia.ARQUIVADA]:
            raise ValueError("O encerramento da denúncia deve resultar em 'procedente', 'improcedente' ou 'arquivada'.")
        if not conclusao or not conclusao.strip():
            raise ValueError("A conclusão da apuração fiscal é obrigatória para o encerramento do processo.")

        self.status = status_final
        self.conclusao_apuracao = conclusao.strip()
        self.resposta_ao_denunciante = (resposta_denunciante or "").strip() or None
        self.data_encerramento = datetime.now()
        self.finalizado_por = finalizado_por_id
        self.atualizado_em = datetime.now()
