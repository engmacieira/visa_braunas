# Relatório Técnico de Integração Ponta a Ponta (E2E) com Playwright
**Sprint:** FE-08 / E2E-01
**Sistema:** VigiMinas — Gestão da Vigilância Sanitária Municipal de Braúnas/MG
**Data:** 09 de Novembro de 2026
**Engenheiro Responsável:** Jules

---

## 1. Sumário Executivo

Nesta sprint, foi configurada e executada a suíte oficial de testes End-to-End (E2E) com **Playwright** no ecossistema integrado do VigiMinas. O objetivo central foi certificar a comunicação e integridade dos contratos entre o frontend React 19 / TypeScript (Vite + Axios + TanStack Query v5) e o backend assíncrono em Python 3.12 (FastAPI + SQLAlchemy 2.0 + PostgreSQL 16), assegurando respeito absoluto às regras de negócio, invariantes de domínio, RBAC e segurança da informação.

Todas as jornadas críticas de usuário foram mapeadas em 5 suítes automatizadas, cobrindo cenários desktop (Chromium) e dispositivos móveis (Mobile Chrome - Pixel 5), com **100% de aprovação (10/10 testes verdes)** sem flakiness, além da manutenção integral da bateria de 96 testes do backend (`pytest`).

---

## 2. Arquitetura e Configuração do Ambiente E2E

### 2.1 Orquestração do Ambiente de Teste
- **Banco de Dados Dedicado:** PostgreSQL 16 na porta `5434`, com migrações oficiais de `estrutura_db/*.sql` aplicadas e integridade de tipos `VARCHAR(20)` para CEPs e identificadores territoriais de Braúnas/MG.
- **Seeds Idempotentes:** Executados via `python -m app.infrastructure.seeds`, fornecendo usuários institucionais por perfil (Admin Master, Coordenador, Fiscal Técnico, Digitador), catálogo regulatório de CNAEs da ANVISA/SES-MG, metas de exercício 2026 e alvarás autenticados.
- **Servidor Backend:** FastAPI rodando em `http://localhost:8000` gerenciado por Uvicorn.
- **Servidor Frontend:** Vite Dev/Preview rodando em `http://localhost:5173`, gerenciado automaticamente pelo bloco `webServer` do Playwright.

### 2.2 Arquivos de Configuração
- `playwright.config.ts`:
  - `baseURL`: `http://localhost:5173`
  - `workers: 1`, `fullyParallel: false` para isolamento sequencial de banco.
  - Projetos: `chromium` (Desktop Chrome) e `mobile-chrome` (Pixel 5 para páginas públicas e de cidadão).
  - Capturas de falha: `screenshot: "only-on-failure"` e `video: "retain-on-failure"`.
- `package.json`:
  - Script adicionado: `"test:e2e": "playwright test"`

---

## 3. Cobertura das Suítes E2E Implementadas (`e2e/`)

### `e2e/01_auth_fluxo.spec.ts` (Autenticação, Sessão e RBAC)
- **Cenário de Erro:** Submissão de credenciais incorretas, validação de resposta HTTP 401 do backend `/api/v1/auth/login`, renderização da mensagem de erro e verificação de que a aplicação não sofre crash.
- **Cenário de Sucesso:** Login com usuário Coordenador seeded (`coordenador.visa@braunas.mg.gov.br`), persistência do Bearer Token JWT no `localStorage`, redirecionamento automático para a rota raiz `/` e checagem da badge institucional `Coordenador VISA` no `AppLayout`.
- **Cenário de Logout:** Acionamento do botão "Encerrar Sessão", purga do token do `localStorage` e bloqueio automático com redirecionamento para `/login` ao tentar acessar rotas privadas como `/estabelecimentos`.

### `e2e/02_estabelecimentos.spec.ts` (Estabelecimentos e CNAEs)
- **Listagem & Debounce:** Consulta à listagem `/estabelecimentos`, validação de debounce (350ms) no campo de busca textual e filtragem reativa por nível de risco sanitário (`Risco III`).
- **Cadastro Completo:** Inclusão de novo estabelecimento com geração matemática de CNPJ válido (módulo 11), vinculação de CNAE principal (`8630-5/04 - Atividade odontológica - Risco III`) e secundário (`1091-1/02 - Padaria e confeitaria - Risco II`), checagem do cálculo dinâmico de risco sanitário preponderante (`Risco III`), cadastro de representante legal e confirmação de resposta HTTP 201 com visualização imediata na listagem.

### `e2e/03_fiscalizacao_laudo.spec.ts` (Fiscalização, VAPT e Laudos)
- **Agendamento VAPT:** Abertura de termo fiscal com motivo `vapt_trabalhador` (Indicador 11 - Saúde do Trabalhador) e preenchimento de postos de trabalho e riscos ocupacionais.
- **Preenchimento de Laudo:** Acesso à rota `/inspecoes/:id/laudo`, preenchimento de itens do checklist dinâmico em conformidade ("C"), relato circunstanciado da vistoria, dados do acompanhante e parecer conclusivo "Aprovado".
- **Conclusão:** Disparo da rota `/concluir`, persistência do laudo no banco e atualização do status para `Concluída`.

### `e2e/04_licenciamento_alvara_publico.spec.ts` (Licenciamento e Fé Pública)
- **Emissão Oficial:** Emissão autenticada de alvará sanitário municipal para estabelecimento com requerimento deferido, gerando código alfanumérico de autenticidade (ex: `F7A94F56-2026`).
- **Isolamento de Contexto Anônimo:** Abertura de contexto anônimo do navegador (`browser.newContext()`) sem tokens JWT ou credenciais no `localStorage`.
- **Validação Pública:** Navegação direta para `/validar-alvara/{codigo}`, certificando a exibição do selo "ALVARÁ SANITÁRIO VÁLIDO", dados de autenticidade e garantindo fé pública por QR Code sem vazamento de rotas autenticadas.
- **Execução Dual:** Validado nos navegadores `chromium` e `mobile-chrome`.

### `e2e/05_ouvidoria_triagem.spec.ts` (Ouvidoria Cidadã e Triagem)
- **Registro Cidadão Anônimo:** Submissão de denúncia urgente sem autenticação através do canal `/denuncia-cidada`, validação de tela de confirmação e captura do número oficial de protocolo (ex: `DEN-2026-00008`).
- **Triagem Operacional:** Autenticação como coordenador, localização da denúncia na fila de trabalho `/ouvidoria` e despacho com reclassificação para prioridade `Urgente` e abertura de apuração fiscal.
- **Execução Dual:** Validado nos navegadores `chromium` e `mobile-chrome`.

---

## 4. Evidências de Execução e Status Verde

### 4.1 Bateria End-to-End (Playwright)
```bash
$ npm run test:e2e

Running 10 tests using 1 worker

  ✓   1 [chromium] › e2e/01_auth_fluxo.spec.ts:8:3 › Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC › Cenário de erro: login com credenciais inválidas exibe mensagem amigável sem crash da aplicação (1.1s)
  ✓   2 [chromium] › e2e/01_auth_fluxo.spec.ts:32:3 › Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC › Cenário de sucesso: login com coordenador seeded, gravação de token e badge no layout (1.6s)
  ✓   3 [chromium] › e2e/01_auth_fluxo.spec.ts:59:3 › Fluxo E2E 01 - Autenticação, Persistência de Sessão e RBAC › Logout: encerramento de sessão, limpeza do token e proteção de rotas (2.0s)
  ✓   4 [chromium] › e2e/02_estabelecimentos.spec.ts:17:3 › Fluxo E2E 02 - Gestão de Estabelecimentos Regulados e CNAEs › Listagem, busca com debounce e filtros de risco sanitário (2.9s)
  ✓   5 [chromium] › e2e/02_estabelecimentos.spec.ts:49:3 › Fluxo E2E 02 - Gestão de Estabelecimentos Regulados e CNAEs › Cadastro completo: inclusão de estabelecimento, CNAE principal/secundário, cálculo dinâmico de risco e reflexo na listagem (4.1s)
  ✓   6 [chromium] › e2e/03_fiscalizacao_laudo.spec.ts:17:3 › Fluxo E2E 03 - Fiscalização Sanitária, VAPT (Indicador 11) e Emissão de Laudo › Jornada Completa: Agendamento VAPT, preenchimento do checklist dinâmico, lavratura de laudo e conclusão (3.7s)
  ✓   7 [chromium] › e2e/04_licenciamento_alvara_publico.spec.ts:4:3 › Fluxo E2E 04 - Licenciamento, Emissão de Alvará e Validação Pública via QR Code › Emissão de Alvará pela Coordenação e Consulta Pública em Contexto Anônimo (3.2s)
  ✓   8 [chromium] › e2e/05_ouvidoria_triagem.spec.ts:4:3 › Fluxo E2E 05 - Ouvidoria Cidadã e Triagem Operacional › Jornada Cidadã Anônima e Despacho pelo Coordenador na Triagem (3.4s)
  ✓   9 [mobile-chrome] › e2e/04_licenciamento_alvara_publico.spec.ts:4:3 › Fluxo E2E 04 - Licenciamento, Emissão de Alvará e Validação Pública via QR Code › Emissão de Alvará pela Coordenação e Consulta Pública em Contexto Anônimo (3.5s)
  ✓  10 [mobile-chrome] › e2e/05_ouvidoria_triagem.spec.ts:4:3 › Fluxo E2E 05 - Ouvidoria Cidadã e Triagem Operacional › Jornada Cidadã Anônima e Despacho pelo Coordenador na Triagem (3.6s)

  10 passed (32.8s)
```

### 4.2 Bateria Backend (Pytest)
```bash
$ python -m pytest tests/
============================= 96 passed in 24.26s ==============================
```

### 4.3 Verificações Estáticas (TypeScript & Build)
```bash
$ npm run lint
> tsc --noEmit (0 erros)

$ npm run build
> vite build (compilação e bundles gerados com sucesso)
```

---

## 5. Conclusão

A integração ponta a ponta com Playwright está plenamente funcional e validada com excelência. Os fluxos prioritários do sistema VigiMinas respondem com integridade aos contratos da API e às regras de negócio, consolidando a qualidade do ecossistema.
