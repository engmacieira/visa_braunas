/**
 * Middleware / Interceptor de Depuração do Axios para o Cliente VigiMinas
 *
 * Funcionalidades:
 * - Medição precisa do tempo de resposta (latência) de cada requisição
 * - Interceptação e registro detalhado de falhas de rede (CORS, servidor offline, timeout)
 * - Interceptação e decodificação estruturada de erros de API (4xx / 5xx), especialmente
 *   validações Pydantic (HTTP 422) e respostas do FastAPI
 * - Sanitização automática de dados sensíveis (senhas, tokens) nos logs
 * - Ativo por padrão no ambiente de desenvolvimento (import.meta.env.DEV)
 *   ou quando a flag 'VIGIMINAS_DEBUG_API' estiver ativa no localStorage
 */

import { AxiosError, AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { parseApiError } from "../utils/apiErrorHandler";

// Extensão de tipos do Axios para carregar metadados da requisição
declare module "axios" {
  export interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
      requestId?: string;
    };
  }
}

/**
 * Chaves sensíveis que devem ser mascaradas nos logs do console para evitar vazamento
 */
const SENSITIVE_KEYS = new Set([
  "senha",
  "password",
  "confirmar_senha",
  "token",
  "access_token",
  "refresh_token",
  "secret",
  "authorization",
]);

/**
 * Máscara recursiva para proteger dados sensíveis antes de logar no console
 */
function sanitizeData(data: unknown): unknown {
  if (!data || typeof data !== "object") {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[PROTEGIDO]";
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

/**
 * Verifica se o log de depuração está habilitado
 */
export function isDebugEnabled(): boolean {
  // 1. Sempre ativo no ambiente de desenvolvimento do Vite
  if (typeof import.meta !== "undefined" && (import.meta as any).env) {
    const env = (import.meta as any).env;
    if (env.DEV || env.MODE === "development") {
      return true;
    }
  }

  // 2. Ambiente Node.js (testes e scripts de desenvolvimento)
  if (typeof process !== "undefined" && process.env) {
    if (process.env.NODE_ENV !== "production" || process.env.VIGIMINAS_DEBUG === "true") {
      return true;
    }
  }

  // 3. Ou se ativado manualmente no browser para diagnósticos
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("VIGIMINAS_DEBUG_API") === "true") {
      return true;
    }
  } catch {
    // ignorar falha de acesso a storage
  }

  return false;
}

/**
 * Estilos CSS para os grupos de log no console DevTools
 */
const STYLES = {
  badgeNetworkError: "background: #b91c1c; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
  badgeClientError: "background: #d97706; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
  badgeServerError: "background: #991b1b; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
  badgeSuccess: "background: #059669; color: #ffffff; font-weight: bold; padding: 2px 6px; border-radius: 4px;",
  methodBadge: "background: #0f766e; color: #ffffff; font-weight: bold; padding: 2px 4px; border-radius: 3px;",
  urlText: "color: #38bdf8; font-weight: 600;",
  subText: "color: #94a3b8; font-size: 11px;",
};

/**
 * Formata e exibe erro de requisição / resposta de forma estruturada no console do desenvolvedor
 */
function logAxiosError(error: AxiosError, durationMs?: number): void {
  if (!isDebugEnabled()) {
    return;
  }

  const config = error.config;
  const method = (config?.method || "GET").toUpperCase();
  const url = config?.url || "URL Desconhecida";
  const baseURL = config?.baseURL || "";
  const fullUrl = url.startsWith("http") ? url : `${baseURL}${url}`;
  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const isNetworkError = !error.response;
  const durationLabel = durationMs !== undefined ? `${durationMs.toFixed(1)}ms` : "N/D";

  // Identificação do título e cores do grupo de log
  let badgeStyle = STYLES.badgeClientError;
  let titleBadge = `API ERROR ${status || ""}`;

  if (isNetworkError) {
    badgeStyle = STYLES.badgeNetworkError;
    titleBadge = "FALHA DE REDE / CONEXÃO";
  } else if (status && status >= 500) {
    badgeStyle = STYLES.badgeServerError;
    titleBadge = `ERRO INTERNO ${status}`;
  } else if (status === 422) {
    titleBadge = "VALIDAÇÃO PYDANTIC (422)";
  } else if (status === 401) {
    titleBadge = "NÃO AUTORIZADO (401)";
  } else if (status === 403) {
    titleBadge = "ACESSO NEGADO (403)";
  } else if (status === 404) {
    titleBadge = "NÃO ENCONTRADO (404)";
  } else if (status === 429) {
    titleBadge = "RATE LIMIT EXCEDIDO (429)";
  }

  // Agrupa os logs de forma recolhida para manter o console limpo
  console.groupCollapsed(
    `%c[VigiMinas API]%c %c${titleBadge}%c %c${method}%c ${url} (${durationLabel})`,
    "color: #14b8a6; font-weight: bold;",
    "",
    badgeStyle,
    "",
    STYLES.methodBadge,
    STYLES.urlText
  );

  // 1. Mensagem amigável traduzida pelo utilitário central
  const parsedMsg = parseApiError(error);
  console.info(`%cℹ️ Mensagem: %c${parsedMsg}`, "font-weight: bold; color: #e2e8f0;", "color: #f1f5f9;");

  // 2. Dicas e diagnóstico contextual para o desenvolvedor
  if (isNetworkError) {
    console.warn(
      "💡 [Diagnóstico de Rede]: Nenhuma resposta foi recebida do backend FastAPI.\n" +
        `   - Verifique se a API está rodando em '${baseURL || "http://localhost:8000"}'.\n` +
        "   - Verifique se há bloqueio de CORS ou se o container PostgreSQL está ativo.\n" +
        `   - Código do Axios: ${error.code || "ERR_NETWORK"}`
    );
  } else if (status === 422) {
    const detail = (error.response?.data as { detail?: unknown })?.detail;
    console.warn(
      "💡 [Diagnóstico de Validação]: O payload enviado não atende ao schema Pydantic esperado pelo backend."
    );
    if (Array.isArray(detail)) {
      console.table(
        detail.map((err) => ({
          Campo: Array.isArray(err.loc) ? err.loc.join(" -> ") : err.loc,
          Problema: err.msg,
          Tipo: err.type,
          Input: err.input !== undefined ? JSON.stringify(err.input) : "N/D",
        }))
      );
    }
  } else if (status === 401) {
    console.warn("💡 [Diagnóstico de Sessão]: Token JWT ausente, inválido ou expirado. Sessão será reinicializada.");
  } else if (status === 429) {
    const retryAfter = error.response?.headers?.["retry-after"] || "60s";
    console.warn(`💡 [Diagnóstico de Rate Limit]: Limite de requisições do SlowAPI atingido. Aguarde ${retryAfter}.`);
  } else if (status && status >= 500) {
    console.error("💡 [Diagnóstico de Servidor]: O backend lançou uma exceção não tratada (HTTP 500). Verifique os logs do Uvicorn.");
  }

  // 3. Detalhes completos da Requisição
  console.groupCollapsed("📤 Detalhes da Requisição (Enviada)");
  console.log("Endpoint Completo:", fullUrl);
  console.log("Método HTTP:", method);
  if (config?.params && Object.keys(config.params).length > 0) {
    console.log("Parâmetros (Query Params):", config.params);
  }
  if (config?.data) {
    try {
      const parsedBody = typeof config.data === "string" ? JSON.parse(config.data) : config.data;
      console.log("Payload Enviado (Sanitizado):", sanitizeData(parsedBody));
    } catch {
      console.log("Payload Enviado (Raw):", config.data);
    }
  }
  if (config?.headers) {
    const safeHeaders: Record<string, unknown> = { ...config.headers };
    if (safeHeaders.Authorization && typeof safeHeaders.Authorization === "string") {
      safeHeaders.Authorization = "Bearer ey...[TOKEN OCULTADO]";
    }
    console.log("Cabeçalhos da Requisição:", safeHeaders);
  }
  console.groupEnd();

  // 4. Detalhes completos da Resposta (se houver)
  if (error.response) {
    console.groupCollapsed(`📥 Detalhes da Resposta (${status} ${statusText || ""})`);
    console.log("Status Code:", status);
    console.log("Status Text:", statusText);
    console.log("Dados do Backend (Raw):", error.response.data);
    console.log("Cabeçalhos da Resposta:", error.response.headers);
    console.groupEnd();
  }

  // 5. Instância original do erro para inspecionar stack trace
  console.groupCollapsed("🔍 Stack Trace e Erro Original");
  console.dir(error);
  console.groupEnd();

  console.groupEnd();
}

/**
 * Registra requisições de sucesso em modo de depuração (compacto)
 */
function logAxiosSuccess(response: AxiosResponse, durationMs?: number): void {
  if (!isDebugEnabled()) {
    return;
  }

  const method = (response.config.method || "GET").toUpperCase();
  const url = response.config.url || "";
  const durationLabel = durationMs !== undefined ? `${durationMs.toFixed(1)}ms` : "N/D";

  // Em desenvolvimento, registra uma linha discreta de sucesso para rastreabilidade
  console.debug(
    `%c[VigiMinas API]%c %c${response.status}%c %c${method}%c ${url} %c(${durationLabel})`,
    "color: #14b8a6; font-weight: bold;",
    "",
    STYLES.badgeSuccess,
    "",
    STYLES.methodBadge,
    STYLES.urlText,
    STYLES.subText
  );
}

/**
 * Aplica o Middleware de Interceptação e Depuração a uma instância do Axios
 *
 * @param instance Instância do Axios (ex: apiClient ou publicApiClient)
 * @returns Função de remoção (eject) dos interceptors caso necessário
 */
export function applyAxiosDebugMiddleware(instance: AxiosInstance): () => void {
  // 1. Interceptor de Requisição: Carimba timestamp para cálculo de latência
  const requestInterceptorId = instance.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
      config.metadata = {
        startTime: performance.now(),
      };
      return config;
    },
    (error: unknown) => {
      if (error instanceof AxiosError) {
        logAxiosError(error);
      }
      return Promise.reject(error);
    }
  );

  // 2. Interceptor de Resposta e Erros: Captura e loga falhas com cálculo de latência
  const responseInterceptorId = instance.interceptors.response.use(
    (response: AxiosResponse) => {
      const startTime = response.config.metadata?.startTime;
      const durationMs = startTime ? performance.now() - startTime : undefined;
      logAxiosSuccess(response, durationMs);
      return response;
    },
    (error: unknown) => {
      if (error instanceof AxiosError) {
        const startTime = error.config?.metadata?.startTime;
        const durationMs = startTime ? performance.now() - startTime : undefined;
        logAxiosError(error, durationMs);
      } else {
        console.error("[VigiMinas API] Erro desconhecido interceptado:", error);
      }
      return Promise.reject(error);
    }
  );

  // Retorna função para ejeção caso o ciclo de vida exija desativação
  return () => {
    instance.interceptors.request.eject(requestInterceptorId);
    instance.interceptors.response.eject(responseInterceptorId);
  };
}

export default applyAxiosDebugMiddleware;
