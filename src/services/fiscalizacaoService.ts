/**
 * Serviço de Integração com os Endpoints de Fiscalização e Inspeções Sanitárias
 * Centraliza requisições HTTP REST com tipagem estrita para o módulo de campo.
 */

import { apiClient } from "./apiClient";
import {
  AgendarInspecaoFormValues,
  Indicador11Consolidado,
  InspecaoDetalhe,
  InspecaoFilters,
  InspecaoListItem,
  LaudoConclusaoFormValues,
  NotificacaoPrazoAlerta,
} from "../types/fiscalizacao";

export const fiscalizacaoService = {
  /**
   * Lista termos e inspeções fiscais com filtros avançados.
   */
  async listarInspecoes(
    filters: InspecaoFilters = {}
  ): Promise<InspecaoListItem[]> {
    const params: Record<string, string | number | boolean> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
      only_active: filters.only_active ?? true,
    };

    if (filters.estabelecimento_id) {
      params.estabelecimento_id = filters.estabelecimento_id;
    }
    if (filters.fiscal_id) {
      params.fiscal_id = filters.fiscal_id;
    }
    if (filters.motivo) {
      params.motivo = filters.motivo;
    }
    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.data_inicio_de) {
      params.data_inicio_de = filters.data_inicio_de;
    }
    if (filters.data_inicio_ate) {
      params.data_inicio_ate = filters.data_inicio_ate;
    }

    const response = await apiClient.get<InspecaoListItem[]>("/inspecoes", {
      params,
    });
    return response.data;
  },

  /**
   * Obtém ficha detalhada de uma inspeção fiscal por UUID.
   */
  async obterInspecaoPorId(id: string): Promise<InspecaoDetalhe> {
    const response = await apiClient.get<InspecaoDetalhe>(`/inspecoes/${id}`);
    return response.data;
  },

  /**
   * Agenda ou abre um novo termo de vistoria sanitária.
   */
  async agendarInspecao(
    payload: AgendarInspecaoFormValues
  ): Promise<InspecaoDetalhe> {
    const dto = {
      numero_termo: payload.numero_termo.trim(),
      estabelecimento_id: payload.estabelecimento_id,
      fiscal_responsavel_id: payload.fiscal_responsavel_id,
      motivo: payload.motivo,
      data_inicio: payload.data_inicio,
      data_agendamento: payload.data_agendamento || null,
      hora_inspecao: payload.hora_inspecao || null,
      fiscais_acompanhantes: payload.fiscais_acompanhantes?.trim() || null,
      requerimento_id: payload.requerimento_id || null,
      denuncia_id: payload.denuncia_id || null,
      nome_local_trabalho: payload.nome_local_trabalho?.trim() || null,
      principais_riscos_identificados:
        payload.principais_riscos_identificados?.trim() || null,
      recomendacoes_orientacoes:
        payload.recomendacoes_orientacoes?.trim() || null,
    };

    const response = await apiClient.post<InspecaoDetalhe>("/inspecoes", dto);
    return response.data;
  },

  /**
   * Conclui a vistoria emitindo o laudo técnico definitivo.
   */
  async concluirInspecao(
    id: string,
    payload: LaudoConclusaoFormValues
  ): Promise<InspecaoDetalhe> {
    const dto = {
      resultado: payload.resultado,
      data_fim: payload.data_fim,
      relato_vistoria: payload.relato_vistoria.trim(),
      irregularidades_constatadas:
        payload.irregularidades_constatadas?.trim() || null,
      exigencias_notificadas: payload.exigencias_notificadas?.trim() || null,
      prazo_adequacao_dias: Number(payload.prazo_adequacao_dias || 0),
      data_limite_adequacao: payload.data_limite_adequacao || null,
      checklist_respostas: payload.checklist_respostas || {},
      relatorio_fotografico: payload.relatorio_fotografico || [],
      nome_pessoa_acompanhou: payload.nome_pessoa_acompanhou?.trim() || null,
      cpf_pessoa_acompanhou:
        payload.cpf_pessoa_acompanhou?.replace(/\D/g, "") || null,
      url_termo_assinado_pdf: payload.url_termo_assinado_pdf?.trim() || null,
    };

    const response = await apiClient.patch<InspecaoDetalhe>(
      `/inspecoes/${id}/concluir`,
      dto
    );
    return response.data;
  },

  /**
   * Consulta a lista de notificações com contagem regressiva de prazos a vencer.
   */
  async listarNotificacoesPendentes(
    limiteDias: number = 30
  ): Promise<NotificacaoPrazoAlerta[]> {
    const response = await apiClient.get<NotificacaoPrazoAlerta[]>(
      "/inspecoes/alertas/notificacoes-pendentes",
      {
        params: { limite_dias: limiteDias },
      }
    );
    return response.data;
  },

  /**
   * Totaliza o Indicador 11 de ações VAPT.
   */
  async obterIndicador11Vapt(
    exercicio?: number
  ): Promise<Indicador11Consolidado[]> {
    const params = exercicio ? { exercicio } : {};
    const response = await apiClient.get<Indicador11Consolidado[]>(
      "/inspecoes/indicadores/vapt",
      { params }
    );
    return response.data;
  },
};

export default fiscalizacaoService;
