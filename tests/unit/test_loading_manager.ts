/**
 * Testes Unitários: Gerenciador de Loading Global e Interceptors Axios
 * Executável via tsx: npx tsx tests/unit/test_loading_manager.ts
 */

import assert from "node:assert";
import axios, { AxiosInstance } from "axios";
import { loadingManager, attachLoadingInterceptors } from "../../src/services/loadingManager";

async function runTests() {
  console.log("=== INICIANDO TESTES DO GERENCIADOR DE LOADING GLOBAL ===");

  // 1. Teste de contagem e estado inicial
  console.log("Teste 1: Reset e estado inicial...");
  loadingManager.reset();
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem inicial deve ser 0");
  assert.strictEqual(loadingManager.isLoading(), false, "isLoading inicial deve ser false");

  // 2. Teste de incremento e decremento
  console.log("Teste 2: Incremento e decremento manual...");
  loadingManager.increment();
  assert.strictEqual(loadingManager.getCount(), 1, "Contagem deve ser 1 após 1º incremento");
  assert.strictEqual(loadingManager.isLoading(), true, "isLoading deve ser true com 1 requisição ativa");

  loadingManager.increment();
  assert.strictEqual(loadingManager.getCount(), 2, "Contagem deve ser 2 após 2º incremento");

  loadingManager.decrement();
  assert.strictEqual(loadingManager.getCount(), 1, "Contagem deve ser 1 após 1º decremento");
  assert.strictEqual(loadingManager.isLoading(), true, "isLoading deve permanecer true com 1 requisição pendente");

  loadingManager.decrement();
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem deve ser 0 após 2º decremento");
  assert.strictEqual(loadingManager.isLoading(), false, "isLoading deve ser false quando contagem chega a 0");

  // 3. Teste de proteção contra contagem negativa
  console.log("Teste 3: Proteção contra contagem negativa...");
  loadingManager.decrement();
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem não deve ficar negativa (< 0)");
  assert.strictEqual(loadingManager.isLoading(), false, "isLoading não deve ser afetado por decremento excedente");

  // 4. Teste do listener / pub-sub
  console.log("Teste 4: Inscrição e notificação de listeners...");
  let observedLoading: boolean | null = null;
  let observedCount: number | null = null;

  const unsubscribe = loadingManager.subscribe((loading, count) => {
    observedLoading = loading;
    observedCount = count;
  });

  // Listener recebe estado atual imediatamente ao se inscrever
  assert.strictEqual(observedLoading, false, "Listener deve receber estado inicial imediatamente");
  assert.strictEqual(observedCount, 0, "Listener deve receber contagem inicial imediatamente");

  loadingManager.increment();
  assert.strictEqual(observedLoading, true, "Listener deve ser notificado com loading=true no incremento");
  assert.strictEqual(observedCount, 1, "Listener deve ser notificado com count=1 no incremento");

  unsubscribe();
  loadingManager.decrement();
  assert.strictEqual(observedCount, 1, "Após unsubscribe, listener não deve mais receber alterações");

  loadingManager.reset();
  assert.strictEqual(loadingManager.getCount(), 0);

  // 5. Teste de interceptor do Axios com requisição bem-sucedida (Adapter mock)
  console.log("Teste 5: Interceptor com sucesso de resposta...");
  const mockAxios: AxiosInstance = axios.create({
    adapter: async (config) => {
      // Verifica se durante a execução a contagem é 1
      assert.strictEqual(loadingManager.isLoading(), true, "Deve registrar requisição em andamento durante voo");
      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    },
  });

  attachLoadingInterceptors(mockAxios);

  await mockAxios.get("/api/v1/mock-sucesso");
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem deve voltar a 0 após resposta bem-sucedida");
  assert.strictEqual(loadingManager.isLoading(), false, "isLoading deve ser false após finalização");

  // 6. Teste de interceptor do Axios com erro HTTP
  console.log("Teste 6: Interceptor com rejeição/erro HTTP...");
  const mockErrorAxios: AxiosInstance = axios.create({
    adapter: async (config) => {
      assert.strictEqual(loadingManager.isLoading(), true, "Deve estar ativo antes da falha");
      const err = new Error("Request failed with status code 500");
      // @ts-expect-error simulando erro Axios
      err.response = { status: 500, data: { detail: "Internal Server Error" } };
      // @ts-expect-error simulando config
      err.config = config;
      // @ts-expect-error simulando isAxiosError
      err.isAxiosError = true;
      throw err;
    },
  });

  attachLoadingInterceptors(mockErrorAxios);

  try {
    await mockErrorAxios.get("/api/v1/mock-erro");
    assert.fail("Deveria ter lançado erro");
  } catch {
    // Erro esperado
  }
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem deve voltar a 0 mesmo em caso de erro HTTP");
  assert.strictEqual(loadingManager.isLoading(), false, "isLoading deve ser false após captura de erro");

  // 7. Teste de flag skipGlobalLoading
  console.log("Teste 7: Flag skipGlobalLoading...");
  const mockSkipAxios: AxiosInstance = axios.create({
    adapter: async (config) => {
      assert.strictEqual(loadingManager.getCount(), 0, "Não deve incrementar quando skipGlobalLoading for true");
      return {
        data: { ok: true },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      };
    },
  });

  attachLoadingInterceptors(mockSkipAxios);
  await mockSkipAxios.get("/api/v1/mock-skip", { skipGlobalLoading: true });
  assert.strictEqual(loadingManager.getCount(), 0, "Contagem permanece 0");

  console.log("=== TODOS OS TESTES PASSARAM COM SUCESSO! ===");
}

runTests().catch((err) => {
  console.error("Falha nos testes:", err);
  process.exit(1);
});
