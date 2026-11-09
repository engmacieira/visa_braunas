import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("Cenário de erro: login com credenciais inválidas exibe mensagem amigável sem crash da aplicação", async ({
    page,
  }) => {
    await expect(page.getByRole("heading", { name: "Acesso do Servidor" })).toBeVisible();

    await page.getByLabel("E-mail Institucional").fill("invalido@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("SenhaErrada@123");

    const responsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 401
    );

    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await responsePromise;

    // Mensagem de erro renderizada
    const errorAlert = page.locator("div").filter({ hasText: /Credenciais inválidas|E-mail ou senha incorretos/i }).first();
    await expect(errorAlert).toBeVisible();

    // Aplicação não crashou: campos e título continuam visíveis
    await expect(page.getByLabel("E-mail Institucional")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar no Sistema" })).toBeVisible();
  });

  test("Cenário de sucesso: login com coordenador seeded, gravação de token e badge no layout", async ({
    page,
  }) => {
    await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("CoordVisa@2026");

    const authResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 200
    );

    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await authResponsePromise;

    // Aguarda navegação para o dashboard
    await expect(page).toHaveURL(/\/$/);

    // Valida token JWT gravado no localStorage
    const token = await page.evaluate(() => localStorage.getItem("vigiminas_token"));
    expect(token).toBeTruthy();
    expect(typeof token).toBe("string");

    // Validação de dados do usuário e badge no Header
    const headerElement = page.getByRole("banner");
    await expect(headerElement.getByText("Carlos Eduardo de Paula")).toBeVisible();
    await expect(headerElement.getByText("Coordenador VISA")).toBeVisible();
  });

  test("Logout: encerramento de sessão, limpeza do token e proteção de rotas", async ({
    page,
  }) => {
    // Realiza login primeiro
    await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("CoordVisa@2026");

    const authResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 200
    );
    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await authResponsePromise;

    await expect(page).toHaveURL(/\/$/);

    // Clica no botão de logout no header (botão Sair com title Encerrar Sessão)
    const logoutBtn = page.getByRole("button", { name: /Sair|Encerrar Sessão/i });
    await expect(logoutBtn).toBeVisible();
    await logoutBtn.click();

    // Redirecionamento para /login
    await expect(page).toHaveURL(/\/login/);

    // Valida remoção do token no localStorage
    const token = await page.evaluate(() => localStorage.getItem("vigiminas_token"));
    expect(token).toBeNull();

    // Tenta acessar rota protegida diretamente
    await page.goto("/estabelecimentos");
    await expect(page).toHaveURL(/\/login/);
  });
});
