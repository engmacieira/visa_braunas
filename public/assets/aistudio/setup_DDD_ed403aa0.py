import os

def create_structure():
    # Nome do projeto (Edite aqui ou passe como argumento se preferir evoluir o script)
    project_name = "AgendamentosTFD"
    
    # 1. Definição das Pastas (Arquitetura Híbrida: MVC Backend + React Frontend)
    directories = [
        f"{project_name}/.github/workflows",    # CI/CD
        f"{project_name}/.vscode",              # Configurações do VSCode
        f"{project_name}/alembic",              # Migrations (Alembic)
        f"{project_name}/app/core",             # Configs transversais (Settings, Security)
        f"{project_name}/app/domain",           # [DDD] Entidades, Value Objects e Interfaces de Repositório
        f"{project_name}/app/application",      # [DDD] Casos de Uso (Serviços de Aplicação) e DTOs
        f"{project_name}/app/infrastructure",   # [DDD] Implementação de Repositórios, Models do SQLAlchemy
        f"{project_name}/app/presentation",     # [DDD] Routers do FastAPI e Schemas do Pydantic
        f"{project_name}/app/tests",            # Testes Automatizados (Pytest)
        f"{project_name}/docs",                 # Documentação de Gestão (Memória do Projeto)
        f"{project_name}/docs/sprint",          # Histórico de Sprint
        f"{project_name}/docs/kanbam",          # Histórico de Quadros Kanbam
        f"{project_name}/docs/release_notes",   # Histórico de Versão
        f"{project_name}/frontend",             # Onde viverá o React + Vite
        f"{project_name}/txt",                  # Logs rápidos (se necessário)
    ]

    # 2. Conteúdo dos Arquivos

    gitignore_content = """
__pycache__/
*.py[cod]
*$py.class
.env
.venv
env/
venv/
.idea/
.vscode/
dist/
node_modules/
txt/
Checklist.md
*.db
*.sqlite3
"""

    # Stack Backend Moderno: FastAPI + SQLAlchemy + Alembic
    requirements_content = """
fastapi
uvicorn
sqlalchemy
alembic
pydantic
pydantic-settings
python-dotenv
pytest
pytest-cov
httpx
"""

    # O Guia Mestre (Substitui o antigo inicial.txt)
    checklist_content = f"""# 🚀 Manual de Início Rápido: {project_name}

Bem-vindo ao seu novo projeto! Este guia contém os passos essenciais para rodar o ambiente de desenvolvimento (Backend + Frontend).

## 1. Configuração do Backend (Python/FastAPI)

1. **Ambiente Virtual:**
   python -m venv .venv
   # Windows:
   .venv\\Scripts\\activate
   # Para desativar:
   deactivate
   
2. **Dependências:**
    pip install -r requirements.txt
    
3. **Banco de Dados (Alembic): Se for a primeira vez:**
    alembic init alembic
    # (Configure o alembic.ini e env.py para apontar para app.models)
    
    Para rodar as migrações:
    
    alembic revision --autogenerate -m "Initial migration"
    alembic upgrade head
    
4. **Rodar o Servidor:**
    uvicorn app.main:app --reload

## 2. Configuração do Frontend (React + TypeScript + Vite)

A pasta frontend foi criada. Para iniciar o projeto React nela:

1. **Inicializar o Vite (se a pasta estiver vazia):**
    cd frontend
    npm create vite@latest . -- --template react-ts
    
2. **Instalar Dependências:**
    npm install
    
3. **Rodar o Frontend:**
    npm rum dev
    Acesse: http://localhost:5173
    
## 3. Configurar GIT (Primeiro Commit)

1. Comando: git init
   Comando: git add .
   Comando: git commit -m "feat: estrutura inicial"
   *Lembrete: Crie o repositório no GitHub para dar o push.

2. CONTROLE DE VERSÃO E GITHUB
    - git add .
    - git commit -m "..."
    - git push

## 4. Demais Informações Ùteis para mim

1. COMANDOS ÚTEIS
    - Rodar Testes: python -m pytest
    - Rodar Testes com Coverage: pytest --cov=app
    - Rodar Testes exibindo erros: pytest -vv
    - Gerar requirements.txt atualizado: pip freeze > requirements.txt
    - Gerar os logs do teste > txt/log_pytest.txt 2>&1  
    
2. ERROS COMUNS
    - O "Pegadinha" do VS Code (Interpretador). 
        - Aperte Ctrl+Shift+P
        - Digite "Python: Select Interpreter"

## 5. Gestão e Documentação

Histórico: Mantenha os logs de sprint na pasta docs/.

Tarefas: Consulte docs/USER_STORIES.md para o backlog.

Dívidas: Registre débitos técnicos em docs/DividasTecnicas.md.

Bom código! 🚀 """

    # Arquivo .env de exemplo
    env_content = """

Configurações do Banco de Dados
DATABASE_URL=sqlite:///./app.db

Segurança (Gere uma chave forte em produção: openssl rand -hex 32)
SECRET_KEY=desenvolvimento_apenas_troque_em_producao ALGORITHM=HS256 ACCESS_TOKEN_EXPIRE_MINUTES=30

CORS (Frontend URL)
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://localhost:3000"] """

    readme_content = f"""# {project_name}
    
Projeto gerado com a arquitetura Mark Construtor v2.1.

Estrutura
Backend: Python, FastAPI, SQLAlchemy, Alembic.

Frontend: React, TypeScript, Vite.

Docs: Documentação viva na pasta docs/.

Para iniciar, leia o arquivo docs/Checklist.md. """

    # Configuração de Testes e Coverage
    converage_content = """

[run] source = app omit = app/tests/* app/core/* */init.py

[report] show_missing = True """

    # Configuração do main.py
    main_py_content = """
from fastapi import FastAPI

app = FastAPI(title="Base FastAPI Project")

@app.get("/")
def read_root():
    return {"message": "API Base Online! Acesse /docs"}"""
    
    # Configuração do docker
    docker_content = """
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    container_name: {project_name}_db
    restart: always
    environment:
      - POSTGRES_USER={project_name}_user
      - POSTGRES_PASSWORD={project_name}_pass
      - POSTGRES_DB={project_name}
    ports:
      - "5433:5432" # <--- MUDAR AQUI (A porta externa não deve ser igual as anteriores)
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
"""

    # Arquivo de Regras
    regras_content = """
# 🚫 PROTOCOLO DE TOLERÂNCIA ZERO PARA ADIVINHAÇÃO (ZERO GUESSING POLICY)

> **DIRETRIZ SUPREMA:** É estritamente PROIBIDO supor, adivinhar ou inventar nomes de arquivos, variáveis, funções, classes ou rotas que não estejam explicitamente visíveis no contexto atual ou nos arquivos fornecidos.

## 1. O Princípio da Leitura Prévia
Antes de escrever qualquer linha de código que interaja com outras partes do sistema (imports, chamadas de função, instâncias de classe), você deve realizar uma das duas ações:

1.  **VERIFICAR:** Se o repositório ou arquivos estão anexados, USE SUAS FERRAMENTAS para ler o arquivo de origem daquela dependência.
    * *Exemplo:* Vai editar o `auth_service.py`? Leia o `user_model.py` antes para saber se o campo é `user.id` ou `user.uuid`.
2.  **SOLICITAR:** Se o arquivo não está no contexto, PARE e solicite ao usuário:
    * *"Para evitar quebrar o código, preciso que você me envie o arquivo `app/models/user.py` para eu ver o nome exato dos atributos."*

## 2. A Regra da Imutabilidade de Dependências
Ao refatorar ou editar um arquivo funcional:
* **NÃO** altere nomes de variáveis ou funções que são importadas de outros arquivos, a menos que você também esteja editando o arquivo de origem na mesma resposta.
* **NÃO** assuma que uma função existe só porque "seria lógico" ela existir. (Ex: Não chame `repository.get_by_email()` se você não leu o arquivo do repositório para confirmar que esse método existe).

## 3. Comportamento Anti-Alucinação
Se você se deparar com um código que usa `from .utils import calculate_tax`, mas você não tem o arquivo `utils.py`:
* **CORRETO:** Manter a chamada exatamente como está (`calculate_tax()`), assumindo que ela funciona.
* **ERRADO:** Mudar para `calculate_tax_value()` porque você acha o nome mais bonito, ou tentar recriar a função `calculate_tax` no arquivo atual achando que ela não existe.

## 4. Check-List de Sanidade (Execute Mentalmente)
Antes de gerar a resposta final, faça o teste:
1.  *"Eu inventei algum import que não estava no código original?"*
2.  *"Eu mudei o nome de alguma variável que vem de fora desse arquivo?"*
3.  *"Eu tenho certeza absoluta que o método `.save()` existe nessa classe, ou estou assumindo que é um ORM padrão?"*

**SE A RESPOSTA FOR "NÃO TENHO CERTEZA": PARE. NÃO ESCREVA CÓDIGO. PEÇA O ARQUIVO.**
"""

    # 3. Execução da Criação
    print(f"🔨 Gerando estrutura do projeto '{project_name}'...")

    for directory in directories:
        os.makedirs(directory, exist_ok=True)
        # Cria __init__.py em pastas Python para torná-las pacotes
        if "app" in directory or "tests" in directory:
            with open(f"{directory}/__init__.py", "w") as f: pass

    # Dicionário de arquivos para criar
    files = {
        f"{project_name}/.gitignore": gitignore_content,
        f"{project_name}/requirements.txt": requirements_content,
        f"{project_name}/README.md": readme_content,
        f"{project_name}/.coveragerc": converage_content,
        f"{project_name}/.env": env_content.strip(),
        f"{project_name}/docs/Checklist.md": checklist_content,
        f"{project_name}/docker-compose.yaml": docker_content,
        
        f"{project_name}/app/main.py": main_py_content,
        
        f"{project_name}/docs/00REGRAS_CODIGO.md": regras_content,
        f"{project_name}/docs/01USER_STORIES.md": "# Backlog do Produto\n\n* [ ] Configurar Banco de Dados\n* [ ] Criar Autenticação",
        f"{project_name}/docs/03DividasTecnicas.md": "# Dívidas Técnicas\n\n* (Nenhuma dívida inicial... ainda!)",
        f"{project_name}/docs/02Por_Onde_Comecar.md": "# 🚀 Manual de Início Rápido: {project_name}\n\nBem-vindo ao projeto! Este guia é um resumo das situação atual do projeto e quais os passos a seguir"
    }

    for path, content in files.items():
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)

    print(f"✅ Projeto '{project_name}' criado com sucesso!")
    print(f"👉 Leia o arquivo '{project_name}/docs/Checklist.md' para os próximos passos.")

if __name__ == "__main__":
    create_structure()


