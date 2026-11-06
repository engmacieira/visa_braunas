/**
 * Serviço de Integração com os Endpoints de Estabelecimentos e CNAEs
 * Centraliza requisições HTTP REST com tipagem estrita para o cliente FastAPI.
 */

import { apiClient } from "./apiClient";
import { APP_CONFIG } from "../config/app.config";
import { stripFormatacao } from "../utils/formatters";
import {
  CNAEItem,
  EstabelecimentoDetalhe,
  EstabelecimentoFilters,
  EstabelecimentoFormValues,
  EstabelecimentoListResponse,
  VinculoCNAEDTO,
} from "../types/estabelecimento";

export const estabelecimentoService = {
  /**
   * Lista estabelecimentos com paginação e filtros opcionais.
   */
  async listarEstabelecimentos(
    filters: EstabelecimentoFilters = {}
  ): Promise<EstabelecimentoListResponse> {
    const params: Record<string, string | number | boolean> = {
      skip: filters.skip ?? 0,
      limit: filters.limit ?? 20,
      only_active: filters.only_active ?? true,
    };

    if (filters.busca && filters.busca.trim()) {
      params.busca = filters.busca.trim();
    }
    if (filters.risco) {
      params.risco = filters.risco;
    }
    if (filters.situacao) {
      params.situacao = filters.situacao;
    }

    const response = await apiClient.get<EstabelecimentoListResponse>(
      "/estabelecimentos",
      { params }
    );
    return response.data;
  },

  /**
   * Obtém ficha detalhada de um estabelecimento por UUID.
   */
  async obterEstabelecimentoPorId(id: string): Promise<EstabelecimentoDetalhe> {
    const response = await apiClient.get<EstabelecimentoDetalhe>(
      `/estabelecimentos/${id}`
    );
    return response.data;
  },

  /**
   * Cadastra novo estabelecimento na Vigilância Sanitária.
   */
  async cadastrarEstabelecimento(
    payload: EstabelecimentoFormValues
  ): Promise<EstabelecimentoDetalhe> {
    // Formata o payload para o DTO esperado pelo FastAPI
    const dto = {
      tipo_cadastro: payload.tipo_cadastro,
      cnpj_cpf: stripFormatacao(payload.cnpj_cpf),
      razao_social: payload.razao_social.trim(),
      nome_fantasia: payload.nome_fantasia?.trim() || null,
      inscricao_municipal: payload.inscricao_municipal?.trim() || null,
      natureza_juridica: payload.natureza_juridica?.trim() || null,

      cep: stripFormatacao(payload.cep),
      logradouro: payload.logradouro.trim(),
      numero: payload.numero.trim(),
      complemento: payload.complemento?.trim() || null,
      bairro: payload.bairro.trim(),
      municipio: payload.municipio.trim() || APP_CONFIG.municipio,
      uf: payload.uf.trim().toUpperCase() || APP_CONFIG.uf,
      ponto_referencia: payload.ponto_referencia?.trim() || null,
      acesso_compartilhado_residencia: Boolean(
        payload.acesso_compartilhado_residencia
      ),

      telefone_fixo: payload.telefone_fixo?.trim() || null,
      telefone_celular: payload.telefone_celular.trim(),
      email: payload.email.trim().toLowerCase(),

      competencia_fiscalizacao: payload.competencia_fiscalizacao,
      horario_funcionamento: payload.horario_funcionamento?.trim() || null,
      fonte_abastecimento_agua:
        payload.fonte_abastecimento_agua?.trim() || "Rede Pública (COPASA)",
      possui_reservatorio_proprio: Boolean(payload.possui_reservatorio_proprio),
      capacidade_reservatorio_litros: Number(
        payload.capacidade_reservatorio_litros || 0
      ),

      representante_legal: {
        nome_completo: payload.representante_legal.nome_completo.trim(),
        cpf: payload.representante_legal.cpf.replace(/\D/g, ""),
        rg_numero: payload.representante_legal.rg_numero?.trim() || null,
        rg_orgao_emissor:
          payload.representante_legal.rg_orgao_emissor?.trim() || null,
        telefone: payload.representante_legal.telefone.trim(),
        email: payload.representante_legal.email.trim().toLowerCase(),
        endereco_residencial:
          payload.representante_legal.endereco_residencial.trim(),
      },

      cnaes: payload.cnaes.map((c) => ({
        cnae_codigo: c.cnae_codigo.trim(),
        eh_principal: Boolean(c.eh_principal),
        data_inicio_atividade: c.data_inicio_atividade || null,
      })),
    };

    const response = await apiClient.post<EstabelecimentoDetalhe>(
      "/estabelecimentos",
      dto
    );
    return response.data;
  },

  /**
   * Atualiza dados de um estabelecimento existente.
   */
  async atualizarEstabelecimento(
    id: string,
    payload: Partial<EstabelecimentoFormValues>
  ): Promise<EstabelecimentoDetalhe> {
    const response = await apiClient.put<EstabelecimentoDetalhe>(
      `/estabelecimentos/${id}`,
      payload
    );
    return response.data;
  },

  /**
   * Atualiza a grade de CNAEs vinculados a um estabelecimento.
   */
  async gerenciarCnaes(
    id: string,
    cnaes: Array<{
      cnae_codigo: string;
      eh_principal: boolean;
      data_inicio_atividade?: string | null;
    }>
  ): Promise<EstabelecimentoDetalhe> {
    const response = await apiClient.put<EstabelecimentoDetalhe>(
      `/estabelecimentos/${id}/cnaes`,
      cnaes
    );
    return response.data;
  },

  /**
   * Aplica soft delete / inativação lógica no estabelecimento.
   */
  async excluirEstabelecimento(id: string): Promise<void> {
    await apiClient.delete(`/estabelecimentos/${id}`);
  },

  /**
   * Busca textual / autocomplete de CNAEs no catálogo.
   */
  async buscarCNAEs(busca?: string, limit: number = 30): Promise<CNAEItem[]> {
    const params: Record<string, string | number> = {
      limit,
    };
    if (busca && busca.trim()) {
      params.busca = busca.trim();
    }
    const response = await apiClient.get<CNAEItem[]>("/cnaes", { params });
    return response.data;
  },

  /**
   * Consulta parâmetros sanitários de um CNAE por código.
   */
  async obterCnaePorCodigo(codigo: string): Promise<CNAEItem> {
    const response = await apiClient.get<CNAEItem>(`/cnaes/${codigo}`);
    return response.data;
  },
};

export default estabelecimentoService;
