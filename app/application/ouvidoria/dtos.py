"""
DTOs Pydantic v2 para Ouvidoria e Denúncias Sanitárias
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.domain.ouvidoria.enums import CanalDenuncia, GravidadeDenuncia, StatusDenuncia


class RegistrarDenunciaInputDTO(BaseModel):
    local_denunciado_identificacao: str = Field(..., max_length=255)
    relato_denuncia: str = Field(...)
    origem: CanalDenuncia = Field(default=CanalDenuncia.FORMULARIO_WEB)
    gravidade: GravidadeDenuncia = Field(default=GravidadeDenuncia.MEDIA)
    estabelecimento_id: Optional[uuid.UUID] = None

    logradouro: Optional[str] = Field(None, max_length=255)
    numero: Optional[str] = Field(None, max_length=20)
    bairro: Optional[str] = Field(None, max_length=100)
    ponto_referencia: Optional[str] = None

    denunciante_anonimo: bool = Field(default=True)
    denunciante_nome: Optional[str] = Field(None, max_length=200)
    denunciante_telefone: Optional[str] = Field(None, max_length=20)
    denunciante_email: Optional[str] = Field(None, max_length=150)

    url_anexos_evidencias: List[Dict[str, Any]] = Field(default_factory=list)


class DespacharDenunciaInputDTO(BaseModel):
    fiscal_designado_id: Optional[uuid.UUID] = None
    despacho_coordenacao: str = Field(...)
    nova_gravidade: Optional[GravidadeDenuncia] = None
    iniciar_apuracao: bool = Field(default=True)


class ConcluirDenunciaInputDTO(BaseModel):
    status: StatusDenuncia = Field(...)
    conclusao_apuracao: str = Field(...)
    resposta_ao_denunciante: Optional[str] = None


class DenunciaOutputDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_protocolo: str
    data_recebimento: datetime
    origem: CanalDenuncia
    gravidade: GravidadeDenuncia
    status: StatusDenuncia
    estabelecimento_id: Optional[uuid.UUID]
    local_denunciado_identificacao: str
    logradouro: Optional[str]
    numero: Optional[str]
    bairro: Optional[str]
    ponto_referencia: Optional[str]
    denunciante_anonimo: bool
    denunciante_nome: Optional[str]
    denunciante_telefone: Optional[str]
    denunciante_email: Optional[str]
    url_anexos_evidencias: List[Dict[str, Any]]
    fiscal_designado_id: Optional[uuid.UUID]
    despacho_coordenacao: Optional[str]
    conclusao_apuracao: Optional[str]
    resposta_ao_denunciante: Optional[str]
    data_encerramento: Optional[datetime]
    finalizado_por: Optional[uuid.UUID]
    criado_em: datetime


class DenunciaPublicaOutputDTO(BaseModel):
    """
    DTO para consulta pública pelo cidadão: dados sensíveis do denunciante são omitidos por sigilo
    """
    numero_protocolo: str
    data_recebimento: datetime
    status: StatusDenuncia
    gravidade: GravidadeDenuncia
    local_denunciado_identificacao: str
    resposta_ao_denunciante: Optional[str]
    data_encerramento: Optional[datetime]


class FilaTrabalhoDenunciaOutputDTO(BaseModel):
    id: uuid.UUID
    numero_protocolo: str
    data_recebimento: datetime
    gravidade: str
    status: str
    local_denunciado_identificacao: str
    bairro: Optional[str]
    estabelecimento_cadastrado: Optional[str]
    fiscal_designado: Optional[str]
    dias_em_aberto: int


class PaginatedDenunciasOutputDTO(BaseModel):
    total: int
    skip: int
    limit: int
    items: List[DenunciaOutputDTO]
