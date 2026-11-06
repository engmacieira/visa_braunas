/**
 * Custom Hooks do TanStack Query v5 para Fiscalização e Inspeções Sanitárias
 * Gerencia cache de servidor, alertas de prazo e invalidação cirúrgica.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fiscalizacaoService } from "../services/fiscalizacaoService";
import {
  AgendarInspecaoFormValues,
  Indicador11Consolidado,
  InspecaoDetalhe,
  InspecaoFilters,
  InspecaoListItem,
  LaudoConclusaoFormValues,
  NotificacaoPrazoAlerta,
} from "../types/fiscalizacao";

/**
 * Hook para listagem de termos e inspeções com filtros.
 */
export function useInspecoesList(filters: InspecaoFilters = {}) {
  return useQuery<InspecaoListItem[]>({
    queryKey: ["inspecoes", filters],
    queryFn: () => fiscalizacaoService.listarInspecoes(filters),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para consulta detalhada de uma inspeção por ID.
 */
export function useInspecaoDetalhe(id?: string) {
  return useQuery<InspecaoDetalhe>({
    queryKey: ["inspecao", id],
    queryFn: () => fiscalizacaoService.obterInspecaoPorId(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook para monitoramento de notificações e prazos pendentes.
 */
export function useNotificacoesPendentes(limiteDias: number = 30) {
  return useQuery<NotificacaoPrazoAlerta[]>({
    queryKey: ["inspecoes-alertas", limiteDias],
    queryFn: () => fiscalizacaoService.listarNotificacoesPendentes(limiteDias),
    staleTime: 30 * 1000, // 30 segundos para alertas de prazos operacionais
    refetchInterval: 60 * 1000, // Polling a cada 1 minuto
  });
}

/**
 * Hook para dados do Indicador 11 VAPT.
 */
export function useIndicador11Vapt(exercicio?: number) {
  return useQuery<Indicador11Consolidado[]>({
    queryKey: ["indicador-11-vapt", exercicio],
    queryFn: () => fiscalizacaoService.obterIndicador11Vapt(exercicio),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook de mutação para agendar nova inspeção sanitária.
 */
export function useAgendarInspecaoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AgendarInspecaoFormValues) =>
      fiscalizacaoService.agendarInspecao(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inspecoes"] });
    },
  });
}

/**
 * Hook de mutação para lavrar laudo e concluir inspeção.
 */
export function useConcluirInspecaoMutation(inspecaoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: LaudoConclusaoFormValues) =>
      fiscalizacaoService.concluirInspecao(inspecaoId, payload),
    onSuccess: (data) => {
      // Invalidação cirúrgica
      queryClient.invalidateQueries({ queryKey: ["inspecoes"] });
      queryClient.invalidateQueries({ queryKey: ["inspecoes-alertas"] });
      queryClient.invalidateQueries({ queryKey: ["inspecao", inspecaoId] });
      queryClient.invalidateQueries({
        queryKey: ["estabelecimento", data.estabelecimento_id],
      });
      queryClient.invalidateQueries({ queryKey: ["estabelecimentos"] });
    },
  });
}
