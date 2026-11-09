/**
 * Componente Global de Error Boundary do Sistema VigiMinas
 *
 * Captura exceções não tratadas durante o ciclo de vida e renderização dos componentes React,
 * impedindo que a aplicação trave em uma tela branca ("white screen of death") e exibindo
 * uma interface amigável, institucional e acessível, com opções para:
 *
 * 1. Recarregar a página (hard refresh).
 * 2. Tentar recuperar o estado do componente (resetErrorBoundary).
 * 3. Retornar à página inicial segura (Dashboard).
 * 4. Copiar diagnóstico técnico estruturado para acionamento do suporte da Vigilância Sanitária.
 */

import React, { Component, ErrorInfo } from "react";
import {
  AlertTriangle,
  RotateCcw,
  Home,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { ROUTES } from "../../config/routes.config";

export interface ErrorBoundaryFallbackProps {
  error: Error;
  errorInfo: ErrorInfo | null;
  resetErrorBoundary: () => void;
  reloadPage: () => void;
  goHome: () => void;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /**
   * Componente ou função de render customizada para a tela de erro
   */
  fallback?:
    | React.ReactNode
    | ((props: ErrorBoundaryFallbackProps) => React.ReactNode);
  /**
   * Callback invocado quando um erro for interceptado
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /**
   * Callback invocado quando o usuário solicitar reset da árvore de componentes
   */
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
  copied: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  private copyTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Registra o erro no console para depuração em desenvolvimento
    console.error("[VigiMinas ErrorBoundary] Exceção não tratada capturada:", {
      error,
      componentStack: errorInfo.componentStack,
    });

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (callbackError) {
        console.error(
          "[VigiMinas ErrorBoundary] Erro no callback onError:",
          callbackError
        );
      }
    }
  }

  componentWillUnmount(): void {
    if (this.copyTimeout) {
      clearTimeout(this.copyTimeout);
    }
  }

  resetErrorBoundary = (): void => {
    this.props.onReset?.();
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
      copied: false,
    });
  };

  reloadPage = (): void => {
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  };

  goHome = (): void => {
    this.resetErrorBoundary();
    if (typeof window !== "undefined") {
      window.location.href = ROUTES.DASHBOARD;
    }
  };

  toggleDetails = (): void => {
    this.setState((prev) => ({ showDetails: !prev.showDetails }));
  };

  copyErrorDiagnostics = async (): Promise<void> => {
    const { error, errorInfo } = this.state;
    const diagnosticReport = [
      `=== RELATÓRIO DE ERRO - ${APP_CONFIG.nome} v${APP_CONFIG.versao} ===`,
      `Município: ${APP_CONFIG.municipio}/${APP_CONFIG.uf}`,
      `Órgão: ${APP_CONFIG.orgao} - ${APP_CONFIG.secretaria}`,
      `Data/Hora: ${new Date().toISOString()}`,
      `URL Atual: ${typeof window !== "undefined" ? window.location.href : "N/A"}`,
      `User Agent: ${typeof navigator !== "undefined" ? navigator.userAgent : "N/A"}`,
      `Mensagem: ${error?.name}: ${error?.message}`,
      "",
      "--- STACK TRACE ---",
      error?.stack || "Stack trace indisponível",
      "",
      "--- COMPONENT STACK ---",
      errorInfo?.componentStack || "Component stack indisponível",
      "================================================",
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(diagnosticReport);
        this.setState({ copied: true });
        if (this.copyTimeout) clearTimeout(this.copyTimeout);
        this.copyTimeout = setTimeout(() => {
          this.setState({ copied: false });
        }, 3000);
      }
    } catch (err) {
      console.error("[VigiMinas ErrorBoundary] Falha ao copiar relatório:", err);
    }
  };

  render(): React.ReactNode {
    const { hasError, error, errorInfo, showDetails, copied } = this.state;
    const { children, fallback } = this.props;

    if (!hasError) {
      return children;
    }

    // Se o usuário passou um fallback customizado
    if (fallback) {
      if (typeof fallback === "function") {
        return fallback({
          error: error || new Error("Erro desconhecido"),
          errorInfo,
          resetErrorBoundary: this.resetErrorBoundary,
          reloadPage: this.reloadPage,
          goHome: this.goHome,
        });
      }
      return fallback;
    }

    // Interface Institucional Padrão do Error Boundary
    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 antialiased"
      >
        {/* Cabeçalho Institucional Superior */}
        <header className="max-w-4xl w-full mx-auto flex items-center justify-between pb-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <span className="text-sm font-black">VM</span>
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight">
                {APP_CONFIG.nome}
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {APP_CONFIG.municipio} / {APP_CONFIG.uf} · {APP_CONFIG.orgao}
              </p>
            </div>
          </div>
          <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
            v{APP_CONFIG.versao}
          </span>
        </header>

        {/* Card Central de Alerta de Erro */}
        <main className="max-w-2xl w-full mx-auto my-auto py-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/60 shrink-0">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-snug">
                  Ocorreu uma falha inesperada na aplicação
                </h2>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  A interface encontrou uma inconsistência durante a renderização.
                  Para sua segurança, a execução foi interrompida antes de comprometer dados operacionais.
                </p>
              </div>
            </div>

            {/* Mensagem resumida do erro */}
            {error && (
              <div className="mt-5 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-xs text-rose-700 dark:text-rose-300 font-mono break-words">
                <span className="font-semibold">{error.name}:</span> {error.message}
              </div>
            )}

            {/* Painel de Ações de Recuperação */}
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={this.reloadPage}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-white bg-teal-600 hover:bg-teal-700 active:bg-teal-800 rounded-lg shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Recarregar Aplicação</span>
              </button>

              <button
                type="button"
                onClick={this.resetErrorBoundary}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tentar Novamente</span>
              </button>

              <button
                type="button"
                onClick={this.goHome}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Ir para Página Inicial</span>
              </button>
            </div>

            {/* Seção Colapsável de Detalhes Técnicos */}
            <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={this.toggleDetails}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                >
                  {showDetails ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  <span>
                    {showDetails
                      ? "Ocultar detalhes técnicos"
                      : "Ver detalhes técnicos (Suporte de TI)"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={this.copyErrorDiagnostics}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-md transition-colors"
                  title="Copiar relatório para atendimento do suporte"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Copiado!
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Diagnóstico</span>
                    </>
                  )}
                </button>
              </div>

              {showDetails && (
                <div className="mt-3.5 space-y-3">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Pilha de Chamadas (Stack Trace):
                    </span>
                    <pre className="mt-1 p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-48 border border-slate-800">
                      {error?.stack || "Nenhum stack trace capturado."}
                    </pre>
                  </div>

                  {errorInfo?.componentStack && (
                    <div>
                      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                        Árvore de Componentes (Component Stack):
                      </span>
                      <pre className="mt-1 p-3 rounded-lg bg-slate-950 text-slate-200 text-[11px] font-mono leading-relaxed overflow-x-auto max-h-36 border border-slate-800">
                        {errorInfo.componentStack}
                      </pre>
                    </div>
                  )}

                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
                    <HelpCircle className="w-4 h-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      Caso a falha persista após recarregar, encaminhe o diagnóstico copiado para o suporte da Vigilância Sanitária pelo e-mail{" "}
                      <strong>{APP_CONFIG.endereco.email}</strong> ou telefone{" "}
                      <strong>{APP_CONFIG.endereco.telefone}</strong>.
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>

        {/* Rodapé Institucional Inferior */}
        <footer className="max-w-4xl w-full mx-auto text-center pt-6 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
          <p>
            {APP_CONFIG.prefeitura} · {APP_CONFIG.secretaria} · {APP_CONFIG.departamento}
          </p>
        </footer>
      </div>
    );
  }
}

export default ErrorBoundary;
