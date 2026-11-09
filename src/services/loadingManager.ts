/**
 * Gerenciador Reativo de Requisições Ativas e Estado de Carregamento Global (Loading State)
 *
 * Monitora o ciclo de vida de requisições no Axios (início, conclusão com sucesso ou erro),
 * mantendo o contador preciso de chamadas em trânsito e notificando ouvintes para atualização de UI.
 */

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";

// Extensão de tipos do Axios para permitir ignorar o loading global em chamadas pontuais se necessário
declare module "axios" {
  export interface AxiosRequestConfig {
    skipGlobalLoading?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    skipGlobalLoading?: boolean;
  }
}

export interface GlobalLoadingState {
  isLoading: boolean;
  activeRequestsCount: number;
}

export type LoadingListener = (isLoading: boolean, activeRequestsCount: number) => void;

class LoadingManager {
  private activeRequestsCount: number = 0;
  private listeners: Set<LoadingListener> = new Set();

  /**
   * Incrementa o contador de requisições ativas e notifica os ouvintes
   */
  public increment(): void {
    this.activeRequestsCount++;
    this.notify();
  }

  /**
   * Decrementa com segurança o contador de requisições ativas e notifica os ouvintes
   */
  public decrement(): void {
    this.activeRequestsCount = Math.max(0, this.activeRequestsCount - 1);
    this.notify();
  }

  /**
   * Zera o contador de requisições (por exemplo, na troca de rota ou reset de sessão)
   */
  public reset(): void {
    this.activeRequestsCount = 0;
    this.notify();
  }

  /**
   * Retorna o total de requisições atualmente em voo
   */
  public getCount(): number {
    return this.activeRequestsCount;
  }

  /**
   * Retorna true se houver pelo menos uma requisição ativa pendente
   */
  public isLoading(): boolean {
    return this.activeRequestsCount > 0;
  }

  /**
   * Inscreve um componente ou hook para receber atualizações do estado de loading
   * @param listener Callback invocado em cada mudança de estado
   * @returns Função de desinscrição (cleanup)
   */
  public subscribe(listener: LoadingListener): () => void {
    this.listeners.add(listener);
    // Emite o estado atual imediatamente para sincronização inicial
    listener(this.isLoading(), this.activeRequestsCount);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notifica todos os ouvintes registrados
   */
  private notify(): void {
    const loading = this.isLoading();
    const count = this.activeRequestsCount;
    this.listeners.forEach((listener) => {
      try {
        listener(loading, count);
      } catch (err) {
        console.error("[LoadingManager] Falha ao notificar listener:", err);
      }
    });
  }
}

export const loadingManager = new LoadingManager();

/**
 * Anexa interceptors do Axios para rastrear requisições pendentes automaticamente
 *
 * @param instance Instância do Axios a ser monitorada
 * @returns Função para ejeção dos interceptors caso necessário
 */
export function attachLoadingInterceptors(instance: AxiosInstance): () => void {
  const reqId = instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      if (!config.skipGlobalLoading) {
        loadingManager.increment();
      }
      return config;
    },
    (error: unknown) => {
      // Falha antes de enviar a requisição
      return Promise.reject(error);
    }
  );

  const resId = instance.interceptors.response.use(
    (response: AxiosResponse) => {
      if (!response.config?.skipGlobalLoading) {
        loadingManager.decrement();
      }
      return response;
    },
    (error: unknown) => {
      if (error instanceof AxiosError && error.config?.skipGlobalLoading) {
        // Ignorado por flag específica
      } else {
        loadingManager.decrement();
      }
      return Promise.reject(error);
    }
  );

  return () => {
    instance.interceptors.request.eject(reqId);
    instance.interceptors.response.eject(resId);
  };
}

export default loadingManager;
