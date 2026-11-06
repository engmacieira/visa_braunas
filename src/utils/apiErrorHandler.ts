/**
 * Utilitário Centralizado de Extração e Tratamento de Erros da API FastAPI
 * Unifica a captura de exceções HTTP, regras de validação Pydantic (422) e falhas de rede.
 */

import axios, { AxiosError } from "axios";

interface PydanticErrorItem {
  loc?: (string | number)[];
  msg?: string;
  type?: string;
}

interface FastAPIErrorResponse {
  detail?: string | PydanticErrorItem[];
  message?: string;
  error?: string;
}

const CAMPO_TRADUCOES: Record<string, string> = {
  cnpj: "CNPJ",
  cpf: "CPF",
  cnpj_cpf: "CNPJ/CPF",
  razao_social: "Razão Social",
  nome_fantasia: "Nome Fantasia",
  email: "E-mail",
  telefone: "Telefone",
  grau_risco: "Grau de Risco Sanitário",
  cnae_codigo: "Código do CNAE",
  tipo_solicitacao: "Tipo de Solicitação",
  data_inicio: "Data de Início",
  data_fim: "Data de Término",
  relato_denuncia: "Relato da Denúncia",
  local_denunciado_identificacao: "Local Denunciado",
  parecer_conclusivo: "Parecer Técnico Conclusivo",
  numero_termo: "Número do Termo",
  fiscal_designado_id: "Fiscal Designado",
  senha: "Senha de Acesso",
  username: "Usuário/Matrícula",
};

/**
 * Traduz o caminho de um erro do Pydantic para um rótulo amigável ao usuário
 */
function formatarCampoPydantic(loc?: (string | number)[]): string {
  if (!loc || loc.length === 0) return "";
  const ultimoSegmento = String(loc[loc.length - 1]);
  return CAMPO_TRADUCOES[ultimoSegmento] || ultimoSegmento.replace(/_/g, " ");
}

/**
 * Função pura que extrai uma mensagem legível, amigável e precisa a partir de qualquer erro
 */
export function parseApiError(error: unknown): string {
  // Erro não identificado
  if (!error) {
    return "Ocorreu uma falha inesperada na operação. Tente novamente.";
  }

  // Tratamento de erros do Axios
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<FastAPIErrorResponse>;

    // Falha de Conexão ou Rede (Sem resposta do servidor)
    if (!axiosErr.response) {
      if (axiosErr.code === "ECONNABORTED" || axiosErr.message.includes("timeout")) {
        return "Tempo limite de conexão esgotado. Verifique sua rede e tente novamente.";
      }
      return "Não foi possível conectar ao servidor municipal. Verifique sua conexão com a internet.";
    }

    const { status, data } = axiosErr.response;

    // 1. Erro de Validação de Schema do Pydantic (HTTP 422)
    if (status === 422 && data?.detail && Array.isArray(data.detail)) {
      const errosPydantic = data.detail.map((item) => {
        const campo = formatarCampoPydantic(item.loc);
        const msg = item.msg ? item.msg.replace(/^Value error, /i, "") : "valor inválido";
        return campo ? `${campo}: ${msg}` : msg;
      });

      return `Pendência de validação: ${errosPydantic.join("; ")}.`;
    }

    // 2. Mensagem direta de 'detail' enviada pelo FastAPI (HTTP 400, 404, 409, etc.)
    if (typeof data?.detail === "string" && data.detail.trim().length > 0) {
      return data.detail;
    }

    if (typeof data?.message === "string" && data.message.trim().length > 0) {
      return data.message;
    }

    // 3. Códigos de Status HTTP Específicos
    switch (status) {
      case 400:
        return "Requisição inválida. Verifique os dados informados e tente novamente.";
      case 401:
        return "Sua sessão expirou ou suas credenciais são inválidas. Faça login novamente.";
      case 403:
        return "Acesso não autorizado. Seu perfil de usuário não possui permissão para esta ação.";
      case 404:
        return "O registro solicitado não foi localizado no banco de dados da Vigilância Sanitária.";
      case 409:
        return "Conflito de dados: este registro ou documento já se encontra cadastrado no sistema.";
      case 429:
        return "Limite de requisições excedido. Por favor, aguarde alguns instantes antes de tentar novamente.";
      case 500:
        return "Ocorreu um erro interno no servidor municipal. Nossa equipe técnica já foi alertada.";
      case 502:
      case 503:
        return "O serviço de regulação sanitária está temporariamente indisponível para manutenção.";
      default:
        return `Erro de comunicação com o servidor (${status}). Tente novamente.`;
    }
  }

  // Erros convencionais de JavaScript (Error)
  if (error instanceof Error) {
    return error.message;
  }

  return "Ocorreu um erro inesperado no processamento da solicitação.";
}

/**
 * Emite uma notificação visual padronizada de feedback para o operador
 * Utiliza o sistema nativo da interface evitando alerts intrusivos.
 */
export function emitFeedback(
  tipo: "sucesso" | "erro" | "alerta" | "info",
  mensagem: string,
  titulo?: string
): void {
  // Dispara evento CustomEvent para que componentes de Toast possam capturar globalmente
  if (typeof window !== "undefined") {
    const event = new CustomEvent("vigiminas:notification", {
      detail: { tipo, mensagem, titulo },
    });
    window.dispatchEvent(event);
  }
}
