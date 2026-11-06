/**
 * Tipagens do Módulo de Indicadores Sanitários, Metas Pactuadas e Relatórios Oficiais SUS
 * Mapeia as projeções CQRS (Read Models) do backend FastAPI (VigiMinas - Braúnas/MG).
 */

export interface ProgressoMetaItem {
  meta_pactuada: number;
  realizado: number;
  percentual_atingido: number;
  status: "Atingida" | "Em Andamento" | "Crítica" | string;
}

export interface IndicadorMetaItem {
  codigo: "IND-11" | "IND-12" | "IND-13" | "IND-14" | "IND-15" | string;
  titulo: string;
  descricao: string;
  unidade: string;
  progresso: ProgressoMetaItem;
}

export interface DashboardIndicadoresResponse {
  ano_exercicio: number;
  indicador_11_vapt: IndicadorMetaItem;
  indicador_12_risco_3: IndicadorMetaItem;
  indicador_13_risco_2: IndicadorMetaItem;
  indicador_14_risco_1: IndicadorMetaItem;
  indicador_15_sintetico: IndicadorMetaItem;
  total_estabelecimentos_cadastrados: number;
  distribuicao_estabelecimentos_por_risco: Record<string, number>;
  total_inspecoes_exercicio: number;
  total_alvaras_ativos: number;
  atualizado_em: string;
}

export interface AlertaNotificacaoItem {
  inspecao_id: string;
  numero_termo: string;
  estabelecimento_id: string;
  razao_social: string;
  cnpj_cpf: string;
  fiscal_responsavel: string;
  data_inicio: string;
  data_limite_cumprimento: string;
  dias_restantes: number;
  urgencia_vencimento: "vencido" | "critico" | "atencao" | string;
}

export interface AlertaDocumentoItem {
  documento_id: string;
  estabelecimento_id: string;
  razao_social: string;
  nome_documento: string;
  categoria: string;
  data_vencimento: string;
  dias_para_vencimento: number;
  status_vigencia: string;
}

export interface AlertasVencimentoResponse {
  total_notificacoes_criticas: number;
  total_documentos_vencendo: number;
  notificacoes: AlertaNotificacaoItem[];
  documentos: AlertaDocumentoItem[];
}

export interface ItemEstabelecimentoCobertura {
  id: string;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string | null;
  grau_risco: string;
  fiscalizado_no_exercicio: boolean;
  data_ultima_inspecao?: string | null;
  resultado_ultima_inspecao?: string | null;
  situacao_alvara: string;
  numero_alvara?: string | null;
}

export interface EstatisticasRiscoDTO {
  ano_exercicio: number;
  grau_risco: string;
  total_estabelecimentos_cadastrados: number;
  total_estabelecimentos_fiscalizados: number;
  percentual_cobertura_realizado: number;
  meta_cobertura_pactuada: number;
  status_cobertura: string;
  estabelecimentos?: ItemEstabelecimentoCobertura[];
}

export interface MetasExercicioDTO {
  ano_exercicio: number;
  meta_inspecoes_vapt: number;
  meta_cobertura_risco_1: number;
  meta_cobertura_risco_2: number;
  meta_cobertura_risco_3: number;
  dias_validade_padrao_alvara: number;
  dias_prazo_padrao_notificacao: number;
}

export interface HistoricoExercicioVapt {
  ano_exercicio: number;
  total_inspecoes_vapt: number;
  inspecoes_concluidas: number;
  inspecoes_em_andamento: number;
  estabelecimentos_distintos_atendidos: number;
}

export interface RelatorioIndicador11DetalhadoResponse {
  ano_exercicio: number;
  meta_pactuada: number;
  total_acoes_realizadas: number;
  acoes_concluidas: number;
  acoes_em_andamento: number;
  estabelecimentos_distintos_atendidos: number;
  percentual_atingido: number;
  status_cumprimento: string;
  historico_exercicios: HistoricoExercicioVapt[];
}

export interface RelatorioSusDTO {
  municipio: string;
  uf: string;
  nome_prefeitura: string;
  nome_secretaria: string;
  nome_coordenadoria: string;
  ano_exercicio: number;
  data_emissao_relatorio: string;
  indicadores_sintese: IndicadorMetaItem[];
  resumo_geral: {
    total_estabelecimentos_cadastrados?: number;
    distribuicao_por_risco?: Record<string, number>;
    total_inspecoes_exercicio?: number;
    total_alvaras_ativos?: number;
    acoes_vapt_concluidas?: number;
    status_geral_metas?: string;
    [key: string]: unknown;
  };
}

export interface EvolucaoMensalInspecao {
  mes: string;
  mesAbreviado: string;
  rotina: number;
  vapt: number;
  total: number;
}
