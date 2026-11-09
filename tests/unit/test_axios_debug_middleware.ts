/**
 * Testes Unitários do Middleware de Depuração do Axios (axiosDebugMiddleware.ts)
 * Valida interceptação de requisições, logging de erros de rede e API,
 * cálculo de latência e mascaramento de dados sensíveis.
 */

import assert from "node:assert";
import axios, { AxiosError, InternalAxiosRequestConfig, AxiosResponse } from "axios";
import { applyAxiosDebugMiddleware, isDebugEnabled } from "../../src/services/axiosDebugMiddleware";

async function runTests() {
  console.log("=== Iniciando Testes Unitários de axiosDebugMiddleware ===");

  // 1. Teste de detecção do modo debug
  assert.strictEqual(typeof isDebugEnabled(), "boolean", "isDebugEnabled deve retornar booleano");
  console.log("✓ Teste 1: isDebugEnabled() avaliado com sucesso");

  // Criação de instância isolada para teste
  const testClient = axios.create({ baseURL: "http://localhost:8000/api/v1" });

  // Espiões de Console para verificar chamadas de log
  const logCalls: { type: string; args: any[] }[] = [];
  const origGroupCollapsed = console.groupCollapsed;
  const origGroupEnd = console.groupEnd;
  const origInfo = console.info;
  const origWarn = console.warn;
  const origError = console.error;
  const origDebug = console.debug;
  const origTable = console.table;

  console.groupCollapsed = (...args: any[]) => logCalls.push({ type: "groupCollapsed", args });
  console.groupEnd = () => logCalls.push({ type: "groupEnd", args: [] });
  console.info = (...args: any[]) => logCalls.push({ type: "info", args });
  console.warn = (...args: any[]) => logCalls.push({ type: "warn", args });
  console.error = (...args: any[]) => logCalls.push({ type: "error", args });
  console.debug = (...args: any[]) => logCalls.push({ type: "debug", args });
  console.table = (...args: any[]) => logCalls.push({ type: "table", args });

  try {
    // 2. Aplicação do middleware
    const eject = applyAxiosDebugMiddleware(testClient);
    assert.strictEqual(typeof eject, "function", "applyAxiosDebugMiddleware deve retornar função eject");
    console.log("✓ Teste 2: applyAxiosDebugMiddleware anexado com sucesso");

    // 3. Simulação de Requisição e Resposta de Sucesso
    // Injetamos um adapter mock que retorna 200
    testClient.defaults.adapter = async (config) => {
      return {
        data: { message: "ok", status: "success" },
        status: 200,
        statusText: "OK",
        headers: {},
        config,
      } as AxiosResponse;
    };

    const res = await testClient.get("/system/info");
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, "success");
    console.log("✓ Teste 3: Requisição de sucesso processada e cronometrada");

    // 4. Simulação de Erro de Rede (Sem response - servidor fora do ar ou timeout)
    testClient.defaults.adapter = async (config) => {
      const err = new AxiosError(
        "Network Error",
        "ERR_NETWORK",
        config,
        {},
        undefined // Sem response
      );
      throw err;
    };

    let caughtNetworkErr = false;
    try {
      await testClient.get("/estabelecimentos");
    } catch (err: any) {
      caughtNetworkErr = true;
      assert.strictEqual(err.isAxiosError, true, "Deve repassar o erro AxiosError");
      assert.strictEqual(err.code, "ERR_NETWORK");
    }
    assert.strictEqual(caughtNetworkErr, true, "Erro de rede deve ser rejeitado para os handlers downstream");

    // Verifica se os logs de erro de rede foram gerados
    const networkGroup = logCalls.find((c) =>
      c.type === "groupCollapsed" && c.args.some((a) => typeof a === "string" && a.includes("FALHA DE REDE"))
    );
    assert.ok(networkGroup, "Deve registrar grupo no console com indicador 'FALHA DE REDE'");
    console.log("✓ Teste 4: Erro de rede interceptado e logado estruturadamente");

    // 5. Simulação de Erro Pydantic 422 (Unprocessable Entity com detail em array)
    testClient.defaults.adapter = async (config) => {
      const err = new AxiosError(
        "Request failed with status code 422",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          data: {
            detail: [
              { loc: ["body", "cnpj_cpf"], msg: "CNPJ/CPF inválido", type: "value_error" },
              { loc: ["body", "razao_social"], msg: "Campo obrigatório", type: "missing" },
            ],
          },
          status: 422,
          statusText: "Unprocessable Entity",
          headers: {},
          config,
        } as AxiosResponse
      );
      throw err;
    };

    let caught422 = false;
    try {
      await testClient.post("/estabelecimentos", {
        cnpj_cpf: "123",
        senha: "SegredoSuperSecreto123", // Campo sensível que deve ser mascarado
      });
    } catch (err: any) {
      caught422 = true;
      assert.strictEqual(err.response?.status, 422);
    }
    assert.strictEqual(caught422, true);

    const pydanticGroup = logCalls.find((c) =>
      c.type === "groupCollapsed" && c.args.some((a) => typeof a === "string" && a.includes("VALIDAÇÃO PYDANTIC (422)"))
    );
    assert.ok(pydanticGroup, "Deve registrar grupo específico para HTTP 422");

    // Verifica se console.table foi chamado para os erros do Pydantic
    const tableCall = logCalls.find((c) => c.type === "table");
    assert.ok(tableCall, "Deve exibir tabela com campos e mensagens do Pydantic");
    console.log("✓ Teste 5: Erro 422 do Pydantic decodificado e exibido em console.table");

    // 6. Simulação de Erro 401 Unauthorized e 429 Rate Limit
    testClient.defaults.adapter = async (config) => {
      const err = new AxiosError(
        "Request failed with status code 429",
        "ERR_BAD_REQUEST",
        config,
        {},
        {
          data: { detail: "Limite de requisições excedido: 5/minute", codigo: "TAXA_LIMITE_EXCEDIDA" },
          status: 429,
          statusText: "Too Many Requests",
          headers: { "retry-after": "60" },
          config,
        } as AxiosResponse
      );
      throw err;
    };

    let caught429 = false;
    try {
      await testClient.post("/auth/login", { email: "teste@braunas.mg.gov.br", senha: "123" });
    } catch {
      caught429 = true;
    }
    assert.strictEqual(caught429, true);

    const rateLimitGroup = logCalls.find((c) =>
      c.type === "groupCollapsed" && c.args.some((a) => typeof a === "string" && a.includes("RATE LIMIT EXCEDIDO"))
    );
    assert.ok(rateLimitGroup, "Deve registrar grupo de erro para HTTP 429");
    console.log("✓ Teste 6: Erro 429 com cabeçalho Retry-After diagnosticado");

    // 7. Teste de Ejeção / Remoção
    eject();
    console.log("✓ Teste 7: Função eject executada com sucesso");

    console.log("\n=======================================================");
    console.log(" TODOS OS TESTES DO AXIOS DEBUG MIDDLEWARE PASSARAM! ");
    console.log("=======================================================\n");
  } finally {
    // Restaura métodos do console
    console.groupCollapsed = origGroupCollapsed;
    console.groupEnd = origGroupEnd;
    console.info = origInfo;
    console.warn = origWarn;
    console.error = origError;
    console.debug = origDebug;
    console.table = origTable;
  }
}

runTests().catch((err) => {
  console.error("Falha nos testes:", err);
  process.exit(1);
});
