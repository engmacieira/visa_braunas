# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 01_auth_fluxo.spec.ts >> Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC >> Cenário de sucesso: login com coordenador seeded, gravação de token e badge no layout
- Location: e2e\01_auth_fluxo.spec.ts:32:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForResponse: Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - generic [ref=e4]:
    - heading "VigiMinas" [level=1] [ref=e8]
    - paragraph [ref=e9]: Secretaria Municipal de Saúde · Braúnas/MG
  - generic [ref=e10]:
    - generic [ref=e11]:
      - heading "Acesso do Servidor" [level=2] [ref=e12]
      - paragraph [ref=e13]: Entre com suas credenciais funcionais para acessar os serviços de fiscalização.
    - generic [ref=e14]: E-mail ou senha incorretos.
    - generic [ref=e18]:
      - generic [ref=e19]:
        - generic [ref=e20]: E-mail Institucional
        - textbox "E-mail Institucional" [ref=e22]:
          - /placeholder: servidor@braunas.mg.gov.br
          - text: coordenador.visa@braunas.mg.gov.br
      - generic [ref=e23]:
        - generic [ref=e24]: Senha
        - textbox "Senha" [ref=e26]:
          - /placeholder: ••••••••••••
          - text: CoordVisa@2026
      - button "Entrar no Sistema" [ref=e27]
    - generic [ref=e29]:
      - generic [ref=e30]: "Acesso Rápido (Contas de Teste - Braúnas):"
      - generic [ref=e35]:
        - button "Admin Master admin@braunas.mg.gov.br" [ref=e36]:
          - generic [ref=e37]: Admin Master
          - generic [ref=e38]: admin@braunas.mg.gov.br
        - button "Coordenador coordenador.visa@..." [ref=e39]:
          - generic [ref=e40]: Coordenador
          - generic [ref=e41]: coordenador.visa@...
        - button "Fiscal Sanitário fiscal1.visa@..." [ref=e42]:
          - generic [ref=e43]: Fiscal Sanitário
          - generic [ref=e44]: fiscal1.visa@...
        - button "Digitador digitador.visa@..." [ref=e45]:
          - generic [ref=e46]: Digitador
          - generic [ref=e47]: digitador.visa@...
  - generic [ref=e48]:
    - paragraph [ref=e49]: Coordenação de Vigilância Sanitária · Versão 2.0.0
    - paragraph [ref=e50]: Acesso restrito a servidores autorizados da Vigilância Sanitária Municipal.
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | test.describe("Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC", () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     await page.goto("/login");
  6  |   });
  7  | 
  8  |   test("Cenário de erro: login com credenciais inválidas exibe mensagem amigável sem crash da aplicação", async ({
  9  |     page,
  10 |   }) => {
  11 |     await expect(page.getByRole("heading", { name: "Acesso do Servidor" })).toBeVisible();
  12 | 
  13 |     await page.getByLabel("E-mail Institucional").fill("invalido@braunas.mg.gov.br");
  14 |     await page.getByLabel("Senha").fill("SenhaErrada@123");
  15 | 
  16 |     const responsePromise = page.waitForResponse(
  17 |       (resp) => resp.url().includes("/auth/login") && resp.status() === 401
  18 |     );
  19 | 
  20 |     await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  21 |     await responsePromise;
  22 | 
  23 |     // Mensagem de erro renderizada
  24 |     const errorAlert = page.locator("div").filter({ hasText: /Credenciais inválidas|E-mail ou senha incorretos/i }).first();
  25 |     await expect(errorAlert).toBeVisible();
  26 | 
  27 |     // Aplicação não crashou: campos e título continuam visíveis
  28 |     await expect(page.getByLabel("E-mail Institucional")).toBeVisible();
  29 |     await expect(page.getByRole("button", { name: "Entrar no Sistema" })).toBeVisible();
  30 |   });
  31 | 
  32 |   test("Cenário de sucesso: login com coordenador seeded, gravação de token e badge no layout", async ({
  33 |     page,
  34 |   }) => {
  35 |     await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
  36 |     await page.getByLabel("Senha").fill("CoordVisa@2026");
  37 | 
> 38 |     const authResponsePromise = page.waitForResponse(
     |                                      ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  39 |       (resp) => resp.url().includes("/auth/login") && resp.status() === 200
  40 |     );
  41 | 
  42 |     await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  43 |     await authResponsePromise;
  44 | 
  45 |     // Aguarda navegação para o dashboard
  46 |     await expect(page).toHaveURL(/\/$/);
  47 | 
  48 |     // Valida token JWT gravado no localStorage
  49 |     const token = await page.evaluate(() => localStorage.getItem("vigiminas_token"));
  50 |     expect(token).toBeTruthy();
  51 |     expect(typeof token).toBe("string");
  52 | 
  53 |     // Validação de dados do usuário e badge no Header
  54 |     const headerElement = page.getByRole("banner");
  55 |     await expect(headerElement.getByText("Carlos Eduardo de Paula")).toBeVisible();
  56 |     await expect(headerElement.getByText("Coordenador VISA")).toBeVisible();
  57 |   });
  58 | 
  59 |   test("Logout: encerramento de sessão, limpeza do token e proteção de rotas", async ({
  60 |     page,
  61 |   }) => {
  62 |     // Realiza login primeiro
  63 |     await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
  64 |     await page.getByLabel("Senha").fill("CoordVisa@2026");
  65 | 
  66 |     const authResponsePromise = page.waitForResponse(
  67 |       (resp) => resp.url().includes("/auth/login") && resp.status() === 200
  68 |     );
  69 |     await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  70 |     await authResponsePromise;
  71 | 
  72 |     await expect(page).toHaveURL(/\/$/);
  73 | 
  74 |     // Clica no botão de logout no header (botão Sair com title Encerrar Sessão)
  75 |     const logoutBtn = page.getByRole("button", { name: /Sair|Encerrar Sessão/i });
  76 |     await expect(logoutBtn).toBeVisible();
  77 |     await logoutBtn.click();
  78 | 
  79 |     // Redirecionamento para /login
  80 |     await expect(page).toHaveURL(/\/login/);
  81 | 
  82 |     // Valida remoção do token no localStorage
  83 |     const token = await page.evaluate(() => localStorage.getItem("vigiminas_token"));
  84 |     expect(token).toBeNull();
  85 | 
  86 |     // Tenta acessar rota protegida diretamente
  87 |     await page.goto("/estabelecimentos");
  88 |     await expect(page).toHaveURL(/\/login/);
  89 |   });
  90 | });
  91 | 
```