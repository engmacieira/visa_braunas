/**
 * Hook React para consumo do Estado Global de Carregamento (Loading State) do Axios
 *
 * Fornece:
 * - isLoading: booleano indicando se há requisições HTTP ativas
 * - activeRequestsCount: número de requisições pendentes em processamento
 */

import { useEffect, useState } from "react";
import { loadingManager, GlobalLoadingState } from "../services/loadingManager";

export type { GlobalLoadingState };

export function useGlobalLoading(): { isLoading: boolean; activeRequestsCount: number } {
  const [loadingState, setLoadingState] = useState<{
    isLoading: boolean;
    activeRequestsCount: number;
  }>({
    isLoading: loadingManager.isLoading(),
    activeRequestsCount: loadingManager.getCount(),
  });

  useEffect(() => {
    const unsubscribe = loadingManager.subscribe((isLoading, activeRequestsCount) => {
      setLoadingState({ isLoading, activeRequestsCount });
    });

    return unsubscribe;
  }, []);

  return loadingState;
}

export default useGlobalLoading;
