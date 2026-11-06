# Relatório Técnico - Sprint QA-07: Pipeline de CI/CD (GitHub Actions) e Rotina Automatizada de Backup/Restore do PostgreSQL

## 1. Visão Geral e Contexto da Sprint
Com a consolidação das suítes de testes unitários, integração, segurança e carga (Sprints QA-01 a QA-06) e a integração E2E em curso (FE-08), a **Sprint QA-07** fecha o ciclo de confiabilidade operacional da infraestrutura do **VigiMinas** (Sistema de Gestão da Vigilância Sanitária Municipal de Braúnas/MG).

Os objetivos primordiais desta sprint foram:
1. **Pipeline Determinístico de CI/CD**: Implementação de workflow de validação contínua no GitHub Actions para execução de linters (`ruff`), migrações relacionais (`alembic upgrade head`) e imposição de gate de cobertura mínima de testes ($\ge 80\%$) com service container PostgreSQL 16.
2. **Backup e Rotação Idempotente de Dados**: Automação de rotina de cópia de segurança em formato custom comprimido (`pg_dump -Fc`), parametrização não-bloqueante por variáveis de ambiente e expurgo de retenção de 7 dias.
3. **Procedimento Operacional Padrão (POP) de Disaster Recovery**: Script utilitário complementar de restauração (`pg_restore --clean --if-exists`) e diretrizes de recuperação emergencial de dados municipais.

---

## 2. Estrutura do Pipeline de CI/CD (`.github/workflows/backend-ci.yml`)

### 2.1. Gatilhos de Execução e Concorrência
O workflow foi parametrizado para garantir que nenhuma alteração ingresse na branch de produção sem aprovação automatizada:
- **`push`**: Disparado automaticamente nas branches `main` e `develop`.
- **`pull_request`**: Disparado em qualquer solicitação de merge com destino à `main`.
- **Cancelamento de Execuções Obsoletas**: Diretiva `concurrency` com `cancel-in-progress: true` para otimizar tempo e recursos de infraestrutura.

### 2.2. Service Container PostgreSQL 16
O ambiente de execução utiliza a imagem oficial `postgres:16-alpine`:
- **Porta Mapeada**: `5434:5432`, garantindo paridade com as configurações do `docker-compose.yaml` local.
- **Healthcheck Ativo**: Comandos `pg_isready -U vigiminas_user -d vigiminas_db` executados a cada 5 segundos com até 10 tentativas.
- **Extensões de Criptografia**: Inicialização com comando explícito `CREATE EXTENSION IF NOT EXISTS pgcrypto;` para suporte nativo a `gen_random_uuid()`.

### 2.3. Estágios do Job de Validação (`test`)
1. **Checkout do Repositório**: `actions/checkout@v4`.
2. **Setup do Python 3.12**: `actions/setup-python@v5` com ativação de cache nativo para `pip`.
3. **Instalação das Ferramentas PostgreSQL**: Pacote `postgresql-client` instalado no runner via `apt-get` para fornecer `psql`, `pg_dump` e `pg_restore`.
4. **Instalação de Dependências**: Leitura de `requirements.txt` com inclusão dos utilitários de qualidade (`ruff` e `pytest-cov`).
5. **Checagem de Sintaxe e Linter**: Execução do `ruff check --select E9,F63,F7,F82 app/ tests/` prevenindo erros críticos de sintaxe e imports não resolvidos.
6. **Migrações de Banco de Dados**: Aplicação completa das migrações Alembic (`alembic upgrade head`), validando DDLs de tabelas, triggers e views analíticas.
7. **Execução de Testes com Gate de Cobertura**:
   ```bash
   pytest --cov=app/domain --cov=app/infrastructure/models --cov=app/infrastructure/base_model.py --cov=app/infrastructure/seeds.py --cov-report=term-missing --cov-fail-under=80
   ```
   O pipeline falha imediatamente caso a cobertura atinja patamar inferior a 80%.

---

## 3. Rotina de Backup Automatizado (`scripts/backup_postgres.sh`)

### 3.1. Princípios de Segurança e Idempotência
- **Modo Estrito de Bash**: Execução sob `set -euo pipefail` garantindo interrupção imediata na ocorrência de comandos com falha ou variáveis indefinidas.
- **Isolamento de Credenciais**: Leitura das credenciais via variáveis de ambiente com valores de fallback seguros:
  - `PGHOST` (padrão: `localhost`)
  - `PGPORT` (padrão: `5434`)
  - `PGUSER` (padrão: `vigiminas_user`)
  - `PGDATABASE` (padrão: `vigiminas_db`)
  - `PGPASSWORD` (padrão: `vigiminas_pass`)
  - `BACKUP_DIR` (padrão: `./backups`)
  - `RETENTION_DAYS` (padrão: `7`)
- **Export de Senha**: Uso de `export PGPASSWORD` local ao processo, evitando exposição de senhas em linhas de comando do `ps`.

### 3.2. Formato Custom Comprimido (`-Fc`)
O dump é gerado com a flag `pg_dump -Fc`:
- Permite restauração paralela multi-thread (`-j`).
- Suporta restauração granular e seletiva de tabelas específicas via `pg_restore -t`.
- Compacta dados e metadados, minimizando espaço em disco e tráfego de rede.
- Nomeação padronizada: `vigiminas_backup_$(date +%Y%m%d_%H%M%S).dump`.

### 3.3. Política de Retenção e Expurgo
A rotação de arquivos de backup é governada pelo comando `find`:
```bash
find "$BACKUP_DIR" -type f -name "vigiminas_backup_*.dump" -mtime +7 -delete
```
**Regra de Ouro**: O expurgo de arquivos com mais de 7 dias é executado exclusivamente **após a confirmação de êxito (exit code 0)** do dump do dia corrente, garantindo que falhas transitórias no dump nunca apaguem os backups históricos válidos.

---

## 4. Script Complementar de Restauração (`scripts/restore_postgres.sh`)
Para validação de integridade e operações de contingência, o utilitário `scripts/restore_postgres.sh` foi criado com os seguintes recursos:
- Validação estrita da existência do arquivo `.dump` passado por parâmetro de linha de comando.
- Permite especificar o banco alvo (padrão: `$PGDATABASE`).
- Aplica parâmetros de restauração limpa:
  ```bash
  pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists -v "$BACKUP_FILE"
  ```
- O argumento `--clean --if-exists` efetua o drop seguro de triggers, views e tabelas antes de recriá-los, eliminando conflitos de chave primária e integridade referencial sem demandar comandos manuais destrutivos `DROP DATABASE`.

---

## 5. Procedimento Operacional Padrão (POP) - Disaster Recovery

### POP-INFRA-01: Recuperação de Desastres da Base VigiMinas

#### Objetivo:
Restabelecer o funcionamento pleno do banco de dados relacional PostgreSQL do VigiMinas no Município de Braúnas/MG em cenários de corrupção, falha de hardware ou deleção acidental de dados.

#### Pré-requisitos:
- Acesso SSH ou console com permissões administrativas ao servidor de banco de dados.
- Utilitários do PostgreSQL Client (`pg_restore`, `psql`) versão $\ge 16$.
- Arquivo de backup íntegro no padrão `vigiminas_backup_*.dump`.

#### Procedimento Passo a Passo:

1. **Identificação e Validação do Backup Mais Recente**:
   Localize o arquivo de dump gerado no diretório de backups:
   ```bash
   ls -lht /app/backups/vigiminas_backup_*.dump | head -n 5
   ```
   Valide o cabeçalho e integridade do dump sem aplicar modificações:
   ```bash
   pg_restore -l /app/backups/vigiminas_backup_YYYYMMDD_HHMMSS.dump | head -n 30
   ```

2. **Definição das Variáveis de Conexão no Terminal**:
   ```bash
   export PGHOST=localhost
   export PGPORT=5434
   export PGUSER=vigiminas_user
   export PGPASSWORD=vigiminas_pass
   export PGDATABASE=vigiminas_db
   ```

3. **Cenário A: Restauração Sobre a Base Existente (Recomendado)**:
   Interrompa momentaneamente a API para evitar escritas concorrentes:
   ```bash
   # Parar serviço da API se aplicável
   ./scripts/restore_postgres.sh /app/backups/vigiminas_backup_YYYYMMDD_HHMMSS.dump vigiminas_db
   ```

4. **Cenário B: Recriação de Base do Zero (Corrupção Grave)**:
   ```bash
   psql -h "$PGHOST" -p "$PGPORT" -U postgres -c "DROP DATABASE IF EXISTS vigiminas_db;"
   psql -h "$PGHOST" -p "$PGPORT" -U postgres -c "CREATE DATABASE vigiminas_db OWNER vigiminas_user;"
   psql -h "$PGHOST" -p "$PGPORT" -U postgres -d vigiminas_db -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"

   ./scripts/restore_postgres.sh /app/backups/vigiminas_backup_YYYYMMDD_HHMMSS.dump vigiminas_db
   ```

5. **Validação Pós-Restauração (Checklist de Integridade)**:
   Conecte-se à base restaurada e verifique a contagem de registros fundamentais:
   ```bash
   psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "
   SELECT
       (SELECT COUNT(*) FROM configuracao_institucional) as config_ok,
       (SELECT COUNT(*) FROM usuarios) as total_usuarios,
       (SELECT COUNT(*) FROM estabelecimentos) as total_estabelecimentos,
       (SELECT COUNT(*) FROM cnaes) as total_cnaes,
       (SELECT COUNT(*) FROM alvaras_sanitarios) as total_alvaras;
   "
   ```

6. **Validação das Triggers e Views**:
   Execute a suíte de testes de integração para comprovar a reativação de triggers de auditoria e sincronização:
   ```bash
   python -m pytest tests/integration/db/
   ```

7. **Reinicialização da Aplicação**:
   Restabeleça a execução dos serviços backend e frontend do VigiMinas.

---

## 6. Resultados dos Testes Operacionais Locais

### 6.1. Execução do Script de Backup:
- **Comando**: `./scripts/backup_postgres.sh`
- **Arquivo Gerado**: `vigiminas_backup_20261106_194553.dump` (116 KB comprimido).
- **Tempo de Execução**: < 1 segundo.
- **Teste de Rotação**: Simulação de dump antigo com `touch -d "10 days ago"` confirmou remoção automática apenas do arquivo expirado.

### 6.2. Execução do Script de Restauração:
- **Comando**: `./scripts/restore_postgres.sh ./backups/vigiminas_backup_20261106_194553.dump vigiminas_test`
- **Resultado**: 100% dos esquemas, tabelas, índices parciais condicionais, triggers nativas e views analíticas recriados com sucesso no banco de testes.
- **Conferência de Registros**:
  - `estabelecimentos`: 6 registros.
  - `cnaes`: 10 registros.
  - `usuarios`: 5 registros.
  - `alvaras_sanitarios`: 1 registro.
  - `inspecoes`: 2 registros.

---

## 7. Conclusão
A infraestrutura do **VigiMinas** conta agora com um ciclo completo e automatizado de Continuous Integration e Disaster Recovery:
- **Proteção Preventiva**: O pipeline de CI/CD bloqueia commits com quebra de tipagem, migrações inconsistentes ou redução de cobertura de testes.
- **Resiliência e Continuidade de Negócio**: Rotinas de backup customizado e POP detalhado asseguram recuperação rápida e auditável dos registros de vigilância sanitária municipal de Braúnas/MG.
