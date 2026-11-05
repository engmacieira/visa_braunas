# 🚀 Manual Mestre e Diretrizes de Engenharia: LicitaDocs

Bem-vindo ao manual consolidado do projeto! Este documento une o setup do ambiente, comandos essenciais do sistema e as diretrizes oficiais de desenvolvimento do Mark Construtor v2.2.

---

## 1. 🧬 A Nossa Cultura (Mark & Matheus)

### A Persona e a Missão

* **O Time:** Mark (Desenvolvedor Sênior/Tech Lead) e Matheus (Desenvolvedor Trainee).
* **Tom de Voz:** Técnico, paciente, didático e focado na qualidade a longo prazo.
* **Filosofia:** "Código é lido muito mais vezes do que é escrito". A prioridade absoluta é a clareza, a manutenibilidade e a consistência.
* **A Missão:** Gerenciar o ciclo de vida completo do software, garantindo a saúde do código, a continuidade fluida entre as sessões e a prontidão constante para a produção.

### O Protocolo de Continuidade (Contexto Infinito)

* **Ao Iniciar (Reconhecimento):** Analisar a estrutura existente nas pastas (`app/models`, `frontend/src`), ler os mapas de contexto (`Por_Onde_Comecar.md` e Logs) e respeitar estritamente a nomenclatura atual sem refatorações puramente estéticas.
* **Ao Finalizar (Passagem de Bastão):** Atualizar os logs utilizando os templates oficiais, registrar as pendências no `DividasTecnicas.md` e preparar o `Por_Onde_Comecar.md` para a próxima sessão de código.

---

## 2. 🏛️ Padrões Técnicos e Arquitetura (Obrigatórios)

### Backend (Python + FastAPI + SQLAlchemy + Alembic)

* **Arquitetura MVC/Repository:** Separação estrita e inegociável de responsabilidades: `routers` -> `services` (opcional) -> `repositories` -> `models`.
* **Banco de Dados Híbrido:** Desenvolvimento com SQLite e Produção com PostgreSQL. O código não deve conter queries exclusivas do SQLite.
* **Migrations (Alembic):** É obrigatório o uso de migrations. Modelos jamais devem ser alterados sem a respectiva geração do Alembic.
* **Soft Delete:** Obrigatoriedade de inativação lógica. Os dados nunca devem ser deletados fisicamente do banco de dados.
* **Tratamento de Erros:** O uso de blocos `try/except` robustos na camada de repositórios é mandatório.

### Frontend (React + TypeScript + Vite)

* **Stack Principal:** React, TypeScript, Vite e TailwindCSS.
* **Tipagem Estrita:** Uso de `any` é proibido. Toda a aplicação deve operar com `interfaces` e `types` bem definidos.
* **Componentização:** As interfaces devem ser fracionadas em componentes isolados e reutilizáveis (ex: `components/ui`, `components/layout`).

### Padrões de Documentação (A "Memória" do Código)

* **Documentação Backend:** Docstrings são obrigatórias em todas as classes, rotas e funções de repositório/serviço, descrevendo o propósito geral, os parâmetros de entrada (`Args`) e o retorno (`Returns`).
* **Documentação Frontend:** Componentes com lógicas complexas e Hooks personalizados devem conter comentários JSDoc/TSDoc documentando suas propriedades e fluxo.
* **Comentários de Decisão:** O código não deve conter comentários que narrem o óbvio. Comente apenas para justificar o **porquê** de uma decisão de negócio ou o motivo por trás de um bloco lógico de alta complexidade.
* **Arquivos de Gestão:** A pasta `docs/` é a alma da gestão. Os arquivos `USER_STORIES.md` (escopo), `DividasTecnicas.md` (débitos) e `Por_Onde_Comecar.md` (setup) devem estar sempre vivos.

---

## 3. ⚙️ Setup e Configuração Local

### Configuração do Backend (Python/FastAPI)

1. **Ambiente Virtual:** `python -m venv .venv`.

   * Ativar no Windows: `.venv\Scripts\activate`.
   * Para desativar: `deactivate`.

2. **Dependências:** `pip install -r requirements.txt`.
3. **Banco de Dados (Alembic):** `alembic init alembic` (Se for a primeira vez).

   * Gerar nova migração: `alembic revision --autogenerate -m "Initial migration"`.
   * Aplicar migração no banco: `alembic upgrade head`.

4. **Rodar o Servidor:** `uvicorn app.main:app --reload`.
5. **Rodar testes Backend:** `python -m pytest`
6. **Rodar testes Backend Coverage:** `python -m pytest --cov=app`
7. **Salvar logs de teste em texto** `pytest > txt/log_pytest.txt 2>&1`
8. **Construir o Backend:** `python setup.py sdist`
9. **Acessar o Backend:** `http://localhost:8000`
10. **Exportar bibliotecas Python atuais:** `pip freeze > requirements.txt`
11. **A "Pegadinha" do Interpretador no VS Code:** Se a IDE apresentar erros em pacotes Python nativos, aperte Ctrl+Shift+P, procure por "Python: Select Interpreter" e selecione o caminho da sua .venv.

### Configuração do Frontend (React + TS + Vite)

1. **Inicializar o Vite (se a pasta estiver vazia):** `cd frontend` seguido de `npm create vite@latest . -- --template react-ts`.
2. **Instalar Dependências:** `npm install`
3. **Rodar o Frontend:** `npm run dev`
4. **Rodar testes Frontend:** `npm run test`
5. **Rodar testes Frontend Coverage:** `npm run test -- --coverage`
6. **Construir o Frontend:** `npm run build`
7. **Acessar o Frontend:** `http://localhost:5173`
8. **Adicionar caminhos no Path do Powershell:** `$env:Path += ";E:\projetos\node"`
9. **Prevenir estouro de RAM no Vite (Build de Prod):** `$env:NODE_OPTIONS="--max-old-space-size=512"; npx tsc -b; npx vite build`

---

## 4. 🔄 Metodologia, Git Flow e Commits

### Metodologia Ágil e Templates

1. **Sprint 0/Setup:** Utilize o script `setup.py` para construir a arquitetura.
2. **Planejamento:** Gere o `docs/SPRINT_XX_BACKLOG.md` utilizando os templates de base.
3. **Execução:** O desenvolvimento ocorre funcionalidade por funcionalidade, baseado nas User Stories aprovadas.
4. **Encerramento:** Gere o `docs/SPRINT_XX_CONCLUSAO.md` utilizando os templates de encerramento de ciclo.
5. **Uso de Templates:** Todo novo documento deve sempre derivar dos arquivos matriz (ex: `template_user_stories.md`).

### O Git Flow (Regras de Branch e Versionamento)

O nosso fluxo exige a separação de código em branches para proteger o desenvolvimento (`develop`) e a produção (`main`).

**Prefixos de Nomenclatura (Tags):**

* **`feature/`**: Para criar uma nova funcionalidade ou tela (Ex: `feature/auth-google`).
* **`fix/`**: Para corrigir um bug localizado em ambiente de desenvolvimento.
* **`hotfix/`**: Para resolver rapidamente um erro crítico diretamente na produção.
* **`chore/`**: Para manutenções, ajustes de configuração ou atualizações de pacotes.
* **`docs/`**: Para criação ou atualização de documentação interna.

**O Ciclo de Vida da Branch:**

1. **Atualizar a base:** Retorne para a raiz com `git checkout develop` e baixe as atualizações com `git pull origin develop`.
2. **Criar a tarefa:** Crie e acesse a nova branch com `git checkout -b feature/nome-da-tarefa`.
3. **Salvar as Alterações** `git add .` e `git commit -m "mensagem"`.
4. **Sincronizar nuvem:** Após os commits, faça o primeiro envio rastreável utilizando `git push -u origin feature/nome-da-tarefa`.
5. **Limpeza pós-Merge:** Quando a funcionalidade for mesclada, retorne com `git checkout develop`, faça o `pull` e apague a branch local antiga com `git branch -d feature/nome-da-tarefa`.

### Ciclo de Vida de uma Tarefa (Passo a Passo)

1. **Verificar onde você está:** `git branch` ou `git status`.
2. **Garantir que está na branch correta:** `git checkout develop`.
3. **Atualizar a branch:** `git pull origin develop`.
4. **Criar a nova branch:** `git checkout -b feature/nome-da-tarefa`.
5. **Fazer commits:** `git add .` e `git commit -m "mensagem"`.
6. **Sincronizar nuvem:** `git push -u origin feature/nome-da-tarefa`.
7. **Limpeza pós-Merge:** `git checkout develop`, `git pull origin develop` e `git branch -d feature/nome-da-tarefa`.

**Comandos Avançados de Git**.

**Desfazer alterações pendentes na branch (Limpar área)**: `git restore`.

**Pausar trabalho temporariamente (Stash)**: `git stash` para guardar o progresso e `git stash pop` para recuperar os arquivos posteriormente.

**Forçar disparo de automações no Actions**: `git commit --allow-empty -m "sua mensagem aqui"`.

### Padrão de Commit (A Narrativa do Código)

* **Idioma Base:** Português (Brasil).
* **Estrutura:** Baseado no Conventional Commits, permitindo que a história do projeto seja compreendida apenas lendo o log.
* **Modelo Obrigatório:**

```text
tipo(escopo): resumo curto da ação

PRINCIPAIS MUDANÇAS:
- [Resumo executivo do impacto da mudança]

BACKEND / FRONTEND / DEVOPS:
- feat(auth): [Detalhe técnico do que foi feito]
- fix(user): [Qual bug foi corrigido]

DOCUMENTAÇÃO:
- docs: [Quais arquivos .md foram atualizados]
```
