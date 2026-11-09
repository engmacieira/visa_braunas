/**
 * Camada de Rede Central (HTTP Client com Axios)
 * Configuração de baseURL, timeout, e interceptors para injeção automática
 * de Bearer Token JWT e tratamento global de expiração de sessão (HTTP 401).
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { APP_CONFIG } from "../config/app.config";
import { applyAxiosDebugMiddleware } from "./axiosDebugMiddleware";
import { attachLoadingInterceptors } from "./loadingManager";

/**
 * Cliente HTTP principal autenticado para consumo de endpoints protegidos da API
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

/**
 * Cliente HTTP público isolado para consultas de cidadãos e validação pública de QR Code
 */
export const publicApiClient: AxiosInstance = axios.create({
  baseURL: APP_CONFIG.apiBaseUrl,
  timeout: 10000,
  headers: {
    Accept: "application/json",
  },
});

// 1. Rastreamento reativo de requisições ativas para o indicador de Loading Global
attachLoadingInterceptors(apiClient);
attachLoadingInterceptors(publicApiClient);

// 2. Middleware de Depuração de Rede e API em ambas as instâncias
applyAxiosDebugMiddleware(apiClient);
applyAxiosDebugMiddleware(publicApiClient);

// Interceptor de Requisição: Injeta automaticamente o Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    try {
      const token = localStorage.getItem(APP_CONFIG.storageKeys.token);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Ignora erro de acesso ao localStorage (ex: SSR / cookies bloqueados)
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error);
  }
);

// Interceptor de Resposta: Trata 401 (Sessão Expirada) e formata mensagens de erro
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string | Array<{ msg: string }> }>) => {
    if (error.response?.status === 401) {
      try {
        localStorage.removeItem(APP_CONFIG.storageKeys.token);
        localStorage.removeItem(APP_CONFIG.storageKeys.user);
      } catch {
        // noop
      }

      // Emite evento para que o AuthContext e a UI reajam imediatamente
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("vigiminas:auth:unauthorized"));
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
