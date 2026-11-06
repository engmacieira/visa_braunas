# Relatório de Conclusão da Sprint QA-03: Carga Inicial, Fixtures Realistas e Mecanismo Idempotente de Seeds (Braúnas/MG)

**Auditor / Engenheiro Responsável:** Jules (Software Engineer Agent)
**Data:** Novembro de 2026
**Sistema:** VigiMinas (Vigilância Sanitária Municipal)
**Status da Sprint:** 100% Concluída com Sucesso

---

## 1. Sumário Executivo

Com as pendências de arquitetura e regras de domínio 100% resolvidas e testadas na Sprint QA-02, a Sprint QA-03 teve como objetivo desenvolver um mecanismo modular, seguro e estritamente idempotente de carga inicial de dados (seeds). Esse mecanismo serve tanto para abastecer bancos de dados em ambientes de desenvolvimento, homologação e produção via linha de comandos (CLI), quanto para fornecer fixtures reutilizáveis para a suíte de testes automatizados do Pytest, pavimentando as bases para a Sprint QA-04 (testes de integração ponta a ponta) e Sprint QA-06 (testes de carga K6).

O conjunto de dados parametrizado reflete com fidelidade a realidade regulatória, sanitária e institucional do município de **Braúnas/MG** (CEP 35.189-000, CNPJ Institucional 18.303.187/0001-44).

---

## 2. Diretrizes e Regras de Ouro Atendidas

1. **Idempotência Estrita:**
   - O comando de seed pode ser executado consecutivas vezes sem duplicar registros, gerar conflitos de índices únicos parciais (`uq_*`) ou corromper dados existentes.
   - Cada inserção realiza consulta prévia pela chave natural ou código regulatório vigente (`WHERE is_deleted = FALSE`). Em caso de registro já existente, a entidade é reaproveitada nos relacionamentos subsequentes e contabilizada como ignorada/mantida no relatório de auditoria.
   - Em testes de execução dupla consecutiva, a primeira execução gera 62 novos registros (0 ignorados) e a segunda execução gera 0 novos registros e 62 ignorados, mantendo invariante a contagem exata das tabelas.

2. **Realidade Regulatória de Braúnas/MG:**
   - Configuração institucional oficial: Município de Braúnas, UF MG, CEP 35.189-000, Prefeitura Municipal de Braúnas, Secretaria Municipal de Saúde, Coordenação de Vigilância em Saúde e Vigilância Sanitária, CNPJ 18.303.187/0001-44 e Singleton key = 1.
   - Logradouros autênticos de Braúnas/MG: Av. Juscelino Kubitschek, Rua Minas Gerais, Praça da Matriz, Rua São Vicente, Rua Getúlio Vargas, Rua Bahia.

3. **Isolamento e Segurança (Hashing Obrigatório):**
   - As senhas dos utilizadores passam estritamente pela função `get_password_hash` com algoritmo bcrypt (rounds=12) via `app.core.security`. Nenhuma credencial é persistida em texto puro.

4. **Atendimento ao Soft Delete:**
   - Todos os 62 registros semeados nascem com `is_active = True` e `is_deleted = False`, satisfazendo a Regra de Ouro da arquitetura VigiMinas.

---

## 3. Inventário dos Dados Semeados (62 Registros)

### 3.1. Configuração Institucional (Singleton)
- **ID / Singleton Key:** 1
- **Ente:** Prefeitura Municipal de Braúnas
- **Secretaria:** Secretaria Municipal de Saúde
- **Setor VISA:** Coordenação de Vigilância em Saúde e Vigilância Sanitária
- **CNPJ Oficial:** 18.303.187/0001-44
- **Endereço Sede:** Av. Juscelino Kubitschek, 100, Centro - CEP: 35.189-000

### 3.2. Utilizadores e Servidores Iniciais (5 Contas)
| E-mail | Nome | Perfil | Matrícula / Portaria |
|---|---|---|---|
| `admin@braunas.mg.gov.br` | Administrador Master do Sistema | `admin_master` | ADM-001 (Decreto nº 001/2024) |
| `coordenador.visa@braunas.mg.gov.br` | Carlos Eduardo de Paula | `coordenador` | CRD-2024 (Portaria nº 045/2024) |
| `fiscal1.visa@braunas.mg.gov.br` | Mariana Souza Silveira | `fiscal_tecnico` | FISC-101 (Portaria Municipal nº 123/2024) |
| `fiscal2.visa@braunas.mg.gov.br` | Rodrigo Silva Drumond | `fiscal_tecnico` | FISC-102 (Portaria Municipal nº 124/2024) |
| `digitador.visa@braunas.mg.gov.br` | Ana Luiza Pereira | `digitador` | DIG-301 (Portaria Municipal nº 150/2024) |

### 3.3. Metas do Exercício de 2026 (Pactuações Anuais)
- **Ano de Exercício:** 2026 (`is_active = True`, `is_deleted = False`)
- **Indicador 11 (VAPT - Saúde do Trabalhador):** 12 inspeções anuais pactuadas
- **Indicadores 12 a 15 (Cobertura Sanitária):** 100.00% para Riscos I, II e III
- **Prazos Padrão:** Alvará = 365 dias, Notificação Sanitária = 30 dias

### 3.4. Catálogo de Tipos de Documentos Regulatórios (6 Tipos)
1. `ALVARA_SANITARIO` (licenciamento, validade 12 meses, exige órgão e RT emissor)
2. `LIMPEZA_CAIXA_AGUA` (infraestrutura_saneamento, validade 6 meses, exige órgão emissor)
3. `CONTROLE_PRAGAS_VETORES` (controle_ambiental, validade 6 meses, exige RT emissor)
4. `PGRSS` (controle_ambiental, validade 12 meses, exige RT emissor)
5. `LIVRO_REGISTRO_ESPECIAIS` (gestao_qualidade, validade indeterminada)
6. `CERTIFICADO_CURSO_MANIPULADORES` (habilitacao_profissional, validade 12 meses)

### 3.5. Catálogo de CNAEs Sanitários Típicos (10 Subclasses)
1. `4711-3/02` - Supermercados (Risco III, Municipal, Exige RT, Exige Projeto)
2. `4771-7/01` - Comércio varejista de medicamentos/Farmácias (Risco III, Municipal, Exige RT, Exige Projeto)
3. `1091-1/02` - Padaria e confeitaria com produção própria (Risco II, Municipal)
4. `5611-2/01` - Restaurantes e similares (Risco II, Municipal)
5. `5611-2/03` - Lanchonetes, casas de chá e similares (Risco II, Municipal)
6. `8630-5/04` - Atividade odontológica (Risco III, Municipal, Exige RT, Exige Projeto)
7. `9602-5/01` - Cabeleireiros, manicure e pedicure (Risco I, Municipal)
8. `4722-9/01` - Comércio varejista de carnes / Açougues (Risco II, Municipal)
9. `4520-0/01` - Reparação mecânica de veículos (Risco I, Municipal)
10. `4789-0/99` - Comércio varejista de outros produtos (Dispensado, Municipal)

### 3.6. Estabelecimentos, Representantes, RTs e Vínculos (6 Empresas Modeladas)
- **Risco III (2 Estabelecimentos):**
  * `Drogaria Braúnas Popular Ltda` (CNPJ 11.222.333/0001-44) - CNAE 4771-7/01 com Responsável Técnica Titular Farmacêutica ativa (Dra. Camila Nogueira Guimarães - CRF/MG 24890), funcionário e fornecedor de medicamentos cadastrados.
  * `Supermercado Central de Braúnas Ltda` (CNPJ 22.333.444/0001-55) - CNAE 4711-3/02, 2 funcionários (incluindo manipulador de carnes) e fornecedor frigorífico.
- **Risco II (2 Estabelecimentos):**
  * `Padaria e Confeitaria Tradição de Minas Eireli` (CNPJ 33.444.555/0001-66) - CNAE 1091-1/02 com padeiro chefe manipulador e moinho fornecedor.
  * `Restaurante Sabor da Vila Braúnas Ltda` (CNPJ 44.555.666/0001-77) - CNAE 5611-2/01 com cozinheira manipuladora e fornecedor hortifrúti.
- **Risco I e Dispensado (2 Estabelecimentos):**
  * `Juliana Cristina Ramos Salão de Beleza ME` (CNPJ 55.666.777/0001-88) - CNAE 9602-5/01, assistente e distribuidora de cosméticos.
  * `Braúnas Utilidades e Variedades ME` (CNPJ 66.777.888/0001-99) - CNAE 4789-0/99, atendente e atacadista de plásticos.

### 3.7. Casos Operacionais para Testes
- **Inspeção VAPT (Saúde do Trabalhador - Indicador 11):** Termo nº `VAPT-2026/001`, status `concluida`, resultado `aprovado_com_exigencias`, local de trabalho e riscos identificados preenchidos.
- **Inspeção de Rotina Notificada:** Termo nº `TERM-2026/002`, status `concluida`, resultado `notificado_com_prazo`, com exigência de telas milimétricas e prazo de 30 dias ativo.
- **Alvará Sanitário Ativo:** Alvará nº `001/2026` com Código de Autenticidade `BRN2026A-2026` (padrão `XXXXXXXX-YYYY`), emitido para a drogaria, sincronizado na tabela estabelecimentos.
- **Denúncia Ouvidoria:** Protocolo nº `DEN-2026-0001`, origem `formulario_web`, status `recebida`, gravidade `media`, pendente na fila de triagem da vigilância.

---

## 4. Entregáveis de Código

1. **Módulo CLI de Seed:** `app/infrastructure/seeds.py`
   - Suporte a execução CLI direta: `python -m app.infrastructure.seeds`.
   - Logging estruturado com contadores precisos de criados versus ignorados.
2. **Fixtures Reaproveitáveis:** `tests/fixtures/seed_fixtures.py` e `tests/fixtures/__init__.py`
   - Fixtures assíncronas (`async_db_session`, `seeded_db_session`, `seed_counters`) prontas para testes unitários e de integração (Sprint QA-04).
3. **Suíte de Testes Automatizados de Idempotência:** `tests/test_qa03_seeds.py`
   - 8 testes cobrindo execução dupla consecutiva, integridade de senhas, invariantes de soft delete e requisitos regulatórios.
4. **Configuração de Ambiente de Teste:** `pytest.ini`
   - Configuração de `asyncio_mode = auto` e escopo `function` para o event loop.

---

## 5. Evidência de Execução dos Testes

Execução completa da suíte de testes do projeto VigiMinas:

```bash
$ python -m pytest tests/ -v
============================= test session starts ==============================
platform linux -- Python 3.12.13, pytest-9.2.0, pluggy-1.7.0 -- /home/jules/.pyenv/versions/3.12.13/bin/python
cachedir: .pytest_cache
rootdir: /app
configfile: pytest.ini
plugins: asyncio-1.4.1.post1, anyio-4.16.0
asyncio: mode=Mode.AUTO, debug=False, asyncio_default_fixture_loop_scope=function, asyncio_default_test_loop_scope=function
collecting ... collected 23 items

tests/test_qa02_pendencias.py::test_pydantic_settings_v2_and_sync_driver PASSED [  4%]
tests/test_qa02_pendencias.py::test_domain_auth_strict_isolation PASSED  [  8%]
tests/test_qa02_pendencias.py::test_auth_partial_unique_indexes PASSED   [ 13%]
tests/test_qa02_pendencias.py::test_rbac_usuarios_routes PASSED          [ 17%]
tests/test_qa02_pendencias.py::test_estabelecimento_cnae_foreign_key_and_partial_index PASSED [ 21%]
tests/test_qa02_pendencias.py::test_calculadora_risco_precedencia PASSED [ 26%]
tests/test_qa02_pendencias.py::test_inspecao_vapt_invariants PASSED      [ 30%]
tests/test_qa02_pendencias.py::test_inspecoes_indices_e_tipos_flexiveis PASSED [ 34%]
tests/test_qa02_pendencias.py::test_licenciamento_trigger_migration_and_public_validation_route PASSED [ 39%]
tests/test_qa02_pendencias.py::test_indicadores_views_usage_and_frontend_decoupling PASSED [ 43%]
tests/test_qa03_seeds.py::test_seed_idempotencia_execucao_dupla PASSED   [ 47%]
tests/test_qa03_seeds.py::test_configuracao_institucional_braunas PASSED [ 52%]
tests/test_qa03_seeds.py::test_usuarios_servidores_seguranca_senhas PASSED [ 56%]
tests/test_qa03_seeds.py::test_metas_exercicio_2026 PASSED               [ 60%]
tests/test_qa03_seeds.py::test_catalogo_tipos_documentos PASSED          [ 65%]
tests/test_qa03_seeds.py::test_catalogo_cnaes PASSED                     [ 69%]
tests/test_qa03_seeds.py::test_estabelecimentos_representantes_rts_vinculos PASSED [ 73%]
tests/test_qa03_seeds.py::test_casos_operacionais_inspecoes_alvara_denuncia PASSED [ 78%]
tests/test_schema_parity.py::test_all_expected_tables_registered PASSED  [ 82%]
tests/test_schema_parity.py::test_soft_delete_universal PASSED           [ 86%]
tests/test_schema_parity.py::test_primary_keys_standardization PASSED    [ 91%]
tests/test_schema_parity.py::test_conditional_unique_indexes_parity PASSED [ 95%]
tests/test_schema_parity.py::test_views_and_triggers_in_sql_artifacts PASSED [100%]

============================= 23 passed in 19.98s ==============================
```

---

## 6. Conclusão

A Sprint QA-03 foi concluída com êxito pleno. A base de dados dispõe agora de um ecossistema completo de sementes idempotentes, seguro, auditável e aderente às particularidades de Braúnas/MG, com suporte integrado a execuções via CLI e injeção transparente de fixtures para as próximas sprints de QA.
