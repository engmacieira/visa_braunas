import { describe, expect, it, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ErrorBoundary } from "../ErrorBoundary";

// Componente utilitário que simula erro de renderização
const ProblematicChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow }) => {
  if (shouldThrow) {
    throw new Error("Erro de renderização crítico no componente!");
  }
  return <div data-testid="conteudo-normal">Conteúdo carregado com sucesso</div>;
};

describe("ErrorBoundary (Componente Core de Proteção)", () => {
  // Suprime logs de erro intencionais do console.error durante os testes
  const originalError = console.error;
  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("deve renderizar normalmente os componentes filhos quando não houver exceção", () => {
    render(
      <ErrorBoundary>
        <ProblematicChild shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("conteudo-normal")).toBeInTheDocument();
    expect(screen.getByText("Conteúdo carregado com sucesso")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("deve capturar erro de renderização e exibir interface institucional de contingência", () => {
    render(
      <ErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.queryByTestId("conteudo-normal")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Ocorreu uma falha inesperada na aplicação")).toBeInTheDocument();
    expect(
      screen.getByText(/Erro de renderização crítico no componente!/)
    ).toBeInTheDocument();
  });

  it("deve invocar o callback onError com o erro e informações da árvore de componentes", () => {
    const onErrorMock = vi.fn();

    render(
      <ErrorBoundary onError={onErrorMock}>
        <ProblematicChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(onErrorMock).toHaveBeenCalledTimes(1);
    const [capturedError, capturedInfo] = onErrorMock.mock.calls[0];
    expect(capturedError.message).toBe("Erro de renderização crítico no componente!");
    expect(capturedInfo.componentStack).toBeDefined();
  });

  it("deve permitir expandir e ocultar detalhes técnicos via clique do usuário", async () => {
    const user = userEvent.setup();

    render(
      <ErrorBoundary>
        <ProblematicChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const toggleButton = screen.getByRole("button", {
      name: /Ver detalhes técnicos/i,
    });
    expect(toggleButton).toBeInTheDocument();
    expect(screen.queryByText(/Pilha de Chamadas \(Stack Trace\):/i)).not.toBeInTheDocument();

    // Clica para expandir
    await user.click(toggleButton);
    expect(screen.getByText(/Pilha de Chamadas \(Stack Trace\):/i)).toBeInTheDocument();
    expect(screen.getByText(/Ocultar detalhes técnicos/i)).toBeInTheDocument();

    // Clica para ocultar
    await user.click(screen.getByRole("button", { name: /Ocultar detalhes técnicos/i }));
    expect(screen.queryByText(/Pilha de Chamadas \(Stack Trace\):/i)).not.toBeInTheDocument();
  });

  it("deve acionar callback onReset ao clicar no botão Tentar Novamente", async () => {
    const user = userEvent.setup();
    const onResetMock = vi.fn();

    render(
      <ErrorBoundary onReset={onResetMock}>
        <ProblematicChild shouldThrow={true} />
      </ErrorBoundary>
    );

    const retryButton = screen.getByRole("button", { name: /Tentar Novamente/i });
    await user.click(retryButton);

    expect(onResetMock).toHaveBeenCalledTimes(1);
  });

  it("deve suportar render props personalizadas na propriedade fallback", () => {
    render(
      <ErrorBoundary
        fallback={({ error, resetErrorBoundary }) => (
          <div data-testid="fallback-custom">
            <span>Erro customizado: {error.message}</span>
            <button onClick={resetErrorBoundary}>Resetar</button>
          </div>
        )}
      >
        <ProblematicChild shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByTestId("fallback-custom")).toBeInTheDocument();
    expect(
      screen.getByText(/Erro customizado: Erro de renderização crítico no componente!/)
    ).toBeInTheDocument();
  });
});
