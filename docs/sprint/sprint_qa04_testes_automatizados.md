# Relatório Técnico - Sprint QA-04: Suíte Completa de Testes Automatizados (Pytest)

## 1. Visão Geral e Objetivos da Sprint
A **Sprint QA-04** teve como objetivo consolidar a blindagem da arquitetura do **VigiMinas** através de uma suíte automatizada de testes com separação estrita entre:
- **Testes Unitários Rápidos (sem I/O de banco)**: focados no domínio puro (DDD), validando entidades, invariantes de regras de negócio, serviços de cálculo de risco sanitário e value objects regulatórios;
- **Testes de Integração de Banco de Dados**: executados de forma assíncrona contra o banco PostgreSQL real, validando transações com rollback automático, índices parciais condicionais (soft delete), triggers nativas de sincronização e imutabilidade, e views SQL analíticas;
- **Testes de Integração de Rotas FastAPI (HTTPX)**: exercitando os endpoints da API com cliente assíncrono `ASGITransport`, cobrindo autenticação JWT, controle de acesso baseado em papéis (RBAC), endpoints públicos sem autorização (validação de alvarás e ouvidoria) e consultas agregadas de metas e indicadores.

---

## 2. Estrutura de Diretórios e Organização da Suíte de Testes
A suíte foi estruturada de forma modular e determinística:

```
tests/
├── conftest.py                             # Fixtures compartilhadas (AsyncSession transacional com rollback, async_client, JWTs por perfil, setup institucional)
├── fixtures/
│   ├── __init__.py
│   └── seed_fixtures.py                    # Fixtures de carga de sementes regulatórias (Braúnas/MG)
├── unit/
│   └── domain/
│       ├── test_value_objects.py           # CPF, CNPJ, CEP, NumeroTermo, CodigoAutenticidadeAlvara, etc.
│       ├── test_calculadora_risco.py       # Regra hierárquica oficial de precedência sanitária (Risco III, II, I, Dispensado)
│       ├── test_invariantes_inspecao.py    # Invariantes de laudos fiscais, Indicador 11 (VAPT), prazos e ciclo de vida
│       └── test_entidades_completas.py     # Ciclo de vida e regras de negócio de Usuario, Metas, Denuncia, Requerimento e Alvara
├── integration/
│   ├── db/
│   │   ├── test_estabelecimentos_lifecycle.py     # Repositório, unicidade condicional N:N de CNAE principal, RT titular, Soft Delete e views
│   │   ├── test_fiscalizacao_views.py             # Views SQL analíticas: vw_indicador_11_vapt_consolidado e vw_inspecoes_notificacoes_a_vencer
│   │   ├── test_alvara_trigger_sincronizacao.py   # Trigger PostgreSQL de sincronização mestre do alvará e reversão (cassado / soft delete)
│   │   └── test_auditoria_imutavel.py             # Trigger append-only PostgreSQL bloqueando UPDATE e DELETE em logs_auditoria
│   └── api/
│       ├── test_auth_routes.py                    # Fluxo de login, senha incorreta, rota /me e bloqueio sem token
│       ├── test_rbac_usuarios.py                  # RBAC: POST /usuarios com perfil digitador (403) vs admin_master (201)
│       ├── test_alvaras_public_validation.py      # Consulta pública de alvará sem cabeçalho Authorization (200 OK e 404)
│       ├── test_ouvidoria_anonima.py              # Proteção e sigilo estrito de dados civis do denunciante anônimo
│       └── test_indicadores_dashboard.py          # Dashboard agregado de metas anuais e indicadores regulatórios
├── test_qa02_pendencias.py                        # Regressão de pendências regulatórias
├── test_qa03_seeds.py                             # Verificação da idempotência e integridade dos seeds de Braúnas/MG
└── test_schema_parity.py                          # Paridade de schema SQLAlchemy vs DDL PostgreSQL
```

---

## 3. Detalhamento dos Casos de Teste Cobertos

### 3.1. Infraestrutura e Fixtures (`tests/conftest.py`)
- **`async_db_session`**: Fornece uma sessão assíncrona PostgreSQL (`AsyncSession`) encapsulada em uma transação com `ROLLBACK` automático ao término de cada teste. O `create_async_engine` foi parametrizado com `poolclass=NullPool`, evitando colisões de event loop entre funções assíncronas do Pytest.
- **`async_client`**: Instância de `httpx.AsyncClient` com `ASGITransport(app=app)`, integrando os routers FastAPI diretamente à sessão transacional de teste via override de dependência (`app.dependency_overrides[get_db_session]`).
- **Fixtures de Autenticação JWT**:
  - `auth_headers_admin`: Gera token com perfil `admin_master`.
  - `auth_headers_coordenador`: Gera token com perfil `coordenador`.
  - `auth_headers_fiscal`: Gera token com perfil `fiscal_tecnico`.
  - `auth_headers_digitador`: Gera token com perfil `digitador`.
- **`setup_institucional_exercicio_2026`**: Carga rápida dos parâmetros institucionais de Braúnas/MG e metas de 2026.

### 3.2. Testes Unitários de Domínio (`tests/unit/domain/`)
- **Value Objects (`test_value_objects.py`)**:
  - `CPF`: Validação dos 11 dígitos, cálculo dos 2 dígitos verificadores (algoritmo oficial da Receita Federal), rejeição de dígitos repetidos, sanitização e formatação com máscara `XXX.XXX.XXX-XX`.
  - `CNPJ`: Cálculo matemático dos dígitos verificadores (módulo 11 com pesos), rejeição de sequências repetidas e formatação `XX.XXX.XXX/XXXX-XX`.
  - `CEP`: Sanitização para 8 dígitos numéricos, máscara `XXXXX-XXX` e rejeição de comprimentos incorretos.
  - `NumeroTermo`: Validação de termos fiscais, rejeição de strings vazias e controle de comprimento máximo (50 caracteres).
  - `CodigoAutenticidadeAlvara`: Validação do formato `XXXXXXXX-YYYY`, fé pública e geração estocástica via classmethod.
- **Calculadora de Risco Sanitário (`test_calculadora_risco.py`)**:
  - Validação da regra hierárquica oficial de precedência:
    - Ao menos 1 CNAE de Risco III $\rightarrow$ Risco Sanitário do estabelecimento = Risco III.
    - Apenas CNAEs de Risco II e Risco I $\rightarrow$ Risco Sanitário = Risco II.
    - Apenas CNAEs de Risco I $\rightarrow$ Risco Sanitário = Risco I.
    - Apenas CNAEs Dispensados $\rightarrow$ Risco Sanitário = Risco I (operacional).
    - Desconsideração de CNAEs inativos ou logicamente excluídos (`is_deleted = True`).
- **Invariantes de Inspeção e Laudo Fiscal (`test_invariantes_inspecao.py`)**:
  - Ações VAPT (Indicador 11 - Saúde do Trabalhador): Exigência mandatória de `nome_local_trabalho` e `principais_riscos_identificados` ao concluir a vistoria.
  - Resultado `notificado_com_prazo`: Exigência de prazo em dias e cálculo automático da data limite de adequação.
  - Ciclo de vida: Transições válidas (`agendada` $\rightarrow$ `em_andamento` $\rightarrow$ `concluida` / `cancelada`) e rejeição de ações inválidas (ex.: iniciar inspeção cancelada ou cancelar inspeção já concluída com laudo).
- **Entidades de Domínio (`test_entidades_completas.py`)**:
  - `Usuario`: Ativação, desativação, soft delete, registro de último login e checagem de competência funcional (`pode_assinar_termos`, `pode_homologar_alvara`).
  - `Denuncia`: Anonimato absoluto, despacho e encerramento motivado.
  - `RequerimentoAlvara`: Tramitação e deferimento com parecer técnico.
  - `AlvaraSanitario`: Suspensão cautelar, revogação e cassação administrativa.
  - `MetasExercicio`: Validação de faixas de anos e percentuais válidos (0 a 100%).

### 3.3. Testes de Integração de Repositórios e Banco (`tests/integration/db/`)
- **Ciclo de Vida de Estabelecimentos (`test_estabelecimentos_lifecycle.py`)**:
  - Persistência e busca via `EstabelecimentoRepository`.
  - Unicidade condicional de CNAE principal ativo por estabelecimento (bloqueio de colisão via PostgreSQL).
  - Unicidade de Responsável Técnico titular ativo (`eh_substituto = FALSE`).
  - Consulta à view `vw_estabelecimentos_risco_consolidado` confirmando agregação em SQL.
  - Validação do índice parcial de Soft Delete: recadastro aceito para o mesmo CNPJ quando o anterior possui `is_deleted = True`.
- **Fiscalização e Views Regulatórias (`test_fiscalizacao_views.py`)**:
  - Inserção de inspeção VAPT e apuração do Indicador 11 na view `vw_indicador_11_vapt_consolidado`.
  - Inserção de notificação e cálculo dos dias restantes na view `vw_inspecoes_notificacoes_a_vencer`.
- **Trigger de Sincronização de Alvarás (`test_alvara_trigger_sincronizacao.py`)**:
  - Validação da trigger `trg_alvara_sincroniza_estabelecimento`: a inserção de alvará com status `ativo` atualiza automaticamente `situacao_alvara = 'Válido'`, `numero_alvara` e `data_validade_alvara` na tabela `estabelecimentos`.
  - A alteração para `status = 'cassado'` ou soft delete (`is_deleted = True`) no alvará reverte o estabelecimento para `situacao_alvara = 'Não Possui (Irregular)'`.
- **Imutabilidade de Auditoria (`test_auditoria_imutavel.py`)**:
  - Inserção com sucesso de registro na tabela `logs_auditoria`.
  - Tentativa explícita de `UPDATE` e `DELETE` disparando exceção na trigger `trg_bloquear_modificacao_logs` (`fn_impedir_violacao_auditoria`), abortando a transação conforme a regra append-only.

### 3.4. Testes de Integração de Rotas da API (`tests/integration/api/`)
- **Autenticação (`test_auth_routes.py`)**:
  - `POST /api/v1/auth/login`: Autenticação com credenciais válidas emitindo Bearer JWT.
  - Bloqueio com HTTP 401 para credenciais inválidas.
  - `GET /api/v1/auth/me`: Retorno do perfil cadastral e bloqueio com HTTP 401 sem token ou com token adulterado.
- **RBAC em Usuários (`test_rbac_usuarios.py`)**:
  - Perfil `digitador` tentando acessar `POST /api/v1/usuarios` recebe HTTP 403 Forbidden.
  - Perfil `admin_master` acessando a mesma rota recebe HTTP 201 Created.
- **Validação Pública de Alvarás (`test_alvaras_public_validation.py`)**:
  - Chamada a `GET /api/v1/alvaras/validar/{codigo_autenticidade}` sem cabeçalho Authorization responde HTTP 200 OK com os dados públicos do alvará, e HTTP 404 para código inexistente.
- **Ouvidoria e Denúncias (`test_ouvidoria_anonima.py`)**:
  - Denúncia registrada com `denunciante_anonimo = True` garante que dados civis (`nome`, `telefone`, `email`) são omitidos e retornam `None`.
  - Consulta pública por número de protocolo assegura sigilo absoluto.
- **Dashboard de Metas e Indicadores (`test_indicadores_dashboard.py`)**:
  - Consulta a `GET /api/v1/indicadores/dashboard?ano=2026` com token válido retorna o payload consolidado de todos os indicadores (11 a 15), distribuição por risco e metas.
  - Rejeição com HTTP 401 sem token.

---

## 4. Bugs e Inconsistências Corrigidos Durante a Sprint
1. **Truncamento de CEP no Schema e Seeds**:
   - As colunas de CEP em `configuracao_institucional` e tabelas correlatas estavam dimensionadas como `VARCHAR(9)`, enquanto o CEP formatado oficial de Braúnas/MG (`35.189-000`) possui 10 caracteres. A coluna foi ajustada para suportar até 15 caracteres.
2. **Definição e Tipagem da View `vw_indicador_11_vapt_consolidado`**:
   - A view SQL utilizava a coluna `exercicio`, enquanto os repositórios analíticos e schemas esperavam `ano_exercicio`, além de contagens de estabelecimentos distintos. A definição da view em `estrutura_db/5_inspecoes.sql` e na migração Alembic correspondente foi uniformizada para expor `ano_exercicio`, `total_inspecoes_vapt`, `inspecoes_concluidas`, `inspecoes_em_andamento` e `estabelecimentos_distintos_atendidos`.
3. **Mapeamento da View `vw_inspecoes_notificacoes_a_vencer`**:
   - A consulta analítica no repositório de leitura esperava a coluna `cnpj_cpf` e `data_inicio`, que pertenciam às tabelas mestres de estabelecimentos e inspeções. O repositório `IndicadoresReadRepository` foi aprimorado com JOINs explícitos entre a view e as tabelas subjacentes.
4. **Conversão de Enums no `UsuarioRepository`**:
   - Ao desserializar o modelo de banco para a entidade de domínio puro `Usuario`, o campo `perfil` vinha como string em certas chamadas, provocando falha no acesso a `.value`. Adicionou-se conversão defensiva para a enum `PerfilUsuario`.

---

## 5. Resultados de Execução e Cobertura de Código

### 5.1. Execução Completa dos Testes (`pytest -vv`)
```bash
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.2.0, pluggy-1.7.0
rootdir: /app
configfile: pytest.ini
plugins: asyncio-1.4.1.post1, anyio-4.16.0, cov-7.1.0
collected 82 items

tests/test_qa02_pendencias.py ..........                                 [ 12%]
tests/test_qa03_seeds.py ........                                        [ 21%]
tests/test_schema_parity.py .....                                        [ 28%]
tests/unit/domain/test_calculadora_risco.py ......                       [ 35%]
tests/unit/domain/test_entidades_completas.py .....                      [ 41%]
tests/unit/domain/test_invariantes_inspecao.py ..........                [ 53%]
tests/unit/domain/test_value_objects.py ...................              [ 76%]
tests/integration/api/test_alvaras_public_validation.py ..               [ 79%]
tests/integration/api/test_auth_routes.py ..                             [ 81%]
tests/integration/api/test_indicadores_dashboard.py ..                   [ 84%]
tests/integration/api/test_ouvidoria_anonima.py .                        [ 85%]
tests/integration/api/test_rbac_usuarios.py ..                           [ 87%]
tests/integration/db/test_alvara_trigger_sincronizacao.py .              [ 89%]
tests/integration/db/test_auditoria_imutavel.py ..                       [ 91%]
tests/integration/db/test_estabelecimentos_lifecycle.py .....            [ 97%]
tests/integration/db/test_fiscalizacao_views.py ..                       [100%]

============================== 82 passed in 23.45s ==============================
```
**Resultado: 82 testes executados com 100% de aprovação (0 falhas, 0 erros).**

### 5.2. Relatório de Cobertura de Código da Camada de Domínio (`app/domain`)
```bash
Name                                           Stmts   Miss  Cover   Missing
----------------------------------------------------------------------------
app/domain/__init__.py                             0      0   100%
app/domain/auth/entities.py                      120      0   100%
app/domain/auth/repositories.py                   53     15    72%
app/domain/auth/value_objects.py                  43      0   100%
app/domain/estabelecimentos/__init__.py            0      0   100%
app/domain/estabelecimentos/entities.py          173     14    92%
app/domain/estabelecimentos/repositories.py       61     18    70%
app/domain/estabelecimentos/services.py           18      0   100%
app/domain/estabelecimentos/value_objects.py      76     19    75%
app/domain/fiscalizacao/__init__.py                0      0   100%
app/domain/fiscalizacao/entities.py              108     15    86%
app/domain/fiscalizacao/enums.py                  21      0   100%
app/domain/fiscalizacao/repositories.py           30      8    73%
app/domain/fiscalizacao/value_objects.py          16      0   100%
app/domain/indicadores/__init__.py                 3      0   100%
app/domain/indicadores/repositories.py            21      6    71%
app/domain/indicadores/value_objects.py           39      6    85%
app/domain/licenciamento/__init__.py               4      0   100%
app/domain/licenciamento/entities.py             169     23    86%
app/domain/licenciamento/enums.py                 18      0   100%
app/domain/licenciamento/repositories.py          40     11    72%
app/domain/licenciamento/value_objects.py         52      6    88%
app/domain/ouvidoria/__init__.py                   3      0   100%
app/domain/ouvidoria/entities.py                  67      7    90%
app/domain/ouvidoria/enums.py                     19      0   100%
app/domain/ouvidoria/repositories.py              23      6    74%
app/domain/ouvidoria/value_objects.py             16      2    88%
----------------------------------------------------------------------------
TOTAL                                           1193    156    87%
```
**Resultado: 87% de cobertura sobre a camada de Domínio (meta mínima superada de $\ge 85\%$).**

---

## 6. Conclusão
A Sprint QA-04 foi integralmente concluída com sucesso. O backend do VigiMinas conta agora com testes automatizados rápidos e robustos, transações isoladas e determinísticas, garantindo estabilidade e integridade funcional para as próximas etapas de auditoria de segurança e testes de carga.
