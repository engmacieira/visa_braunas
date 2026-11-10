import { beforeEach, describe, expect, it, vi } from "vitest";
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { APP_CONFIG } from "../../config/app.config";
import { apiClient, publicApiClient } from "../apiClient";

describe("src/services/apiClient (Axios Client)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Configurações das instâncias", () => {
    it("deve configurar baseURL e headers padronizados para apiClient", () => {
      expect(apiClient.defaults.baseURL).toBe(APP_CONFIG.apiBaseUrl);
      expect(apiClient.defaults.timeout).toBe(15000);
      expect(apiClient.defaults.headers["Content-Type"]).toBe("application/json");
      expect(apiClient.defaults.headers["Accept"]).toBe("application/json");
    });

    it("deve configurar baseURL e timeout para publicApiClient", () => {
      expect(publicApiClient.defaults.baseURL).toBe(APP_CONFIG.apiBaseUrl);
      expect(publicApiClient.defaults.timeout).toBe(10000);
      expect(publicApiClient.defaults.headers["Accept"]).toBe("application/json");
    });
  });

  describe("Interceptor de Requisição: Injeção de Bearer Token", () => {
    it("deve injetar Bearer Token no cabeçalho Authorization se presente no localStorage", async () => {
      localStorage.setItem(APP_CONFIG.storageKeys.token, "token-jwt-axios-123");

      const adapterMock = vi.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
        return {
          data: { autenticado: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as AxiosResponse;
      });

      apiClient.defaults.adapter = adapterMock;

      const response = await apiClient.get("/usuarios/me");
      expect(response.status).toBe(200);
      expect(adapterMock).toHaveBeenCalled();

      const calledConfig = adapterMock.mock.calls[0][0] as InternalAxiosRequestConfig;
      expect(calledConfig.headers.Authorization).toBe("Bearer token-jwt-axios-123");
    });

    it("não deve injetar Authorization se não houver token no localStorage", async () => {
      const adapterMock = vi.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
        return {
          data: { publico: true },
          status: 200,
          statusText: "OK",
          headers: {},
          config,
        } as AxiosResponse;
      });

      apiClient.defaults.adapter = adapterMock;

      await apiClient.get("/dados-publicos");
      const calledConfig = adapterMock.mock.calls[0][0] as InternalAxiosRequestConfig;
      expect(calledConfig.headers.Authorization).toBeUndefined();
    });
  });

  describe("Interceptor de Resposta: HTTP 401 e Limpeza de Sessão", () => {
    it("deve limpar localStorage e disparar evento vigiminas:auth:unauthorized em erro 401", async () => {
      localStorage.setItem(APP_CONFIG.storageKeys.token, "token-a-expirar");
      localStorage.setItem(APP_CONFIG.storageKeys.user, JSON.stringify({ id: 1 }));

      const unauthorizedListener = vi.fn();
      window.addEventListener("vigiminas:auth:unauthorized", unauthorizedListener);

      const adapterMock = vi.fn().mockImplementation(async (config: InternalAxiosRequestConfig) => {
        const error = new AxiosError(
          "Request failed with status code 401",
          "ERR_BAD_REQUEST",
          config,
          {},
          {
            status: 401,
            statusText: "Unauthorized",
            data: { detail: "Sessão expirada." },
            headers: {},
            config,
          } as AxiosResponse
        );
        throw error;
      });

      apiClient.defaults.adapter = adapterMock;

      await expect(apiClient.get("/rota-protegida")).rejects.toThrow();

      expect(localStorage.getItem(APP_CONFIG.storageKeys.token)).toBeNull();
      expect(localStorage.getItem(APP_CONFIG.storageKeys.user)).toBeNull();
      expect(unauthorizedListener).toHaveBeenCalledTimes(1);

      window.removeEventListener("vigiminas:auth:unauthorized", unauthorizedListener);
    });
  });
});
