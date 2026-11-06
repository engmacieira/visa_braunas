/**
 * Custom Hooks do TanStack Query v5 para Ouvidoria e Denúncias Sanitárias
 * Gerencia cache de servidor, mutações e invalidação cirúrgica.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ouvidoriaService } from "../services/ouvidoriaService";
import {
  ConcluirDenunciaDTO,
  DenunciaDetalhe,
  DenunciaFilters,
  DenunciaPublicaConsulta,
  DespacharDenunciaDTO,
  FilaTrabalhoDenuncia,
  PaginatedDenuncias,
  RegistrarDenunciaDTO,
} from "../types/ouvidoria";

/**
 * Hook para listagem de denúncias com filtros.
 */
export function useDenunciasList(filters: DenunciaFilters = {}) {
  return useQuery<PaginatedDenuncias>({
    queryKey: ["denuncias", filters],
    queryFn: () => ouvidoriaService.listarDenuncias(filters),
    staleTime: 45 * 1000,
  });
}

/**
 * Hook para a fila de trabalho priorizada de denúncias a apurar.
 */
export function useFilaTrabalhoDenuncias(skip: number = 0, limit: number = 50) {
  return useQuery<FilaTrabalhoDenuncia[]>({
    queryKey: ["denuncias-fila", skip, limit],
    queryFn: () => ouvidoriaService.listarFilaTrabalho(skip, limit),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Polling a cada 1 minuto para novas denúncias
  });
}

/**
 * Hook para consulta detalhada de uma denúncia por UUID.
 */
export function useDenunciaDetalhe(id?: string) {
  return useQuery<DenunciaDetalhe>({
    queryKey: ["denuncia", id],
    queryFn: () => ouvidoriaService.obterDenunciaPorId(id!),
    enabled: Boolean(id),
    staleTime: 60 * 1000,
  });
}

/**
 * Hook público para consulta de protocolo pelo munícipe.
 */
export function useConsultarProtocoloPublico(numeroProtocolo?: string) {
  return useQuery<DenunciaPublicaConsulta>({
    queryKey: ["denuncia-publica", numeroProtocolo],
    queryFn: () => ouvidoriaService.consultarProtocoloPublico(numeroProtocolo!),
    enabled: Boolean(numeroProtocolo && numeroProtocolo.trim().length >= 4),
    staleTime: 30 * 1000,
    retry: 1,
  });
}

/**
 * Mutação para registro de nova denúncia sanitária.
 */
export function useRegistrarDenunciaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: RegistrarDenunciaDTO) =>
      ouvidoriaService.registrarDenuncia(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["denuncias"] });
      queryClient.invalidateQueries({ queryKey: ["denuncias-fila"] });
      if (data.estabelecimento_id) {
        queryClient.invalidateQueries({
          queryKey: ["estabelecimento", data.estabelecimento_id],
        });
      }
    },
  });
}

/**
 * Mutação para despacho fiscal da denúncia.
 */
export function useDespachoFiscalMutation(denunciaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DespacharDenunciaDTO) =>
      ouvidoriaService.despacharDenuncia(denunciaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denuncias"] });
      queryClient.invalidateQueries({ queryKey: ["denuncias-fila"] });
      queryClient.invalidateQueries({ queryKey: ["denuncia", denunciaId] });
      queryClient.invalidateQueries({ queryKey: ["inspecoes"] });
    },
  });
}

/**
 * Mutação para conclusão da apuração.
 */
export function useConcluirDenunciaMutation(denunciaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ConcluirDenunciaDTO) =>
      ouvidoriaService.concluirDenuncia(denunciaId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denuncias"] });
      queryClient.invalidateQueries({ queryKey: ["denuncias-fila"] });
      queryClient.invalidateQueries({ queryKey: ["denuncia", denunciaId] });
    },
  });
}

/**
 * Mutação para arquivamento fundamentado.
 */
export function useArquivarDenunciaMutation(denunciaId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      justificativa,
      respostaCidadao,
    }: {
      justificativa: string;
      respostaCidadao?: string;
    }) =>
      ouvidoriaService.arquivarDenuncia(
        denunciaId,
        justificativa,
        respostaCidadao
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["denuncias"] });
      queryClient.invalidateQueries({ queryKey: ["denuncias-fila"] });
      queryClient.invalidateQueries({ queryKey: ["denuncia", denunciaId] });
    },
  });
}
