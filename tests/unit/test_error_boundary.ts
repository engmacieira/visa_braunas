/**
 * Testes Unitários: ErrorBoundary do VigiMinas
 * Executável via tsx: npx tsx tests/unit/test_error_boundary.ts
 */

import assert from "node:assert";
import { ErrorBoundary } from "../../src/components/common/ErrorBoundary";

async function runTests() {
  console.log("=== INICIANDO TESTES DO ERROR BOUNDARY ===");

  // 1. Teste de getDerivedStateFromError
  console.log("Teste 1: getDerivedStateFromError atualiza o estado para hasError=true...");
  const mockError = new Error("Falha simulada no componente filho");
  const derivedState = ErrorBoundary.getDerivedStateFromError(mockError);

  assert.strictEqual(derivedState.hasError, true, "hasError deve ser true");
  assert.strictEqual(derivedState.error?.message, "Falha simulada no componente filho", "Mensagem de erro deve ser preservada");

  // 2. Teste de instanciação e reset de estado
  console.log("Teste 2: Instanciação, callbacks e resetErrorBoundary...");
  let errorCapturado: Error | null = null;
  let resetChamado = false;

  const instance = new ErrorBoundary({
    children: null,
    onError: (err) => {
      errorCapturado = err;
    },
    onReset: () => {
      resetChamado = true;
    },
  });

  // Mock de updater para ambiente de teste unitário sem DOM
  (instance as unknown as { updater: unknown }).updater = {
    isMounted: () => true,
    enqueueSetState: (_inst: unknown, partialState: unknown) => {
      const updates = typeof partialState === "function" ? (partialState as (s: typeof instance.state) => typeof instance.state)(instance.state) : partialState;
      instance.state = { ...instance.state, ...(updates as object) };
    },
  };

  // Estado inicial
  assert.strictEqual(instance.state.hasError, false, "Estado inicial deve ter hasError=false");
  assert.strictEqual(instance.state.error, null, "Estado inicial deve ter error=null");

  // Simula captura de erro no ciclo de vida
  const errorInfoMock = { componentStack: "\n    at ComponenteQueFalhou\n    at App" };
  instance.componentDidCatch(mockError, errorInfoMock);

  assert.strictEqual(errorCapturado, mockError, "Callback onError deve receber a instância do erro");
  assert.strictEqual(instance.state.errorInfo?.componentStack, errorInfoMock.componentStack, "Component stack deve ser registrado no estado");

  // Simula reset
  instance.resetErrorBoundary();
  assert.strictEqual(instance.state.hasError, false, "Após reset, hasError deve ser false");
  assert.strictEqual(instance.state.error, null, "Após reset, error deve ser null");
  assert.strictEqual(resetChamado, true, "Callback onReset deve ser acionado");

  // 3. Teste de toggle de detalhes técnicos
  console.log("Teste 3: Alternância de exibição de detalhes técnicos...");
  assert.strictEqual(instance.state.showDetails, false, "showDetails deve iniciar como false");
  instance.toggleDetails();
  assert.strictEqual(instance.state.showDetails, true, "showDetails deve alternar para true");
  instance.toggleDetails();
  assert.strictEqual(instance.state.showDetails, false, "showDetails deve alternar para false");

  console.log("=== TODOS OS TESTES DO ERROR BOUNDARY PASSARAM COM SUCESSO! ===");
}

runTests().catch((err) => {
  console.error("Falha nos testes:", err);
  process.exit(1);
});
