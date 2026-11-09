import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 02 - Gestão de Estabelecimentos Regulados e CNAEs", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticação com Coordenador Seed
    await page.goto("/login");
    await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("CoordVisa@2026");
    const authPromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 200
    );
    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await authPromise;
    await expect(page).toHaveURL(/\/$/);
  });

  test("Listagem, busca com debounce e filtros de risco sanitário", async ({ page }) => {
    await page.goto("/estabelecimentos");
    await expect(page.getByRole("heading", { name: "Estabelecimentos Regulados" })).toBeVisible();

    // Aguarda carregar dados iniciais dos estabelecimentos seeded
    await page.waitForLoadState("networkidle");

    // 1. Testar busca com debounce por razão social
    const buscaInput = page.getByPlaceholder("Buscar por CNPJ/CPF, Razão Social ou Nome Fantasia...");
    await expect(buscaInput).toBeVisible();

    const searchResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/estabelecimentos") && resp.url().includes("busca=Drogaria") && resp.status() === 200
    );
    await buscaInput.fill("Drogaria");
    await searchResponsePromise;

    // Confirma que a tabela exibe a Drogaria Braúnas
    await expect(page.getByText("Drogaria Braúnas Popular Ltda").first()).toBeVisible();

    // 2. Testar filtro de risco sanitário
    const riscoSelect = page.locator("select").filter({ hasText: /Todos os Níveis de Risco/i });
    const filterRiscoPromise = page.waitForResponse(
      (resp) => resp.url().includes("/estabelecimentos") && resp.url().includes("risco=Risco+III") && resp.status() === 200
    );
    await riscoSelect.selectOption("Risco III");
    await filterRiscoPromise;

    // O estabelecimento de Risco III deve ser exibido
    await expect(page.getByText(/Hospital|Drogaria/i).first()).toBeVisible();
  });

  test("Cadastro completo: inclusão de estabelecimento, CNAE principal/secundário, cálculo dinâmico de risco e reflexo na listagem", async ({
    page,
  }) => {
    await page.goto("/estabelecimentos/novo");
    await expect(page.getByRole("heading", { name: "Novo Estabelecimento Regulado" })).toBeVisible();

    // Gera CNPJ e CPF matematicamente válidos com sufixo dinâmico para garantir unicidade
    const ts = Math.floor(10000 + Math.random() * 90000);
    // Base de 12 dígitos com 8 dígitos raiz + filial 0001
    const baseCnpj = `900${ts}0001`;
    const b = baseCnpj.split("").map(Number);
    const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum1 = b.reduce((acc, val, idx) => acc + val * w1[idx], 0);
    const rem1 = sum1 % 11;
    const d1 = rem1 < 2 ? 0 : 11 - rem1;
    b.push(d1);

    const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const sum2 = b.reduce((acc, val, idx) => acc + val * w2[idx], 0);
    const rem2 = sum2 % 11;
    const d2 = rem2 < 2 ? 0 : 11 - rem2;
    b.push(d2);

    const cnpjStr = b.join("");
    const cnpjValido = `${cnpjStr.slice(0, 2)}.${cnpjStr.slice(2, 5)}.${cnpjStr.slice(5, 8)}/${cnpjStr.slice(8, 12)}-${cnpjStr.slice(12)}`;
    const cpfRepValido = "854.129.371-87";
    const razaoSocial = `Laboratório Clínico Braúnas E2E ${ts} Ltda`;
    const nomeFantasia = `Lab Braúnas E2E ${ts}`;

    // Preenchimento Seção 1: Identificação Cadastral (usando input[name=...])
    await page.locator('input[name="cnpj_cpf"]').fill(cnpjValido);
    await page.locator('input[name="razao_social"]').fill(razaoSocial);
    await page.locator('input[name="nome_fantasia"]').fill(nomeFantasia);
    await page.locator('input[name="inscricao_municipal"]').fill("102030");

    // Preenchimento Seção 2: Localização e Contatos
    await page.locator('input[name="logradouro"]').fill("Avenida Brasil");
    await page.locator('input[name="numero"]').fill("500");
    await page.locator('input[name="telefone_celular"]').fill("(33) 98888-7766");
    await page.locator('input[name="email"]').fill(`contato.${ts}@labbraunas.com.br`);

    // Preenchimento Seção 3: Atividades Econômicas (CNAEs)
    const cnaeSearchInput = page.getByPlaceholder("Digite o código (ex: 4771-7/01) ou descrição da atividade...");
    await expect(cnaeSearchInput).toBeVisible();

    // 1º CNAE (Principal): 8630-5/04 (Atividade odontológica - Risco III)
    const cnaeResponse1 = page.waitForResponse(
      (resp) => resp.url().includes("/cnaes") && resp.status() === 200
    );
    await cnaeSearchInput.fill("8630");
    await cnaeResponse1;

    // Clica no resultado retornado no dropdown
    const itemCnae1 = page.locator("li").filter({ hasText: "8630-5/04" }).first();
    await expect(itemCnae1).toBeVisible();
    await itemCnae1.click();

    // 2º CNAE (Secundário): 1091-1/02 (Padaria e confeitaria - Risco II)
    const cnaeResponse2 = page.waitForResponse(
      (resp) => resp.url().includes("/cnaes") && resp.status() === 200
    );
    await cnaeSearchInput.fill("1091");
    await cnaeResponse2;

    const itemCnae2 = page.locator("li").filter({ hasText: "1091-1/02" }).first();
    await expect(itemCnae2).toBeVisible();
    await itemCnae2.click();

    // Validação do cálculo reativo do risco sanitário preponderante: Risco III prepondera sobre Risco II
    const badgeRisco = page.locator("div").filter({ hasText: /Risco Estimado:/i }).first();
    await expect(badgeRisco).toContainText("Risco III");

    // Preenchimento Seção 4: Representante Legal
    await page.locator('input[name="representante_legal.nome_completo"]').fill("Dra. Beatriz Santos Alvarenga");
    await page.locator('input[name="representante_legal.cpf"]').fill(cpfRepValido);
    await page.locator('input[name="representante_legal.telefone"]').fill("(33) 98801-9988");
    await page.locator('input[name="representante_legal.email"]').fill(`beatriz.${ts}@labbraunas.com.br`);
    await page.locator('input[name="representante_legal.endereco_residencial"]').fill("Rua Diamantina, 45, Centro, Braúnas/MG");

    // Submissão do Formulário
    const submitResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/estabelecimentos") && resp.request().method() === "POST" && (resp.status() === 200 || resp.status() === 201)
    );

    await page.getByRole("button", { name: "Salvar Estabelecimento" }).click();
    const submitResp = await submitResponsePromise;
    expect(submitResp.status()).toBe(201);

    // Valida redirecionamento para detalhes do estabelecimento recém-criado
    await expect(page).toHaveURL(/\/estabelecimentos\/[0-9a-fA-F-]+/);
    await expect(page.getByText(razaoSocial).first()).toBeVisible();

    // Retorna para a listagem e valida reflexo na consulta
    await page.goto("/estabelecimentos");
    const buscaListagem = page.getByPlaceholder("Buscar por CNPJ/CPF, Razão Social ou Nome Fantasia...");
    const refetchSearchPromise = page.waitForResponse(
      (resp) => resp.url().includes("/estabelecimentos") && resp.url().includes(`busca=Lab+Bra%C3%BAnas+E2E+${ts}`) && resp.status() === 200
    );
    await buscaListagem.fill(`Lab Braúnas E2E ${ts}`);
    await refetchSearchPromise;

    await expect(page.getByText(razaoSocial).first()).toBeVisible();
  });
});
