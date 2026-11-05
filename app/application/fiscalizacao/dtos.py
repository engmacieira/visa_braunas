import uuid
from datetime import date, datetime, time
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)


class InspecaoCreateDTO(BaseModel):
    numero_termo: str = Field(..., min_length=2, max_length=50, description="Numeração oficial do termo (ex: TI-2026/001)")
    estabelecimento_id: uuid.UUID
    fiscal_responsavel_id: uuid.UUID
    motivo: TipoMotivoInspecao = Field(default=TipoMotivoInspecao.ROTINA_PROGRAMADA)
    data_inicio: date = Field(..., description="Data de realização da vistoria")
    data_agendamento: Optional[date] = None
    hora_inspecao: Optional[time] = None
    fiscais_acompanhantes: Optional[str] = None
    requerimento_id: Optional[uuid.UUID] = None
    denuncia_id: Optional[uuid.UUID] = None

    # Específico para VAPT (Saúde do Trabalhador - Indicador 11)
    nome_local_trabalho: Optional[str] = Field(None, max_length=200)
    principais_riscos_identificados: Optional[str] = Field(None, max_length=1500)
    recomendacoes_orientacoes: Optional[str] = Field(None, max_length=1500)


class InspecaoConcluirDTO(BaseModel):
    resultado: ResultadoInspecao = Field(..., description="Parecer/Desfecho conclusivo da vistoria")
    data_fim: date = Field(..., description="Data de conclusão do laudo")
    relato_vistoria: str = Field(..., min_length=5, description="Relatório descritivo dos fatos constatados in loco")
    irregularidades_constatadas: Optional[str] = None
    exigencias_notificadas: Optional[str] = None
    prazo_adequacao_dias: int = Field(default=0, ge=0, description="Prazo em dias para notificação")
    data_limite_adequacao: Optional[date] = None

    checklist_respostas: Optional[Dict[str, Any]] = None
    relatorio_fotografico: Optional[List[Dict[str, Any]]] = None
    nome_pessoa_acompanhou: Optional[str] = Field(None, max_length=200)
    cpf_pessoa_acompanhou: Optional[str] = Field(None, max_length=14)
    url_termo_assinado_pdf: Optional[str] = None


class InspecaoUpdateDTO(BaseModel):
    data_agendamento: Optional[date] = None
    data_inicio: Optional[date] = None
    hora_inspecao: Optional[time] = None
    fiscal_responsavel_id: Optional[uuid.UUID] = None
    fiscais_acompanhantes: Optional[str] = None
    nome_local_trabalho: Optional[str] = None
    principais_riscos_identificados: Optional[str] = None
    recomendacoes_orientacoes: Optional[str] = None
    url_termo_assinado_pdf: Optional[str] = None


class InspecaoResponseDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    numero_termo: str
    motivo: TipoMotivoInspecao
    status: StatusInspecao
    estabelecimento_id: uuid.UUID
    fiscal_responsavel_id: uuid.UUID

    requerimento_id: Optional[uuid.UUID] = None
    denuncia_id: Optional[uuid.UUID] = None
    fiscais_acompanhantes: Optional[str] = None

    data_agendamento: Optional[date] = None
    data_inicio: date
    data_fim: Optional[date] = None
    hora_inspecao: Optional[time] = None

    resultado: Optional[ResultadoInspecao] = None
    nome_pessoa_acompanhou: Optional[str] = None
    cpf_pessoa_acompanhou: Optional[str] = None

    relato_vistoria: Optional[str] = None
    irregularidades_constatadas: Optional[str] = None
    exigencias_notificadas: Optional[str] = None
    prazo_adequacao_dias: int
    data_limite_adequacao: Optional[date] = None

    nome_local_trabalho: Optional[str] = None
    principais_riscos_identificados: Optional[str] = None
    recomendacoes_orientacoes: Optional[str] = None

    checklist_respostas: Dict[str, Any] = {}
    relatorio_fotografico: List[Dict[str, Any]] = []
    url_termo_assinado_pdf: Optional[str] = None

    is_active: bool
    criado_em: datetime
    atualizado_em: datetime


class Indicador11ConsolidadoDTO(BaseModel):
    exercicio: int
    total_acoes_vapt: int
    vapt_concluidas: int
    vapt_em_acompanhamento: int


class NotificacaoPrazoAlertaDTO(BaseModel):
    inspecao_id: uuid.UUID
    numero_termo: str
    estabelecimento_id: uuid.UUID
    razao_social: str
    nome_fantasia: Optional[str] = None
    fiscal_responsavel: str
    data_limite_adequacao: date
    dias_restantes: int
