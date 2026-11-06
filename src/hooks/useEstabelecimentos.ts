/**
 * Custom Hooks do TanStack Query v5 para Estabelecimentos e CNAEs
 * Gerencia cache de servidor, invalidação e chamadas assíncronas.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { estabelecimentoService } from "../services/estabelecimentoService";
import {
  CNAEItem,
  EstabelecimentoDetalhe,
  EstabelecimentoFilters,
  EstabelecimentoFormValues,
  EstabelecimentoListResponse,
} from "../types/estabelecimento";

/**
 * Hook para listagem paginada de estabelecimentos com filtros.
 */
export function useEstabelecimentosList(filters: EstabelecimentoFilters = {}) {
  return useQuery<EstabelecimentoListResponse>({
    queryKey: ["estabelecimentos", filters],
    queryFn: () => estabelecimentoService.listarEstabelecimentos(filters),
    staleTime: 60 * 1000, // 1 minuto de cache para listagens
  });
}

/**
 * Hook para consulta detalhada de um estabelecimento por UUID.
 */
export function useEstabelecimentoDetalhe(id?: string) {
  return useQuery<EstabelecimentoDetalhe>({
    queryKey: ["estabelecimento", id],
    queryFn: () => estabelecimentoService.obterEstabelecimentoPorId(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook de autocomplete e busca no catálogo de CNAEs.
 */
export function useCNAEAutocomplete(busca?: string) {
  return useQuery<CNAEItem[]>({
    queryKey: ["cnaes", busca],
    queryFn: () => estabelecimentoService.buscarCNAEs(busca, 40),
    staleTime: 5 * 60 * 1000, // 5 minutos de cache para o catálogo estável de CNAEs
  });
}

/**
 * Hook de mutação para cadastro e atualização de estabelecimento.
 */
export function useSalvarEstabelecimentoMutation(id?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EstabelecimentoFormValues) => {
      if (id) {
        return estabelecimentoService.atualizarEstabelecimento(id, payload);
      }
      return estabelecimentoService.cadastrarEstabelecimento(payload);
    },
    onSuccess: (data) => {
      // Invalidação cirúrgica de cache
      queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
      if (id) {
        queryClient.invalidateQueries({ queryKey: ["estabelecimento", id] });
      }
      queryClient.setQueryData(["estabelecimento", data.id], data);
    },
  });
}

/**
 * Hook de mutação para soft delete de estabelecimento.
 */
export function useExcluirEstabelecimentoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      estabelecimentoService.excluirEstabelecimento(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
    },
  });
}
