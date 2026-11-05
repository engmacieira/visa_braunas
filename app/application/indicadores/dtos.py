"""
DTOs Pydantic v2 para Indicadores Sanitários, Metas e Relatórios Oficiais (CQRS Read Projections)
"""
from datetime import date, datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from pydantic import BaseModel, ConfigDict, Field


class ProgressoMetaDTO(BaseModel):
    meta_pactuada: float
    realizado: float
    percentual_atingido: float
    status: str = Field(..., description="Atingida, Em Andamento, Crítica")


class IndicadorItemDTO(BaseModel):
    codigo: str = Field(..., description="Ex: 'IND-11', 'IND-12', 'IND-13', 'IND-14', 'IND-15'")
    titulo: str
    descricao: str
    unidade: str = Field(default="%", description="% ou inspeções")
    progresso: ProgressoMetaDTO


class DashboardMetasConsolidadoDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano_exercicio: int
    indicador_11_vapt: IndicadorItemDTO
    indicador_12_risco_3: IndicadorItemDTO
    indicador_13_risco_2: IndicadorItemDTO
    indicador_14_risco_1: IndicadorItemDTO
    indicador_15_sintetico: IndicadorItemDTO

    total_estabelecimentos_cadastrados: int
    distribuicao_estabelecimentos_por_risco: Dict[str, int]
    total_inspecoes_exercicio: int
    total_alvaras_ativos: int
    atualizado_em: datetime


class RelatorioIndicador11DetalhadoDTO(BaseModel):
    ano_exercicio: int
    meta_pactuada: int
    total_acoes_realizadas: int
    acoes_concluidas: int
    acoes_em_andamento: int
    estabelecimentos_distintos_atendidos: int
    percentual_atingido: float
    status_cumprimento: str
    historico_exercicios: List[Dict[str, Any]]


class ItemEstabelecimentoCoberturaDTO(BaseModel):
    id: uuid.UUID
    cnpj_cpf: str
    razao_social: str
    nome_fantasia: Optional[str] = None
    grau_risco: str
    fiscalizado_no_exercicio: bool
    data_ultima_inspecao: Optional[str] = None
    resultado_ultima_inspecao: Optional[str] = None
    situacao_alvara: str
    numero_alvara: Optional[str] = None


class RelatorioRiscoCoberturaDTO(BaseModel):
    ano_exercicio: int
    grau_risco: str
    total_estabelecimentos_cadastrados: int
    total_estabelecimentos_fiscalizados: int
    percentual_cobertura_realizado: float
    meta_cobertura_pactuada: float
    status_cobertura: str
    estabelecimentos: List[ItemEstabelecimentoCoberturaDTO]


class ItemAlertaNotificacaoDTO(BaseModel):
    inspecao_id: uuid.UUID
    numero_termo: str
    estabelecimento_id: uuid.UUID
    razao_social: str
    cnpj_cpf: str
    fiscal_responsavel: str
    data_inicio: str
    data_limite_cumprimento: str
    dias_restantes: int
    urgencia_vencimento: str


class ItemAlertaDocumentoDTO(BaseModel):
    documento_id: uuid.UUID
    estabelecimento_id: uuid.UUID
    razao_social: str
    nome_documento: str
    categoria: str
    data_vencimento: str
    dias_para_vencimento: int
    status_vigencia: str


class PainelAlertasVencimentoDTO(BaseModel):
    total_notificacoes_criticas: int
    total_documentos_vencendo: int
    notificacoes: List[ItemAlertaNotificacaoDTO]
    documentos: List[ItemAlertaDocumentoDTO]


class RelatorioOficialExercicioDTO(BaseModel):
    municipio: str
    uf: str
    nome_prefeitura: str
    nome_secretaria: str
    nome_coordenadoria: str
    ano_exercicio: int
    data_emissao_relatorio: str
    indicadores_sintese: List[IndicadorItemDTO]
    resumo_geral: Dict[str, Any]
