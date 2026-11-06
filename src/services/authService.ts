/**
 * Serviço de Autenticação da API do VigiMinas
 * Integração direta com os endpoints /auth/login e /auth/me do FastAPI.
 */

import { APP_CONFIG } from "../config/app.config";
import { LoginCredentials, TokenResponse, UsuarioSessao } from "../types/auth";
import { apiClient } from "./apiClient";

export const authService = {
  /**
   * Realiza login do servidor municipal.
   * Retorna o token JWT e metadados de sessão.
   */
  async login(credentials: LoginCredentials): Promise<TokenResponse> {
    const response = await apiClient.post<TokenResponse>(
      "/auth/login",
      credentials
    );
    return response.data;
  },

  /**
   * Obtém os dados completos do servidor autenticado pelo Bearer Token.
   */
  async getMe(): Promise<UsuarioSessao> {
    const response = await apiClient.get<UsuarioSessao>("/auth/me");
    return response.data;
  },

  /**
   * Limpa as credenciais locais e encerra a sessão.
   */
  logout(): void {
    try {
      localStorage.removeItem(APP_CONFIG.storageKeys.token);
      localStorage.removeItem(APP_CONFIG.storageKeys.user);
    } catch {
      // noop
    }
  },

  /**
   * Helper para extrair mensagem amigável de erros da API.
   */
  getErrorMessage(error: unknown): string {
    if (typeof error === "object" && error !== null && "response" in error) {
      const axiosErr = error as {
        response?: { data?: { detail?: string | Array<{ msg: string }> } };
      };
      const detail = axiosErr.response?.data?.detail;
      if (typeof detail === "string") {
        return detail;
      }
      if (Array.isArray(detail) && detail.length > 0) {
        return detail.map((d) => d.msg).join(", ");
      }
    }
    if (error instanceof Error) {
      return error.message;
    }
    return "Erro inesperado ao comunicar com o servidor da Vigilância.";
  },
};

export default authService;
