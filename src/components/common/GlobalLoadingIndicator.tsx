/**
 * Componente Visual de Estado de Carregamento Global (Global Loading Indicator)
 *
 * Integra-se diretamente ao `useGlobalLoading` e aos interceptors do Axios,
 * provendo feedback contínuo sem bloquear a interface de usuário (não intrusivo):
 *
 * 1. Barra superior ultrafina (Top Progress Bar) com gradiente institucional e animação contínua.
 * 2. Indicador flutuante no canto inferior direito com contador de requisições paralelas e debounce
 *    antiflicker para respostas instantâneas.
 * 3. Totalmente acessível com suporte a leitores de tela (role="status", aria-live="polite").
 */

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useGlobalLoading } from "../../hooks/useGlobalLoading";

interface GlobalLoadingIndicatorProps {
  /**
   * Tempo em milissegundos antes de exibir o badge flutuante,
   * prevenindo piscadas visuais em requisições de cache ou ultra-rápidas.
   * Padrão: 120ms
   */
  debounceBadgeMs?: number;
  /**
   * Permite desativar o badge flutuante mantendo apenas a barra de progresso do topo
   */
  showBadge?: boolean;
}

export const GlobalLoadingIndicator: React.FC<GlobalLoadingIndicatorProps> = ({
  debounceBadgeMs = 120,
  showBadge = true,
}) => {
  const { isLoading, activeRequestsCount } = useGlobalLoading();
  const [showDebouncedBadge, setShowDebouncedBadge] = useState<boolean>(false);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  // Debounce do badge flutuante para evitar micro-flickering
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (isLoading) {
      setIsFinishing(false);
      timer = setTimeout(() => {
        setShowDebouncedBadge(true);
      }, debounceBadgeMs);
    } else {
      // Quando finaliza, mantém uma breve transição suave de conclusão
      setShowDebouncedBadge(false);
      setIsFinishing(true);
      const finishTimer = setTimeout(() => {
        setIsFinishing(false);
      }, 350);
      return () => clearTimeout(finishTimer);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isLoading, debounceBadgeMs]);

  // Se não estiver carregando e não estiver em animação de término, não renderiza nada
  if (!isLoading && !isFinishing) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={isLoading}
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999]"
    >
      <span className="sr-only">
        {isLoading
          ? `Carregando dados do servidor (${activeRequestsCount} requisição${
              activeRequestsCount > 1 ? "ões" : ""
            } em andamento)`
          : "Carregamento concluído"}
      </span>

      {/* 1. Barra de Progresso Superior (Slim Top Progress Bar) */}
      <div className="relative h-1 w-full overflow-hidden bg-transparent">
        <div
          className={`h-full transition-all duration-300 ease-out ${
            isFinishing
              ? "w-full bg-emerald-500 opacity-0 transition-opacity duration-300"
              : "w-full bg-gradient-to-r from-teal-500 via-emerald-400 to-cyan-500 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
          }`}
          style={{
            animation: isFinishing ? "none" : "vigiminas-loading-pulse 1.4s ease-in-out infinite",
          }}
        />
      </div>

      {/* 2. Badge Flutuante Discreto no Canto Inferior Direito (com Debounce) */}
      {showBadge && (showDebouncedBadge || (isLoading && activeRequestsCount > 1)) && (
        <aside
          aria-hidden={!isLoading}
          className="pointer-events-auto fixed bottom-5 right-5 z-[9999] flex items-center gap-2.5 rounded-full border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 text-xs text-slate-100 shadow-xl backdrop-blur-md transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 dark:border-slate-600 dark:bg-slate-800/95"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin text-teal-400" />
          <span className="font-medium tracking-tight">Sincronizando dados...</span>
          {activeRequestsCount > 1 && (
            <span
              title={`${activeRequestsCount} requisições ativas simultâneas`}
              className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-teal-500/20 px-1 text-[10px] font-semibold text-teal-300 border border-teal-500/30"
            >
              {activeRequestsCount}
            </span>
          )}
        </aside>
      )}
    </div>
  );
};

export default GlobalLoadingIndicator;
