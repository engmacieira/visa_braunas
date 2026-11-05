# Registro de Dívidas Técnicas e Decisões de Contorno - VigiMinas

## 1. Visão Geral
Este documento consolida o registro formal de débitos técnicos identificados, saneados e monitorados no projeto VigiMinas ao longo das Sprints de Qualidade e Arquitetura.

---

## 2. Status das Pendências do Scaffolding Inicial (Sprint QA-02)
Todas as pendências técnicas deixadas durante a fase de scaffolding inicial (divididas nas Fases 1 a 6) foram **100% auditadas e saneadas**.

### Resumo por Bloco Funcional:

1. **Fundação e Infraestrutura:**
   - **Status:** Conforme / Sanado.
   - Pydantic Settings configurado exclusivamente via `from pydantic_settings import BaseSettings` (Pydantic v2).
   - Mapeamento declarativo SQLAlchemy 2.0 em `base_model.py` com `Mapped[uuid.UUID] = mapped_column(...)` e herança de `DeclarativeBase`.
   - Driver de migração do Alembic apontando para a conexão síncrona `DATABASE_URL_SYNC` (`psycopg2`).

2. **Autenticação, Isolamento e RBAC:**
   - **Status:** Conforme / Sanado.
   - Isolamento estrito do domínio `app/domain/auth/` com zero importações de bibliotecas externas (`sqlalchemy` ou `pydantic`).
   - Índices parciais no dialeto PostgreSQL (`uq_usuarios_cpf`, `uq_usuarios_email`) com filtro `WHERE is_deleted = FALSE`.
   - RBAC ativo no router de usuários restringindo criação, listagem e atualização para `admin_master` e `coordenador`, e exclusão lógica exclusiva para `admin_master`.

3. **Vínculos de CNAE e Cálculo de Risco:**
   - **Status:** Conforme / Sanado.
   - Chave estrangeira `cnae_id` em `EstabelecimentoCnaeModel` referenciando `cnaes.id` (UUID), mantendo `cnae_codigo` como cache legível.
   - Índice condicional `uq_estabelecimento_cnae_principal` garantindo unicidade de CNAE principal ativo por estabelecimento (`eh_principal = TRUE AND is_deleted = FALSE`).
   - Serviço de domínio `CalculadoraRiscoSanitarioService` com estrita observância da hierarquia: Risco III > Risco II > Risco I > Dispensado.

4. **Fiscalização, VAPT e Notificações:**
   - **Status:** Conforme / Sanado.
   - Invariantes de negócio da entidade `Inspecao` impedem conclusão de vistorias com motivo `vapt_trabalhador` sem preenchimento dos campos `nome_local_trabalho` e `principais_riscos_identificados`.
   - Índice condicional `idx_inspecoes_prazos_pendentes` mapeado com filtros `resultado = 'notificado_com_prazo' AND is_deleted = FALSE AND is_active = TRUE`.
   - Campos flexíveis `checklist_respostas` e `relatorio_fotografico` mapeados como `JSONB` no SQLAlchemy e `dict`/`list` no Pydantic DTOs.

5. **Licenciamento, Sincronismo e QR Code:**
   - **Status:** Conforme / Sanado.
   - Função e trigger `fn_sincronizar_alvara_estabelecimento` presentes em DDL SQL puro na migration `004_licenciamento_denuncias.py`, sincronizando `numero_alvara`, `data_validade_alvara` e `situacao_alvara = 'Válido'` em `estabelecimentos`.
   - Resolução explícita da Foreign Key retardada `fk_inspecoes_denuncias` na migration `004_licenciamento_denuncias.py`.
   - Rota `GET /api/v1/alvaras/validar/{codigo_autenticidade}` auditada como 100% pública (dispensa Bearer JWT).

6. **Indicadores Analíticos e Transição Frontend:**
   - **Status:** Conforme / Sanado.
   - `IndicadoresReadRepository` utiliza consultas agregadas (`func.count()`) e leitura de views SQL dedicadas (`vw_indicador_11_vapt_consolidado`, `vw_estabelecimentos_risco_consolidado`), eliminando riscos de N+1.
   - Contratos TypeScript em `frontend/src/types/apiContracts.ts` mantêm paridade integral com os modelos de domínio e schemas Pydantic.
   - Integração frontend em `frontend/src/services/vigiminasApi.ts` desacoplada de Firestore/Firebase, operando 100% via REST com `apiClient`.

---

## 3. Débitos Técnicos Residuais e Pontos de Atenção Futuros

1. **Seeds e Fixtures de Integração para Banco de Dados Ativo:**
   - *Contexto:* Os testes atuais executam validações de schema, AST, regras de negócio e DTOs em memória / offline.
   - *Ação Futura:* Criar scripts de seed consistentes com massa de dados de teste (município piloto de Braúnas) para execução de testes de integração ponta a ponta com o banco PostgreSQL ativo em contêiner.

2. **Geração Física de PDF do Alvará Sanitário e Termo de Vistoria:**
   - *Contexto:* Os endpoints registram a URL/caminho dos arquivos (`url_alvara_pdf`, `url_termo_assinado_pdf`), mas o gerador de PDF oficial com assinatura digital/QR Code embutido será conectado na sprint de expedição documental.
   - *Ação Futura:* Implementar gerador de laudos PDF com biblioteca headless ou WeasyPrint.
