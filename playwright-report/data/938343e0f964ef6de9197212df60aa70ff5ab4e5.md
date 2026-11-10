# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: 02_estabelecimentos.spec.ts >> Fluxo E2E 02 - Gestão de Estabelecimentos Regulados e CNAEs >> Listagem, busca com debounce e filtros de risco sanitário
- Location: e2e\02_estabelecimentos.spec.ts:17:3

# Error details

```
Test timeout of 30000ms exceeded while running "beforeEach" hook.
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
  1   | import { test, expect } from "@playwright/test";
  2   | 
  3   | test.describe("Fluxo E2E 02 - Gestão de Estabelecimentos Regulados e CNAEs", () => {
  4   |   test.beforeEach(async ({ page }) => {
  5   |     // Autenticação com Coordenador Seed
  6   |     await page.goto("/login");
  7   |     await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
  8   |     await page.getByLabel("Senha").fill("CoordVisa@2026");
> 9   |     const authPromise = page.waitForResponse(
      |                              ^ Error: page.waitForResponse: Test timeout of 30000ms exceeded.
  10  |       (resp) => resp.url().includes("/auth/login") && resp.status() === 200
  11  |     );
  12  |     await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  13  |     await authPromise;
  14  |     await expect(page).toHaveURL(/\/$/);
  15  |   });
  16  | 
  17  |   test("Listagem, busca com debounce e filtros de risco sanitário", async ({ page }) => {
  18  |     await page.goto("/estabelecimentos");
  19  |     await expect(page.getByRole("heading", { name: "Estabelecimentos Regulados" })).toBeVisible();
  20  | 
  21  |     // Aguarda carregar dados iniciais dos estabelecimentos seeded
  22  |     await page.waitForLoadState("networkidle");
  23  | 
  24  |     // 1. Testar busca com debounce por razão social
  25  |     const buscaInput = page.getByPlaceholder("Buscar por CNPJ/CPF, Razão Social ou Nome Fantasia...");
  26  |     await expect(buscaInput).toBeVisible();
  27  | 
  28  |     const searchResponsePromise = page.waitForResponse(
  29  |       (resp) => resp.url().includes("/estabelecimentos") && resp.url().includes("busca=Drogaria") && resp.status() === 200
  30  |     );
  31  |     await buscaInput.fill("Drogaria");
  32  |     await searchResponsePromise;
  33  | 
  34  |     // Confirma que a tabela exibe a Drogaria Braúnas
  35  |     await expect(page.getByText("Drogaria Braúnas Popular Ltda").first()).toBeVisible();
  36  | 
  37  |     // 2. Testar filtro de risco sanitário
  38  |     const riscoSelect = page.locator("select").filter({ hasText: /Todos os Níveis de Risco/i });
  39  |     const filterRiscoPromise = page.waitForResponse(
  40  |       (resp) => resp.url().includes("/estabelecimentos") && resp.url().includes("risco=Risco+III") && resp.status() === 200
  41  |     );
  42  |     await riscoSelect.selectOption("Risco III");
  43  |     await filterRiscoPromise;
  44  | 
  45  |     // O estabelecimento de Risco III deve ser exibido
  46  |     await expect(page.getByText(/Hospital|Drogaria/i).first()).toBeVisible();
  47  |   });
  48  | 
  49  |   test("Cadastro completo: inclusão de estabelecimento, CNAE principal/secundário, cálculo dinâmico de risco e reflexo na listagem", async ({
  50  |     page,
  51  |   }) => {
  52  |     await page.goto("/estabelecimentos/novo");
  53  |     await expect(page.getByRole("heading", { name: "Novo Estabelecimento Regulado" })).toBeVisible();
  54  | 
  55  |     // Gera CNPJ e CPF matematicamente válidos com sufixo dinâmico para garantir unicidade
  56  |     const ts = Math.floor(10000 + Math.random() * 90000);
  57  |     // Base de 12 dígitos com 8 dígitos raiz + filial 0001
  58  |     const baseCnpj = `900${ts}0001`;
  59  |     const b = baseCnpj.split("").map(Number);
  60  |     const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  61  |     const sum1 = b.reduce((acc, val, idx) => acc + val * w1[idx], 0);
  62  |     const rem1 = sum1 % 11;
  63  |     const d1 = rem1 < 2 ? 0 : 11 - rem1;
  64  |     b.push(d1);
  65  | 
  66  |     const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  67  |     const sum2 = b.reduce((acc, val, idx) => acc + val * w2[idx], 0);
  68  |     const rem2 = sum2 % 11;
  69  |     const d2 = rem2 < 2 ? 0 : 11 - rem2;
  70  |     b.push(d2);
  71  | 
  72  |     const cnpjStr = b.join("");
  73  |     const cnpjValido = `${cnpjStr.slice(0, 2)}.${cnpjStr.slice(2, 5)}.${cnpjStr.slice(5, 8)}/${cnpjStr.slice(8, 12)}-${cnpjStr.slice(12)}`;
  74  |     const cpfRepValido = "854.129.371-87";
  75  |     const razaoSocial = `Laboratório Clínico Braúnas E2E ${ts} Ltda`;
  76  |     const nomeFantasia = `Lab Braúnas E2E ${ts}`;
  77  | 
  78  |     // Preenchimento Seção 1: Identificação Cadastral (usando input[name=...])
  79  |     await page.locator('input[name="cnpj_cpf"]').fill(cnpjValido);
  80  |     await page.locator('input[name="razao_social"]').fill(razaoSocial);
  81  |     await page.locator('input[name="nome_fantasia"]').fill(nomeFantasia);
  82  |     await page.locator('input[name="inscricao_municipal"]').fill("102030");
  83  | 
  84  |     // Preenchimento Seção 2: Localização e Contatos
  85  |     await page.locator('input[name="logradouro"]').fill("Avenida Brasil");
  86  |     await page.locator('input[name="numero"]').fill("500");
  87  |     await page.locator('input[name="telefone_celular"]').fill("(33) 98888-7766");
  88  |     await page.locator('input[name="email"]').fill(`contato.${ts}@labbraunas.com.br`);
  89  | 
  90  |     // Preenchimento Seção 3: Atividades Econômicas (CNAEs)
  91  |     const cnaeSearchInput = page.getByPlaceholder("Digite o código (ex: 4771-7/01) ou descrição da atividade...");
  92  |     await expect(cnaeSearchInput).toBeVisible();
  93  | 
  94  |     // 1º CNAE (Principal): 8630-5/04 (Atividade odontológica - Risco III)
  95  |     const cnaeResponse1 = page.waitForResponse(
  96  |       (resp) => resp.url().includes("/cnaes") && resp.status() === 200
  97  |     );
  98  |     await cnaeSearchInput.fill("8630");
  99  |     await cnaeResponse1;
  100 | 
  101 |     // Clica no resultado retornado no dropdown
  102 |     const itemCnae1 = page.locator("li").filter({ hasText: "8630-5/04" }).first();
  103 |     await expect(itemCnae1).toBeVisible();
  104 |     await itemCnae1.click();
  105 | 
  106 |     // 2º CNAE (Secundário): 1091-1/02 (Padaria e confeitaria - Risco II)
  107 |     const cnaeResponse2 = page.waitForResponse(
  108 |       (resp) => resp.url().includes("/cnaes") && resp.status() === 200
  109 |     );
```