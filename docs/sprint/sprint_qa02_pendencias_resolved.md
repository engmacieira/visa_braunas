# Relatório de Conclusão da Sprint QA-02: Resolução de Débitos Arquiteturais e Invariantes de Domínio

**Auditor / Engenheiro Responsável:** Jules (Software Engineer Agent)
**Data:** Novembro de 2026
**Sistema:** VigiMinas (Vigilância Sanitária Municipal)
**Status da Sprint:** 100% Concluída com Sucesso

---

## 1. Sumário Executivo

A Sprint QA-02 teve como objetivo auditar minuciosamente e sanar os débitos arquiteturais e pendências de domínio herdados do scaffolding inicial do sistema VigiMinas, agrupados em 6 blocos funcionais (Fases 1 a 6).

Todos os requisitos e checagens arquiteturais foram validados no código-fonte, garantindo isolamento estrito de domínio, integridade referencial, índices únicos condicionais no dialeto PostgreSQL, regras de negócio e tipagens entre backend e frontend.

---

## 2. Detalhamento das Validações e Correções por Bloco

### Bloco 1: Fundação e Infraestrutura
- **Pydantic v2 BaseSettings:** Confirmada a importação exclusiva de `from pydantic_settings import BaseSettings` em `app/core/config.py`.
- **Mapeamento Declarativo SQLAlchemy 2.0:** Confirmado em `app/infrastructure/base_model.py` o uso de `Mapped[uuid.UUID] = mapped_column(...)` e herança direta de `DeclarativeBase`.
- **Driver de Migração do Alembic:** Confirmado em `alembic/env.py` o direcionamento para a URL síncrona `settings.DATABASE_URL_SYNC` (`psycopg2`), garantindo suporte adequado a autogenerate e migrações DDL.

### Bloco 2: Autenticação, Isolamento e RBAC
- **Isolamento de Domínio:** Inspecionado o pacote `app/domain/auth/` via análise sintática abstrata (AST), confirmando 0 importações de bibliotecas de framework ou ORM (`sqlalchemy`, `pydantic`).
- **Índices Parciais no PostgreSQL:** Validada a definição dos índices únicos condicionais `uq_usuarios_cpf` e `uq_usuarios_email` com `postgresql_where=text("is_deleted = FALSE")`.
- **RBAC no FastAPI:** Verificado o roteador de usuários (`app/presentation/routers/usuarios_router.py`), confirmando que criação e alteração exigem `require_gestor` (`admin_master` ou `coordenador`) e exclusão lógica exige `require_admin_only` (`admin_master`).

### Bloco 3: Vínculos de CNAE e Cálculo de Risco
- **Associação N:N de CNAEs:** Confirmada no modelo `EstabelecimentoCnaeModel` a existência da chave estrangeira `cnae_id` apontando para o UUID substituto `cnaes.id`, mantendo a coluna `cnae_codigo` apenas como cache legível de leitura.
- **Índice Condicional de CNAE Principal:** Validado o índice `uq_estabelecimento_cnae_principal` com a cláusula parcial `eh_principal = TRUE AND is_deleted = FALSE`.
- **Precedência do Risco Sanitário:** Testado e validado o serviço `CalculadoraRiscoSanitarioService` com a ordem hierárquica oficial: Risco III > Risco II > Risco I > Dispensado.

### Bloco 4: Fiscalização, VAPT e Notificações
- **Invariantes do Indicador 11 (VAPT):** Validada a entidade `Inspecao`, confirmando que vistorias com motivo `vapt_trabalhador` e status `concluida` ou `em_andamento` exigem obrigatoriamente `nome_local_trabalho` e `principais_riscos_identificados`, disparando `InvarianteInspecaoException` em caso de ausência.
- **Índice Condicional de Prazos Pendentes:** Confirmado o índice `idx_inspecoes_prazos_pendentes` no modelo `InspecaoModel` com o filtro parcial `resultado = 'notificado_com_prazo' AND is_deleted = FALSE AND is_active = TRUE`.
- **Campos Flexíveis:** Mapeamento de `checklist_respostas` e `relatorio_fotografico` como `JSONB` no SQLAlchemy e `dict` / `list` nos schemas Pydantic DTO.

### Bloco 5: Licenciamento, Sincronismo e QR Code
- **Função e Trigger de Sincronização:** Confirmado o script de migration `alembic/versions/004_licenciamento_denuncias.py` contendo o DDL SQL puro de `fn_sincronizar_alvara_estabelecimento()` e do trigger `trg_alvara_sincroniza_estabelecimento`, sincronizando `numero_alvara`, `data_validade_alvara` e `situacao_alvara = 'Válido'` na tabela `estabelecimentos`.
- **Chave Estrangeira Retardada:** Confirmada a instrução `op.create_foreign_key('fk_inspecoes_denuncias', ...)` na migration 004, fechando a dependência entre inspeções e denúncias.
- **Endpoint Público de Autenticidade:** Confirmado que o endpoint `GET /api/v1/alvaras/validar/{codigo_autenticidade}` é 100% público e dispensa autenticação JWT, permitindo validação rápida via QR Code.

### Bloco 6: Indicadores Analíticos e Transição Frontend
- **Consultas sem N+1:** Confirmado em `IndicadoresReadRepository` o uso de funções de agregação direta (`func.count()`) e leitura otimizada das views SQL (`vw_indicador_11_vapt_consolidado` e `vw_estabelecimentos_risco_consolidado`).
- **Espelhamento de Tipos no Frontend:** Auditado o arquivo `frontend/src/types/apiContracts.ts`, validando total conformidade com os tipos do backend.
- **Desacoplamento do Firestore:** Confirmado que `frontend/src/services/vigiminasApi.ts` comunica-se exclusivamente com a API REST através de `apiClient`, com 0 dependências ou chamadas de SDK do Firebase/Firestore.

---

## 3. Ajustes Arquiteturais Realizados
Durante a auditoria, foram corrigidos alinhamentos modulares para manter a conformidade com DDD:
1. Extração dos enumeradores `StatusAlvara`, `StatusRequerimento` e `TipoSolicitacaoAlvara` para `app/domain/licenciamento/enums.py`.
2. Extração dos enumeradores `CanalDenuncia`, `GravidadeDenuncia` e `StatusDenuncia` para `app/domain/ouvidoria/enums.py`.
3. Extração do Value Object `NumeroProtocoloDenuncia` para `app/domain/ouvidoria/value_objects.py`.

---

## 4. Evidências de Testes

Criada a suíte `tests/test_qa02_pendencias.py` com 10 testes dedicados. Execução completa dos testes:

```bash
$ python -m pytest tests/ -vv
============================= test session starts ==============================
collected 15 items

tests/test_qa02_pendencias.py::test_pydantic_settings_v2_and_sync_driver PASSED [  6%]
tests/test_qa02_pendencias.py::test_domain_auth_strict_isolation PASSED  [ 13%]
tests/test_qa02_pendencias.py::test_auth_partial_unique_indexes PASSED   [ 20%]
tests/test_qa02_pendencias.py::test_rbac_usuarios_routes PASSED          [ 26%]
tests/test_qa02_pendencias.py::test_estabelecimento_cnae_foreign_key_and_partial_index PASSED [ 33%]
tests/test_qa02_pendencias.py::test_calculadora_risco_precedencia PASSED [ 40%]
tests/test_qa02_pendencias.py::test_inspecao_vapt_invariants PASSED      [ 46%]
tests/test_qa02_pendencias.py::test_inspecoes_indices_e_tipos_flexiveis PASSED [ 53%]
tests/test_qa02_pendencias.py::test_licenciamento_trigger_migration_and_public_validation_route PASSED [ 60%]
tests/test_qa02_pendencias.py::test_indicadores_views_usage_and_frontend_decoupling PASSED [ 66%]
tests/test_schema_parity.py::test_all_expected_tables_registered PASSED  [ 73%]
tests/test_schema_parity.py::test_soft_delete_universal PASSED           [ 80%]
tests/test_schema_parity.py::test_primary_keys_standardization PASSED    [ 86%]
tests/test_schema_parity.py::test_conditional_unique_indexes_parity PASSED [ 93%]
tests/test_schema_parity.py::test_views_and_triggers_in_sql_artifacts PASSED [100%]

============================== 15 passed in 1.67s ==============================
```

Validação de linter:
```bash
$ ruff check app/domain/licenciamento/ app/domain/ouvidoria/ tests/test_qa02_pendencias.py
All checks passed!
```

---

## 5. Conclusão
A Sprint QA-02 foi finalizada com sucesso. Todos os débitos técnicos e invariantes de domínio foram sanados e cobertos por testes unitários e de integração estrutural.
