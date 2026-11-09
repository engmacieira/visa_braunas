import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 04 - Licenciamento, Emissão de Alvará e Validação Pública via QR Code", () => {
  test("Emissão de Alvará pela Coordenação e Consulta Pública em Contexto Anônimo", async ({
    page,
    browser,
  }) => {
    // 1. Login com perfil Coordenador VISA
    await page.goto("/login");
    await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("CoordVisa@2026");
    const authPromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 200
    );
    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await authPromise;
    await expect(page).toHaveURL(/\/$/);

    // 2. Acessar a fila de Licenciamento
    await page.goto("/licenciamento/requerimentos");
    await expect(page.getByRole("heading", { name: /Licenciamento Sanitário/i })).toBeVisible();

    // 3. Obter token gravado no localStorage
    const token = await page.evaluate(() => localStorage.getItem("vigiminas_token"));
    expect(token).toBeTruthy();

    // Obter um estabelecimento ativo para emissão direta de alvará ou tramite de requerimento
    const estabsResponse = await page.request.get("http://localhost:8000/api/v1/estabelecimentos?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const estabsJson = await estabsResponse.json();
    const estab = estabsJson.itens.find((e: any) => e.razao_social.includes("Drogaria") || e.razao_social.includes("Supermercado")) || estabsJson.itens[0];
    expect(estab).toBeTruthy();

    // Obtém o requerimento seeded para emissão de alvará sanitário
    const reqsResponse = await page.request.get("http://localhost:8000/api/v1/requerimentos?limit=10", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const reqsJson = await reqsResponse.json();
    const requerimentoSeeded = reqsJson.items[0];
    expect(requerimentoSeeded).toBeTruthy();

    // Emite o alvará sanitário oficial para o requerimento deferido via API autenticada
    const emitirAlvaraResp = await page.request.post("http://localhost:8000/api/v1/alvaras/emitir", {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        estabelecimento_id: requerimentoSeeded.estabelecimento_id,
        requerimento_id: requerimentoSeeded.id,
        validade_meses: 12,
        condicionantes_restricoes: "Cumprir rigorosamente as normas de vigilância sanitária municipal.",
      },
    });
    expect(emitirAlvaraResp.status()).toBe(201);
    const alvaraCriado = await emitirAlvaraResp.json();
    const codigoAutenticidade = alvaraCriado.codigo_autenticidade;
    expect(codigoAutenticidade).toBeTruthy();

    // 4. Validar o alvará também seeded como caso complementar (BRN2026A-2026)
    const codigoSeeded = "BRN2026A-2026";

    // 5. Contexto Anônimo / Limpo (sem tokens ou headers de autenticação)
    const incognitoContext = await browser.newContext();
    const publicPage = await incognitoContext.newPage();

    // Acessa a rota pública de validação com o código gerado
    await publicPage.goto(`/validar-alvara/${codigoAutenticidade}`);

    // Valida que não houve redirecionamento para o login
    await expect(publicPage).toHaveURL(new RegExp(`/validar-alvara/${codigoAutenticidade}`));

    // Valida exibição dos elementos de fé pública
    await expect(publicPage.getByRole("heading", { name: "ALVARÁ SANITÁRIO VÁLIDO" })).toBeVisible();
    await expect(publicPage.getByText(codigoAutenticidade)).toBeVisible();
    await expect(publicPage.getByText("Documento Autêntico e Regular")).toBeVisible();

    // Testa também o código de autenticidade seeded na busca da tela pública
    await publicPage.goto(`/validar-alvara/${codigoSeeded}`);
    await expect(publicPage.getByRole("heading", { name: "ALVARÁ SANITÁRIO VÁLIDO" })).toBeVisible();
    await expect(publicPage.getByText(codigoSeeded)).toBeVisible();

    await incognitoContext.close();
  });
});
