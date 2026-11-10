/**
 * Custom Hooks TanStack Query (v5) para Indicadores Sanitários & Relatórios Oficiais
 * Configura cache inteligente com staleTime de 5 minutos, sincronizado com o backend.
 */

import { useQuery } from "@tanstack/react-query";
import { indicadoresService } from "../services/indicadoresService";
import {
  AlertasVencimentoResponse,
  DashboardIndicadoresResponse,
  EstatisticasRiscoDTO,
  IndicadorUniversalDetalheItem,
  MetasExercicioDTO,
  RelatorioIndicador11DetalhadoResponse,
  RelatorioSusDTO,
} from "../types/indicadores";

const CINCO_MINUTOS = 5 * 60 * 1000;

export const INDICADORES_QUERY_KEYS = {
  dashboard: (ano?: number) => ["indicadores", "dashboard", ano ?? "corrente"] as const,
  metas: (ano?: number) => ["indicadores", "metas", ano ?? 2026] as const,
  alertas: (limiteDias?: number) => ["indicadores", "alertas", limiteDias ?? 30] as const,
  relatorioSus: (ano?: number) => ["indicadores", "relatorio-sus", ano ?? "corrente"] as const,
  vapt11: (ano?: number) => ["indicadores", "vapt-11", ano ?? "corrente"] as const,
  coberturaRisco: (grau: string, ano?: number, apenasPendentes?: boolean) =>
    ["indicadores", "cobertura", grau, ano ?? "corrente", apenasPendentes ? "pendentes" : "todos"] as const,
  detalhes: (indicadorNumero: number, ano?: number) =>
    ["indicadores", "detalhes", indicadorNumero, ano ?? "corrente"] as const,
};

/**
 * Consulta o dashboard consolidado de metas (Indicadores 11 a 15)
 */
export function useDashboardIndicadores(ano?: number) {
  return useQuery<DashboardIndicadoresResponse>({
    queryKey: INDICADORES_QUERY_KEYS.dashboard(ano),
    queryFn: () => indicadoresService.obterDashboardIndicadores(ano),
    staleTime: CINCO_MINUTOS,
  });
}

/**
 * Consulta as metas pactuadas para o exercício informado
 */
export function useMetasExercicio(ano: number = 2026) {
  return useQuery<MetasExercicioDTO>({
    queryKey: INDICADORES_QUERY_KEYS.metas(ano),
    queryFn: () => indicadoresService.obterMetasExercicio(ano),
    staleTime: CINCO_MINUTOS,
  });
}

/**
 * Consulta o painel de alertas operacionais de vencimento
 */
export function useAlertasVencimento(limiteDias: number = 30) {
  return useQuery<AlertasVencimentoResponse>({
    queryKey: INDICADORES_QUERY_KEYS.alertas(limiteDias),
    queryFn: () => indicadoresService.obterAlertasVencimento(limiteDias),
    staleTime: CINCO_MINUTOS,
  });
}

/**
 * Consulta os dados do Relatório Oficial SUS para prestação de contas (A4 / DIGISUS)
 */
export function useRelatorioSus(ano?: number) {
  return useQuery<RelatorioSusDTO>({
    queryKey: INDICADORES_QUERY_KEYS.relatorioSus(ano),
    queryFn: () => indicadoresService.obterRelatorioSus(ano),
    staleTime: CINCO_MINUTOS,
  });
}

/**
 * Consulta o detalhamento analítico do Indicador 11 (VAPT)
 */
export function useRelatorioIndicador11(ano?: number) {
  return useQuery<RelatorioIndicador11DetalhadoResponse>({
    queryKey: INDICADORES_QUERY_KEYS.vapt11(ano),
    queryFn: () => indicadoresService.obterRelatorioIndicador11(ano),
    staleTime: CINCO_MINUTOS,
  });
}

/**
 * Consulta a cobertura de estabelecimentos inspecionados por grau de risco
 */
export function useCoberturaRisco(
  grauRisco: string,
  ano?: number,
  apenasPendentes: boolean = false
) {
  return useQuery<EstatisticasRiscoDTO>({
    queryKey: INDICADORES_QUERY_KEYS.coberturaRisco(grauRisco, ano, apenasPendentes),
    queryFn: () => indicadoresService.obterCoberturaPorRisco(grauRisco, ano, apenasPendentes),
    staleTime: CINCO_MINUTOS,
    enabled: Boolean(grauRisco),
  });
}

/**
 * Consulta o detalhamento com a lista de estabelecimentos de um Indicador Universal (11 a 15)
 */
export function useDetalhesIndicador(indicadorNumero: number | null, ano?: number) {
  return useQuery<IndicadorUniversalDetalheItem>({
    queryKey: indicadorNumero ? INDICADORES_QUERY_KEYS.detalhes(indicadorNumero, ano) : ["indicadores", "detalhes", "none"],
    queryFn: () => indicadoresService.obterDetalhesIndicador(indicadorNumero!, ano),
    staleTime: CINCO_MINUTOS,
    enabled: Boolean(indicadorNumero && indicadorNumero >= 11 && indicadorNumero <= 15),
  });
}
