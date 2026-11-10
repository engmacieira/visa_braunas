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


class IndicadorUniversalDetalheDTO(BaseModel):
    codigo: str = Field(..., description="Ex: 'IND-11', 'IND-12', 'IND-13', 'IND-14', 'IND-15'")
    numero: int = Field(..., description="11, 12, 13, 14, 15")
    titulo: str
    descricao: str
    unidade: str = Field(default="%", description="% ou inspeções ou remessas")
    peso_financeiro_percentual: float = Field(default=5.0, description="Peso oficial de 5% no Bloco Universal")
    numerador: float = Field(..., description="Quantidade apurada ou realizada no exercício")
    denominador: float = Field(..., description="Universo total de estabelecimentos ou meta quantitativa")
    meta_pactuada: float = Field(..., description="Meta nominal pactuada (ex: 2 para VAPT, 1 para Cadastro)")
    meta_percentual: float = Field(..., description="Meta percentual oficial (ex: 15% para R1, 90% para R2, 100% para R3)")
    percentual_alcancado: float = Field(..., description="Percentual real atingido em relação à meta")
    atingiu_meta: bool = Field(..., description="Verdadeiro se cumpriu o limiar mínimo oficial")
    status: str = Field(..., description="Atingida, Em Andamento, Crítica")
    pontuacao_alcancada: float = Field(..., description="Pontos auferidos no repasse financeiro (0.0 a 5.0)")
    grau_risco_rotulo: Optional[str] = Field(default=None, description="Rótulo da categoria regulatória")
    estabelecimentos: List[ItemEstabelecimentoCoberturaDTO] = Field(default_factory=list)
    progresso: ProgressoMetaDTO


class BlocoUniversalResumoDTO(BaseModel):
    peso_total_percentual: float = Field(default=25.0, description="Soma dos pesos dos 5 indicadores (5 x 5% = 25%)")
    pontuacao_total_alcancada: float = Field(..., description="Soma ponderada dos pontos obtidos (0.0 a 25.0)")
    percentual_atingido_bloco: float = Field(..., description="Percentual geral de aproveitamento do Bloco Universal")
    status_bloco: str = Field(..., description="Excelente, Regular, Crítico")
    total_indicadores_atingidos: int = Field(..., description="Quantidade de indicadores cumpridos (0 a 5)")


class DashboardMetasConsolidadoDTO(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ano_exercicio: int
    bloco_universal: BlocoUniversalResumoDTO
    indicadores: List[IndicadorUniversalDetalheDTO]

    # Indicadores oficiais SES/MG (Braúnas/MG)
    indicador_11: IndicadorUniversalDetalheDTO
    indicador_12: IndicadorUniversalDetalheDTO
    indicador_13: IndicadorUniversalDetalheDTO
    indicador_14: IndicadorUniversalDetalheDTO
    indicador_15: IndicadorUniversalDetalheDTO

    # Retrocompatibilidade com testes e contratos legados
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
