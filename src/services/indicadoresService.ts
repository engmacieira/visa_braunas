/**
 * Serviço de Integração com a API de Indicadores Sanitários & Relatórios Oficiais (CQRS)
 * Consome os endpoints do backend FastAPI via cliente Axios tipado.
 */

import { apiClient } from "./apiClient";
import {
  AlertasVencimentoResponse,
  DashboardIndicadoresResponse,
  EstatisticasRiscoDTO,
  IndicadorUniversalDetalheItem,
  MetasExercicioDTO,
  RelatorioIndicador11DetalhadoResponse,
  RelatorioSusDTO,
} from "../types/indicadores";

export const indicadoresService = {
  /**
   * Obtém o dashboard consolidado de metas e indicadores regulatórios (11 a 15)
   */
  async obterDashboardIndicadores(ano?: number): Promise<DashboardIndicadoresResponse> {
    const res = await apiClient.get<DashboardIndicadoresResponse>("/indicadores/dashboard", {
      params: ano ? { ano } : undefined,
    });
    return res.data;
  },

  /**
   * Obtém o pacto de metas fixadas para o exercício informado
   */
  async obterMetasExercicio(ano: number = 2026): Promise<MetasExercicioDTO> {
    try {
      const res = await apiClient.get<MetasExercicioDTO>(`/indicadores/metas/${ano}`);
      return res.data;
    } catch {
      // Fallback gracioso com valores normativos do município
      return {
        ano_exercicio: ano,
        meta_inspecoes_vapt: 20,
        meta_cobertura_risco_1: 100.0,
        meta_cobertura_risco_2: 100.0,
        meta_cobertura_risco_3: 100.0,
        dias_validade_padrao_alvara: 365,
        dias_prazo_padrao_notificacao: 30,
      };
    }
  },

  /**
   * Obtém o painel de alertas com notificações e documentos próximos ao vencimento
   */
  async obterAlertasVencimento(limiteDias: number = 30): Promise<AlertasVencimentoResponse> {
    const res = await apiClient.get<AlertasVencimentoResponse>("/indicadores/alertas", {
      params: { limite_dias: limiteDias },
    });
    return res.data;
  },

  /**
   * Obtém os dados completos do relatório oficial de prestação de contas SUS (DIGISUS / Sargsus)
   */
  async obterRelatorioSus(ano?: number): Promise<RelatorioSusDTO> {
    const anoAlvo = ano || new Date().getFullYear();
    try {
      const res = await apiClient.get<RelatorioSusDTO>(`/indicadores/relatorio-sus/${anoAlvo}`);
      return res.data;
    } catch {
      const fallback = await apiClient.get<RelatorioSusDTO>("/indicadores/relatorio-oficial", {
        params: { ano: anoAlvo },
      });
      return fallback.data;
    }
  },

  /**
   * Obtém o relatório analítico do Indicador 11 (VAPT - Saúde do Trabalhador)
   */
  async obterRelatorioIndicador11(ano?: number): Promise<RelatorioIndicador11DetalhadoResponse> {
    const res = await apiClient.get<RelatorioIndicador11DetalhadoResponse>("/indicadores/vapt-11", {
      params: ano ? { ano } : undefined,
    });
    return res.data;
  },

  /**
   * Obtém o relatório de cobertura sanitária por grau de risco (Indicadores 12, 13 e 14)
   */
  async obterCoberturaPorRisco(
    grauRisco: string,
    ano?: number,
    apenasPendentes: boolean = false
  ): Promise<EstatisticasRiscoDTO> {
    const res = await apiClient.get<EstatisticasRiscoDTO>(`/indicadores/cobertura-risco/${grauRisco}`, {
      params: {
        ano,
        apenas_pendentes: apenasPendentes,
      },
    });
    return res.data;
  },

  /**
   * Obtém o detalhamento de um Indicador Universal (11 a 15) com a lista de estabelecimentos vinculados
   */
  async obterDetalhesIndicador(
    indicadorNumero: number,
    ano?: number
  ): Promise<IndicadorUniversalDetalheItem> {
    const res = await apiClient.get<IndicadorUniversalDetalheItem>(`/indicadores/detalhes/${indicadorNumero}`, {
      params: ano ? { ano } : undefined,
    });
    return res.data;
  },
};
