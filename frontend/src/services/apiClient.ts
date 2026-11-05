/**
 * Cliente HTTP Tipado para a API FastAPI do VigiMinas
 * Suporte a injeção automática de Bearer Token JWT e tratamento de erros 401/403
 */

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env?.VITE_API_BASE_URL || "/api/v1";
  }

  private getToken(): string | null {
    try {
      return localStorage.getItem("vigiminas_token");
    } catch {
      return null;
    }
  }

  public setToken(token: string): void {
    try {
      localStorage.setItem("vigiminas_token", token);
    } catch {
      // noop
    }
  }

  public clearToken(): void {
    try {
      localStorage.removeItem("vigiminas_token");
      localStorage.removeItem("vigiminas_user");
    } catch {
      // noop
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    let url = `${this.baseUrl}${cleanEndpoint}`;

    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();
      if (queryString) {
        url += (url.includes("?") ? "&" : "?") + queryString;
      }
    }

    return url;
  }

  public async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers: customHeaders, ...restOptions } = options;
    const url = this.buildUrl(endpoint, params);

    const headers = new Headers(customHeaders);
    headers.set("Content-Type", "application/json");

    // Interceptor de Requisição: Injeção automática do Bearer JWT
    const token = this.getToken();
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    try {
      const response = await fetch(url, {
        ...restOptions,
        headers,
      });

      // Interceptor de Resposta: Tratamento de expiração de sessão e permissões
      if (response.status === 401) {
        this.clearToken();
        window.dispatchEvent(new CustomEvent("vigiminas:auth:unauthorized"));
        throw new ApiError(401, "Sessão expirada ou não autorizada. Faça login novamente.");
      }

      if (response.status === 403) {
        throw new ApiError(403, "Acesso restrito. Você não possui permissão para executar esta ação.");
      }

      if (!response.ok) {
        let errorDetail = `Erro HTTP ${response.status}`;
        try {
          const errorJson = await response.json();
          errorDetail = errorJson.detail || errorDetail;
        } catch {
          // ignore parsing error
        }
        throw new ApiError(response.status, errorDetail);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return (await response.json()) as T;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(0, err instanceof Error ? err.message : "Erro de conexão com o servidor.");
    }
  }

  public get<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return this.request<T>(endpoint, { method: "GET", params });
  }

  public post<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "POST",
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  public patch<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return this.request<T>(endpoint, {
      method: "PATCH",
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  public delete<T>(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): Promise<T> {
    return this.request<T>(endpoint, { method: "DELETE", params });
  }
}

export const apiClient = new ApiClient();
