import { test, expect } from "@playwright/test";

test.describe("Fluxo E2E 03 - Fiscalização Sanitária, VAPT (Indicador 11) e Emissão de Laudo", () => {
  test.beforeEach(async ({ page }) => {
    // Autenticação com Coordenador / Fiscal seeded
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

  test("Jornada Completa: Agendamento VAPT, preenchimento do checklist dinâmico, lavratura de laudo e conclusão", async ({
    page,
  }) => {
    // 1. Navegar para a listagem de inspeções
    await page.goto("/inspecoes");
    await expect(page.getByRole("heading", { name: /Inspeções Sanitárias/i })).toBeVisible();

    // 2. Abrir Modal de Agendamento de Nova Ação Fiscalizatória
    const btnNovaInspecao = page.getByRole("button", { name: /Nova Ação|Nova Inspeção/i });
    await expect(btnNovaInspecao).toBeVisible();
    await btnNovaInspecao.click();

    // Valida abertura do Modal
    await expect(page.getByRole("heading", { name: "Nova Ação Fiscalizatória / Vistoria" })).toBeVisible();

    // Selecionar Motivo VAPT - Indicador 11
    await page.locator('select[name="motivo"]').selectOption("vapt_trabalhador");

    // Selecionar estabelecimento seeded
    const selectEstab = page.locator('select[name="estabelecimento_id"]');
    await selectEstab.waitFor();
    const options = await selectEstab.locator("option").all();
    expect(options.length).toBeGreaterThan(1);
    await selectEstab.selectOption({ index: 1 });

    // Preencher campos obrigatórios de VAPT (Indicador 11)
    await page.locator('input[name="nome_local_trabalho"]').fill("Setor de Envase e Depósito de Medicamentos");
    await page.locator('textarea[name="principais_riscos_identificados"]').fill("Riscos químicos, biológicos e postura ergonômica inadequada");
    await page.locator('textarea[name="recomendacoes_orientacoes"]').fill("Uso contínuo de luvas nitrílicas, máscaras PFF2 e pausas ergonômicas");

    // Submissão do agendamento
    const agendarResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes("/inspecoes") && resp.request().method() === "POST" && resp.status() === 201
    );

    await page.getByRole("button", { name: /Abrir \/ Agendar Termo/i }).click();
    const agendarResp = await agendarResponsePromise;
    const inspecaoCriada = await agendarResp.json();
    expect(inspecaoCriada.id).toBeTruthy();

    // 3. Acessar o Laudo da inspeção criada
    await page.goto(`/inspecoes/${inspecaoCriada.id}/laudo`);
    await expect(page.getByRole("heading", { name: /Termo Fiscal de Inspeção Sanitária/i })).toBeVisible();

    // Valida banner VAPT presente na tela do laudo
    await expect(page.getByText(/Vigilância em Ambientes e Processos de Trabalho/i)).toBeVisible();
    await expect(page.getByText("Setor de Envase e Depósito de Medicamentos")).toBeVisible();

    // 4. Preenchimento do Checklist Dinâmico: marcar primeiros itens como "C" (Conforme)
    const botoesC = page.locator('button:has-text("C")');
    const totalBotoesC = await botoesC.count();
    expect(totalBotoesC).toBeGreaterThan(0);
    // Clica nos primeiros 3 itens do checklist para torná-los Conformes
    for (let i = 0; i < Math.min(3, totalBotoesC); i++) {
      await botoesC.nth(i).click();
    }

    // 5. Preencher campos obrigatórios do Laudo
    await page.locator('textarea[name="relato_vistoria"]').fill(
      "Realizada vistoria detalhada nas dependências do estabelecimento. Constatado cumprimento satisfatório das normas sanitárias vigentes e adequação das rotinas aos manuais de boas práticas."
    );

    await page.locator('input[name="nome_pessoa_acompanhou"]').fill("Carlos Silva Gerente Responsável");
    await page.locator('input[name="cpf_pessoa_acompanhou"]').fill("111.222.333-44");

    // Selecionar parecer conclusivo: Aprovado (Sem Exigências)
    await page.locator('select[name="resultado"]').selectOption("aprovado");

    // Submissão para concluir inspeção (PATCH no backend)
    const concluirResponsePromise = page.waitForResponse(
      (resp) => resp.url().includes(`/inspecoes/${inspecaoCriada.id}/concluir`) && resp.status() === 200
    );

    await page.getByRole("button", { name: /Salvar & Concluir Laudo Sanitário/i }).click();
    await concluirResponsePromise;

    // Confirma banner/estado de laudo concluído na UI
    await expect(page.getByText(/Laudo Sanitário Emitido e Concluído/i)).toBeVisible();
    await expect(page.getByText("Concluída").first()).toBeVisible();
    await expect(page.getByText("Aprovado", { exact: true }).first()).toBeVisible();
  });
});
