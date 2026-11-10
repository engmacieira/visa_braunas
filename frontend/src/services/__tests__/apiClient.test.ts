import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient, ApiError } from "../apiClient";

describe("apiClient (HTTP Client Fetch)", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    apiClient.clearToken();
  });

  // ===========================================================================
  // 1. HEADERS E INTERCEPTOR DE REQUISIÇÃO (INJEÇÃO DE TOKEN)
  // ===========================================================================
  describe("Headers padrão e injeção de Bearer Token JWT", () => {
    it("deve definir Content-Type: application/json por padrão nas requisições", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ status: "ok" }),
      });
      globalThis.fetch = mockFetch;

      await apiClient.get("/test-endpoint");

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [, requestInit] = mockFetch.mock.calls[0];
      const headers = requestInit?.headers as Headers;
      expect(headers.get("Content-Type")).toBe("application/json");
      expect(headers.get("Authorization")).toBeNull();
    });

    it("deve injetar automaticamente o Bearer Token quando presente no localStorage", async () => {
      apiClient.setToken("jwt-token-valido-12345");
      expect(localStorage.getItem("vigiminas_token")).toBe("jwt-token-valido-12345");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ usuario: "fiscal1" }),
      });
      globalThis.fetch = mockFetch;

      const result = await apiClient.get<{ usuario: string }>("/auth/me");

      expect(result).toEqual({ usuario: "fiscal1" });
      const [, requestInit] = mockFetch.mock.calls[0];
      const headers = requestInit?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Bearer jwt-token-valido-12345");
    });

    it("não deve sobrescrever header Authorization se ele já foi explicitamente fornecido", async () => {
      apiClient.setToken("token-storage");

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ auth: "custom" }),
      });
      globalThis.fetch = mockFetch;

      await apiClient.request("/custom-auth", {
        headers: {
          Authorization: "Basic dXNlcjpwYXNz",
        },
      });

      const [, requestInit] = mockFetch.mock.calls[0];
      const headers = requestInit?.headers as Headers;
      expect(headers.get("Authorization")).toBe("Basic dXNlcjpwYXNz");
    });

    it("deve limpar token e dados do usuário ao chamar clearToken()", () => {
      apiClient.setToken("token-para-limpar");
      localStorage.setItem("vigiminas_user", JSON.stringify({ nome: "Fiscal" }));

      apiClient.clearToken();

      expect(localStorage.getItem("vigiminas_token")).toBeNull();
      expect(localStorage.getItem("vigiminas_user")).toBeNull();
    });

    it("deve lidar com exceções de acesso ao localStorage graciosamente em getToken, setToken e clearToken", async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new DOMException("Storage desabilitado por política de segurança", "SecurityError");
      });
      const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("Storage bloqueado", "SecurityError");
      });
      const removeItemSpy = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
        throw new DOMException("Storage bloqueado", "SecurityError");
      });

      // Não deve lançar erro
      expect(() => apiClient.setToken("qualquer")).not.toThrow();
      expect(() => apiClient.clearToken()).not.toThrow();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      });
      globalThis.fetch = mockFetch;

      await apiClient.get("/teste-storage-bloqueado");
      const [, reqInit] = mockFetch.mock.calls[0];
      const headers = reqInit?.headers as Headers;
      expect(headers.get("Authorization")).toBeNull();

      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
      removeItemSpy.mockRestore();
    });
  });

  // ===========================================================================
  // 2. TRATAMENTO DE STATUS E INTERCEPTOR DE RESPOSTA
  // ===========================================================================
  describe("Tratamento de Erros HTTP e Interceptor de Resposta", () => {
    it("deve tratar HTTP 401 Unauthorized, limpar tokens e disparar evento vigiminas:auth:unauthorized", async () => {
      apiClient.setToken("token-expirado");
      localStorage.setItem("vigiminas_user", JSON.stringify({ id: "1" }));

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      globalThis.fetch = mockFetch;

      const unauthorizedListener = vi.fn();
      window.addEventListener("vigiminas:auth:unauthorized", unauthorizedListener);

      await expect(apiClient.get("/protegido")).rejects.toThrow(ApiError);

      try {
        await apiClient.get("/protegido");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(401);
        expect(apiError.message).toContain("Sessão expirada ou não autorizada");
      }

      // Validações pós-401
      expect(localStorage.getItem("vigiminas_token")).toBeNull();
      expect(localStorage.getItem("vigiminas_user")).toBeNull();
      expect(unauthorizedListener).toHaveBeenCalled();

      window.removeEventListener("vigiminas:auth:unauthorized", unauthorizedListener);
    });

    it("deve tratar HTTP 403 Forbidden com mensagem padronizada de acesso restrito", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
      });
      globalThis.fetch = mockFetch;

      await expect(apiClient.get("/admin/recursos")).rejects.toThrow(ApiError);

      try {
        await apiClient.get("/admin/recursos");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(403);
        expect(apiError.message).toContain("Acesso restrito");
      }
    });

    it("deve extrair a propriedade 'detail' em erros 400/404/422/500 retornados pela API FastAPI", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: async () => ({ detail: "CNPJ 00.000.000/0000-00 inválido para registro" }),
      });
      globalThis.fetch = mockFetch;

      try {
        await apiClient.post("/estabelecimentos", { cnpj_cpf: "000" });
        expect.unreachable("Deveria ter lançado ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(422);
        expect(apiError.message).toBe("CNPJ 00.000.000/0000-00 inválido para registro");
      }
    });

    it("deve aplicar fallback para 'Erro HTTP {status}' caso o JSON de erro não possua detail ou falhe no parse", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => {
          throw new Error("Bad Gateway HTML");
        },
      });
      globalThis.fetch = mockFetch;

      try {
        await apiClient.get("/status-servico");
        expect.unreachable("Deveria ter lançado ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(502);
        expect(apiError.message).toBe("Erro HTTP 502");
      }
    });

    it("deve tratar respostas HTTP 204 No Content retornando objeto vazio {}", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      globalThis.fetch = mockFetch;

      const result = await apiClient.delete("/estabelecimentos/123");
      expect(result).toEqual({});
    });
  });

  // ===========================================================================
  // 3. FALHAS DE REDE E TIMEOUTS
  // ===========================================================================
  describe("Falhas de rede e timeout (Network Error)", () => {
    it("deve capturar falhas de rede do fetch e encapsular em ApiError com status 0", async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error("Failed to fetch"));
      globalThis.fetch = mockFetch;

      try {
        await apiClient.get("/qualquer-endpoint");
        expect.unreachable("Deveria ter lançado ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(0);
        expect(apiError.message).toBe("Failed to fetch");
      }
    });

    it("deve usar mensagem padronizada 'Erro de conexão com o servidor.' caso o erro não seja uma instância de Error", async () => {
      const mockFetch = vi.fn().mockRejectedValue("String de erro bizarra");
      globalThis.fetch = mockFetch;

      try {
        await apiClient.get("/qualquer-endpoint");
        expect.unreachable("Deveria ter lançado ApiError");
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiError = err as ApiError;
        expect(apiError.status).toBe(0);
        expect(apiError.message).toBe("Erro de conexão com o servidor.");
      }
    });
  });

  // ===========================================================================
  // 4. PARÂMETROS DE URL E MÉTODOS AUXILIARES (GET, POST, PATCH, DELETE)
  // ===========================================================================
  describe("Construção de Query Params e Métodos HTTP", () => {
    it("deve montar query string corretamente ignorando null e undefined", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => [],
      });
      globalThis.fetch = mockFetch;

      await apiClient.get("/estabelecimentos", {
        termo: "farmacia",
        skip: 0,
        limit: 10,
        filtroNulo: null,
        filtroIndefinido: undefined,
        ativo: true,
      });

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain("/estabelecimentos?");
      expect(url).toContain("termo=farmacia");
      expect(url).toContain("skip=0");
      expect(url).toContain("limit=10");
      expect(url).toContain("ativo=true");
      expect(url).not.toContain("filtroNulo");
      expect(url).not.toContain("filtroIndefinido");
    });

    it("deve serializar body em JSON nos métodos POST e PATCH", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: "item-1" }),
      });
      globalThis.fetch = mockFetch;

      const payload = { nome: "Empresa Teste", ativa: true };

      // Teste POST
      await apiClient.post("/itens", payload);
      let [, reqInit] = mockFetch.mock.calls[0];
      expect(reqInit?.method).toBe("POST");
      expect(reqInit?.body).toBe(JSON.stringify(payload));

      // Teste PATCH
      await apiClient.patch("/itens/item-1", payload);
      [, reqInit] = mockFetch.mock.calls[1];
      expect(reqInit?.method).toBe("PATCH");
      expect(reqInit?.body).toBe(JSON.stringify(payload));

      // Teste DELETE
      await apiClient.delete("/itens/item-1");
      [, reqInit] = mockFetch.mock.calls[2];
      expect(reqInit?.method).toBe("DELETE");
    });
  });
});
