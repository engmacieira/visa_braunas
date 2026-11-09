import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 05 - Ouvidoria Cidadã e Triagem Operacional", () => {
  test("Jornada Cidadã Anônima e Despacho pelo Coordenador na Triagem", async ({
    page,
    browser,
  }) => {
    // 1. Registro Cidadão em Contexto Anônimo / Deslogado
    const incognitoContext = await browser.newContext();
    const publicPage = await incognitoContext.newPage();

    await publicPage.goto("/denuncia-cidada");
    await expect(publicPage.getByRole("heading", { name: "Relatar Irregularidade Sanitária" })).toBeVisible();

    const ts = Date.now().toString().slice(-4);
    const localDenunciado = `Supermercado Minas Mais - Balcão ${ts}`;
    const relato = `Comercialização de laticínios fora da refrigeração com forte odor e presença de moscas no setor de frios ${ts}.`;

    // Preenche os dados da denúncia anônima
    await publicPage.locator('input[name="local_denunciado_identificacao"]').fill(localDenunciado);
    await publicPage.locator('input[name="bairro"]').fill("Centro");
    await publicPage.locator('input[name="logradouro"]').fill("Avenida JK, 300");
    await publicPage.locator('textarea[name="relato_denuncia"]').fill(relato);

    // Submete a denúncia pública
    const registrarResponsePromise = publicPage.waitForResponse(
      (resp) => resp.url().includes("/denuncias") && resp.request().method() === "POST" && resp.status() === 201
    );

    await publicPage.getByRole("button", { name: /Enviar Denúncia Sanitária/i }).click();
    const regResp = await registrarResponsePromise;
    const denunciaRegistrada = await regResp.json();
    const numeroProtocolo = denunciaRegistrada.numero_protocolo;
    expect(numeroProtocolo).toBeTruthy();

    // Valida mensagem de sucesso e exibição do protocolo para o cidadão
    await expect(publicPage.getByText(/Manifestação Registrada com Sucesso/i)).toBeVisible();
    await expect(publicPage.getByText(numeroProtocolo)).toBeVisible();
    await incognitoContext.close();

    // 2. Triagem Operacional pelo Coordenador VISA
    await page.goto("/login");
    await page.getByLabel("E-mail Institucional").fill("coordenador.visa@braunas.mg.gov.br");
    await page.getByLabel("Senha").fill("CoordVisa@2026");
    const authPromise = page.waitForResponse(
      (resp) => resp.url().includes("/auth/login") && resp.status() === 200
    );
    await page.getByRole("button", { name: "Entrar no Sistema" }).click();
    await authPromise;
    await expect(page).toHaveURL(/\/$/);

    // Navega para a fila de ouvidoria
    await page.goto("/ouvidoria");
    await expect(page.getByRole("heading", { name: /Gestão de Denúncias Sanitárias/i })).toBeVisible();

    // Localiza a denúncia pelo protocolo na tabela de triagem
    const buscaInput = page.getByPlaceholder(/Buscar por protocolo/i);
    await buscaInput.fill(numeroProtocolo);

    // Clica no botão "Triar / Detalhes" correspondente à denúncia
    const linkDetalhes = page.getByRole("link", { name: /Triar \/ Detalhes/i }).first();
    await expect(linkDetalhes).toBeVisible();
    await linkDetalhes.click();

    // Valida página de detalhe da denúncia
    await expect(page.getByRole("heading", { name: new RegExp(numeroProtocolo) })).toBeVisible();
    await expect(page.getByText(localDenunciado)).toBeVisible();

    // 3. Despachar a denúncia para fiscalização sanitária
    const btnDespachar = page.getByRole("button", { name: /Despachar para Fiscalização/i });
    await expect(btnDespachar).toBeVisible();
    await btnDespachar.click();

    // Modal de despacho
    await expect(page.getByRole("heading", { name: /Despacho e Encaminhamento Fiscal/i })).toBeVisible();

    // Reclassifica para Urgente e preenche determinação da coordenação
    await page.locator('select[name="nova_gravidade"]').selectOption("urgente");
    await page.locator('textarea[name="despacho_coordenacao"]').fill(
      "Determino vistoria sanitária imediata no setor de frios para inspeção de temperatura, validade e apreensão de produtos impróprios."
    );

    // Marca toggle de iniciar apuração fiscal
    const toggleApuracao = page.locator('input[name="iniciar_apuracao"]');
    if (!(await toggleApuracao.isChecked())) {
      await toggleApuracao.check();
    }

    const despachoResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/denuncias/${denunciaRegistrada.id}/despacho`) && resp.status() === 200
    );

    await page.getByRole("button", { name: /Confirmar Despacho/i }).click();
    await despachoResponsePromise;

    // Confirma atualização na tela: badge Urgente e status Em Apuração Fiscal
    await expect(page.getByText("Urgente").first()).toBeVisible();
    await expect(page.getByText(/Em Apuração Fiscal/i).first()).toBeVisible();
  });
});
