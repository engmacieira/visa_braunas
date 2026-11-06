/**
 * Serviço de Integração com os Endpoints de Licenciamento Sanitário e Alvarás
 * Centraliza requisições REST tipadas para tramitação de requerimentos e emissão de alvarás.
 */

import axios from "axios";
import { apiClient } from "./apiClient";
import { APP_CONFIG } from "../config/app.config";
import {
  AlvaraFilters,
  AlvaraSanitarioDetalhe,
  AnalisarRequerimentoDTO,
  EmitirAlvaraDTO,
  NovoRequerimentoDTO,
  PaginatedAlvaras,
  PaginatedRequerimentos,
  RequerimentoDetalhe,
  RequerimentoFilters,
  RequerimentoListItem,
  ValidacaoAlvaraPublicoResponse,
} from "../types/licenciamento";
import { EstabelecimentoDetalhe } from "../types/estabelecimento";

// Cliente HTTP sem interceptors de autenticação, para rotas 100% públicas
const publicApiClient = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

export const licenciamentoService = {
  /**
   * Lista requerimentos de alvará na fila de trabalho com filtros.
   */
  async listarRequerimentos(
    filters: RequerimentoFilters = {}
  ): Promise<PaginatedRequerimentos> {
    const params: Record<string, string | number | boolean> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
    };

    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.estabelecimento_id) {
      params.estabelecimento_id = filters.estabelecimento_id;
    }
    if (filters.apenas_fila !== undefined) {
      params.apenas_fila = filters.apenas_fila;
    }

    const response = await apiClient.get<PaginatedRequerimentos>("/requerimentos", {
      params,
    });
    return response.data;
  },

  /**
   * Obtém ficha detalhada do requerimento e petição declarada por UUID,
   * incluindo os dados enriquecidos do estabelecimento.
   */
  async obterRequerimentoPorId(id: string): Promise<RequerimentoDetalhe> {
    const response = await apiClient.get<RequerimentoListItem>(`/requerimentos/${id}`);
    const req = response.data;

    let estabelecimentoInfo = null;
    if (req.estabelecimento_id) {
      try {
        const estabResp = await apiClient.get<EstabelecimentoDetalhe>(
          `/estabelecimentos/${req.estabelecimento_id}`
        );
        estabelecimentoInfo = {
          id: estabResp.data.id,
          razao_social: estabResp.data.razao_social,
          nome_fantasia: estabResp.data.nome_fantasia,
          cnpj_cpf: estabResp.data.cnpj_cpf,
          nivel_risco: estabResp.data.nivel_risco,
          logradouro: estabResp.data.logradouro,
          numero: estabResp.data.numero,
          complemento: estabResp.data.complemento,
          bairro: estabResp.data.bairro,
          municipio: estabResp.data.municipio,
          uf: estabResp.data.uf,
          cep: estabResp.data.cep,
        };
      } catch {
        // Se falhar a busca do estabelecimento, mantém null sem quebrar a tela
      }
    }

    return {
      ...req,
      estabelecimento: estabelecimentoInfo,
    };
  },

  /**
   * Submete ou cadastra novo requerimento de alvará sanitário.
   */
  async submeterRequerimento(
    payload: NovoRequerimentoDTO
  ): Promise<RequerimentoListItem> {
    const response = await apiClient.post<RequerimentoListItem>(
      "/requerimentos",
      payload
    );
    return response.data;
  },

  /**
   * Tramita e analisa o requerimento (iniciar análise, encaminhar vistoria, deferir, indeferir, etc).
   */
  async analisarRequerimento(
    id: string,
    payload: AnalisarRequerimentoDTO
  ): Promise<RequerimentoListItem> {
    const response = await apiClient.patch<RequerimentoListItem>(
      `/requerimentos/${id}/analisar`,
      payload
    );
    return response.data;
  },

  /**
   * Lista alvarás sanitários emitidos.
   */
  async listarAlvaras(filters: AlvaraFilters = {}): Promise<PaginatedAlvaras> {
    const params: Record<string, string | number | boolean> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 50,
    };

    if (filters.status) {
      params.status = filters.status;
    }
    if (filters.estabelecimento_id) {
      params.estabelecimento_id = filters.estabelecimento_id;
    }
    if (filters.exercicio) {
      params.exercicio = filters.exercicio;
    }

    const response = await apiClient.get<PaginatedAlvaras>("/alvaras", {
      params,
    });
    return response.data;
  },

  /**
   * Obtém os dados completos de um alvará expedido por UUID,
   * agregando dados cadastrais completos da empresa para o espelho oficial de impressão.
   */
  async obterAlvaraPorId(id: string): Promise<AlvaraSanitarioDetalhe> {
    const response = await apiClient.get<AlvaraSanitarioDetalhe>(`/alvaras/${id}`);
    const alvara = response.data;

    let estabelecimentoCompleto = null;
    if (alvara.estabelecimento_id) {
      try {
        const estabResp = await apiClient.get<EstabelecimentoDetalhe>(
          `/estabelecimentos/${alvara.estabelecimento_id}`
        );
        estabelecimentoCompleto = estabResp.data;
      } catch {
        // Mantém sem dados detalhados
      }
    }

    return {
      ...alvara,
      estabelecimento: estabelecimentoCompleto,
    };
  },

  /**
   * Emite oficialmente o Alvará Sanitário municipal.
   */
  async emitirAlvara(payload: EmitirAlvaraDTO): Promise<AlvaraSanitarioDetalhe> {
    const response = await apiClient.post<AlvaraSanitarioDetalhe>(
      "/alvaras/emitir",
      payload
    );
    return response.data;
  },

  /**
   * Rota pública para consulta de autenticidade por QR Code (livre de autenticação).
   * GET /api/v1/alvaras/validar/{codigo_autenticidade}
   */
  async validarAlvaraPublico(
    codigoAutenticidade: string
  ): Promise<ValidacaoAlvaraPublicoResponse> {
    const response = await publicApiClient.get<AlvaraSanitarioDetalhe>(
      `/alvaras/validar/${encodeURIComponent(codigoAutenticidade.trim())}`
    );
    const alvara = response.data;

    // Busca pública complementar do estabelecimento se possível, ou usa dados do alvará
    let estabData = null;
    if (alvara.estabelecimento_id) {
      try {
        const estabResp = await publicApiClient.get<EstabelecimentoDetalhe>(
          `/estabelecimentos/${alvara.estabelecimento_id}`
        );
        estabData = estabResp.data;
      } catch {
        // sem dados complementares
      }
    }

    const hoje = new Date();
    const dataVencimento = new Date(alvara.data_vencimento);
    const diasRestantes = Math.ceil(
      (dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
    );
    const isAtivo = alvara.status === "ativo" && diasRestantes >= 0;

    return {
      ...alvara,
      estabelecimento: estabData,
      valido: isAtivo,
      dias_restantes_validade: diasRestantes,
      motivo_status: !isAtivo
        ? diasRestantes < 0
          ? "Alvará Sanitário com prazo de validade expirado"
          : `Alvará ${alvara.status.toUpperCase()}`
        : "Alvará Sanitário regular e em vigência",
    };
  },
};

export default licenciamentoService;
