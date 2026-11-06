/**
 * Serviço de Integração com os Endpoints de Ouvidoria e Denúncias Sanitárias
 * Centraliza requisições REST tipadas para triagem, despacho fiscal e consulta cidadã.
 */

import axios from "axios";
import { apiClient } from "./apiClient";
import { APP_CONFIG } from "../config/app.config";
import {
  ConcluirDenunciaDTO,
  DenunciaDetalhe,
  DenunciaFilters,
  DenunciaListItem,
  DenunciaPublicaConsulta,
  DespacharDenunciaDTO,
  FilaTrabalhoDenuncia,
  PaginatedDenuncias,
  RegistrarDenunciaDTO,
} from "../types/ouvidoria";
import { EstabelecimentoDetalhe } from "../types/estabelecimento";

// Cliente público isolado sem interceptors de autenticação
const publicApiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

export const ouvidoriaService = {
  /**
   * Lista denúncias com filtros avançados e paginação.
   */
  async listarDenuncias(
    filters: DenunciaFilters = {}
  ): Promise<PaginatedDenuncias> {
    const params: Record<string, string | number | boolean> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
    };

    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.gravidade) {
      params.gravidade = filters.gravidade;
    }
    if (filters.fiscal_id) {
      params.fiscal_id = filters.fiscal_id;
    }
    if (filters.estabelecimento_id) {
      params.estabelecimento_id = filters.estabelecimento_id;
    }

    const response = await apiClient.get<PaginatedDenuncias>("/denuncias", {
      params,
    });
    return response.data;
  },

  /**
   * Obtém a fila priorizada de denúncias a apurar (painel de gestão).
   */
  async listarFilaTrabalho(
    skip: number = 0,
    limit: number = 50
  ): Promise<FilaTrabalhoDenuncia[]> {
    const response = await apiClient.get<FilaTrabalhoDenuncia[]>(
      "/denuncias/fila-trabalho",
      {
        params: { skip, limit },
      }
    );
    return response.data;
  },

  /**
   * Obtém os detalhes completos de uma denúncia por UUID.
   */
  async obterDenunciaPorId(id: string): Promise<DenunciaDetalhe> {
    const response = await apiClient.get<DenunciaListItem>(`/denuncias/${id}`);
    const denuncia = response.data;

    let estabData = null;
    if (denuncia.estabelecimento_id) {
      try {
        const estabResp = await apiClient.get<EstabelecimentoDetalhe>(
          `/estabelecimentos/${denuncia.estabelecimento_id}`
        );
        estabData = {
          id: estabResp.data.id,
          razao_social: estabResp.data.razao_social,
          nome_fantasia: estabResp.data.nome_fantasia,
          cnpj_cpf: estabResp.data.cnpj_cpf,
          logradouro: estabResp.data.logradouro,
          numero: estabResp.data.numero,
          bairro: estabResp.data.bairro,
        };
      } catch {
        // Se falhar a busca do estabelecimento, mantém null
      }
    }

    return {
      ...denuncia,
      estabelecimento: estabData,
    };
  },

  /**
   * Registra nova denúncia sanitária (interno ou canal do munícipe).
   */
  async registrarDenuncia(
    payload: RegistrarDenunciaDTO
  ): Promise<DenunciaListItem> {
    const response = await publicApiClient.post<DenunciaListItem>(
      "/denuncias",
      payload
    );
    return response.data;
  },

  /**
   * Despacha a denúncia para fiscalização e designa a autoridade responsável.
   */
  async despacharDenuncia(
    id: string,
    payload: DespacharDenunciaDTO
  ): Promise<DenunciaListItem> {
    const response = await apiClient.patch<DenunciaListItem>(
      `/denuncias/${id}/despacho`,
      payload
    );
    return response.data;
  },

  /**
   * Conclui formalmente a apuração da denúncia.
   */
  async concluirDenuncia(
    id: string,
    payload: ConcluirDenunciaDTO
  ): Promise<DenunciaListItem> {
    const response = await apiClient.patch<DenunciaListItem>(
      `/denuncias/${id}/concluir`,
      payload
    );
    return response.data;
  },

  /**
   * Atalho para arquivar denúncia improcedente ou concluída.
   */
  async arquivarDenuncia(
    id: string,
    justificativa: string,
    respostaCidadao?: string
  ): Promise<DenunciaListItem> {
    return this.concluirDenuncia(id, {
      status: "arquivada",
      conclusao_apuracao: justificativa,
      resposta_ao_denunciante: respostaCidadao || null,
    });
  },

  /**
   * Consulta pública de protocolo pelo cidadão (respeitando sigilo absoluto).
   */
  async consultarProtocoloPublico(
    numeroProtocolo: string
  ): Promise<DenunciaPublicaConsulta> {
    const response = await publicApiClient.get<DenunciaPublicaConsulta>(
      `/denuncias/consultar/${encodeURIComponent(numeroProtocolo.trim())}`
    );
    return response.data;
  },
};

export default ouvidoriaService;
