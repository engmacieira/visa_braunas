/**
 * Custom Hooks do TanStack Query v5 para Licenciamento Sanitário e Alvarás
 * Gerencia cache de servidor, estados de mutação e invalidação cirúrgica.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { licenciamentoService } from "../services/licenciamentoService";
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
  ValidacaoAlvaraPublicoResponse,
} from "../types/licenciamento";

/**
 * Hook para listagem de requerimentos de licenciamento na fila.
 */
export function useRequerimentosList(filters: RequerimentoFilters = {}) {
  return useQuery<PaginatedRequerimentos>({
    queryKey: ["requerimentos", filters],
    queryFn: () => licenciamentoService.listarRequerimentos(filters),
    staleTime: 45 * 1000,
  });
}

/**
 * Hook para obter ficha detalhada do requerimento por UUID.
 */
export function useRequerimentoDetalhe(id?: string) {
  return useQuery<RequerimentoDetalhe>({
    queryKey: ["requerimento", id],
    queryFn: () => licenciamentoService.obterRequerimentoPorId(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para listagem de alvarás emitidos.
 */
export function useAlvarasList(filters: AlvaraFilters = {}) {
  return useQuery<PaginatedAlvaras>({
    queryKey: ["alvaras", filters],
    queryFn: () => licenciamentoService.listarAlvaras(filters),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para obter detalhes do alvará sanitário emitido por UUID.
 */
export function useAlvaraDetalhe(id?: string) {
  return useQuery<AlvaraSanitarioDetalhe>({
    queryKey: ["alvara", id],
    queryFn: () => licenciamentoService.obterAlvaraPorId(id!),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Hook público para consulta de autenticidade via QR Code.
 */
export function useValidarAlvaraPublico(codigoAutenticidade?: string) {
  return useQuery<ValidacaoAlvaraPublicoResponse>({
    queryKey: ["alvara-publico", codigoAutenticidade],
    queryFn: () =>
      licenciamentoService.validarAlvaraPublico(codigoAutenticidade!),
    enabled: Boolean(codigoAutenticidade && codigoAutenticidade.trim().length >= 4),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Mutação para submissão de novo requerimento.
 */
export function useSubmeterRequerimentoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: NovoRequerimentoDTO) =>
      licenciamentoService.submeterRequerimento(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requerimentos"] });
      queryClient.invalidateQueries({
        queryKey: ["estabelecimento", data.estabelecimento_id],
      });
    },
  });
}

/**
 * Mutação para tramitação / análise de requerimento pelo fiscal.
 */
export function useAnalisarRequerimentoMutation(requerimentoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AnalisarRequerimentoDTO) =>
      licenciamentoService.analisarRequerimento(requerimentoId, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requerimentos"] });
      queryClient.invalidateQueries({
        queryKey: ["requerimento", requerimentoId],
      });
      queryClient.invalidateQueries({
        queryKey: ["estabelecimento", data.estabelecimento_id],
      });
    },
  });
}

/**
 * Mutação para expedição / emissão oficial de Alvará Sanitário.
 */
export function useEmitirAlvaraMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: EmitirAlvaraDTO) =>
      licenciamentoService.emitirAlvara(payload),
    onSuccess: (data) => {
      // Invalidação ampla do ciclo de vida
      queryClient.invalidateQueries({ queryKey: ["requerimentos"] });
      if (data.requerimento_id) {
        queryClient.invalidateQueries({
          queryKey: ["requerimento", data.requerimento_id],
        });
      }
      queryClient.invalidateQueries({ queryKey: ["alvaras"] });
      queryClient.invalidateQueries({ queryKey: ["alvara", data.id] });
      queryClient.invalidateQueries({
        queryKey: ["estabelecimento", data.estabelecimento_id],
      });
      queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
    },
  });
}
