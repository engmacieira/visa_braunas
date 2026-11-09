# Relatório Técnico - Sprint QA-08: Fonte Única de Verdade (SSOT), Limpeza DRY de Constantes e Endpoint de Metadados

## 1. Visão Geral e Contexto da Sprint
Com a esteira de CI/CD e rotinas de contingência em andamento (Sprint QA-07) e o frontend alinhado no padrão SSOT (Sprint FE-07), a **Sprint QA-08** realizou uma auditoria rigorosa de código limpo no backend **VigiMinas** (Sistema de Vigilância Sanitária Municipal de Braúnas/MG).

O objetivo principal foi transformar o backend na SSOT (Single Source of Truth) para versões, metadados institucionais, prazos regulatórios e rotas, eliminando magic strings, magic numbers e valores duplicados espalhados pelos routers, repositórios, serviços e suítes de teste.

---

## 2. Centralização de Configurações e Constantes (`app/core/`)

### 2.1. Configurações Globais (`app/core/config.py`)
Centralização de variáveis institucionais e operacionais na classe `Settings`:
- `PROJECT_NAME`: `"VigiMinas"`
- `APP_VERSION`: `"1.0.0"`
- `APP_DESCRIPTION`: `"Backend oficial do Sistema VigiMinas - Vigilância Sanitária Municipal (DDD, FastAPI, SQLAlchemy 2.0)"`
- `ENVIRONMENT`: `"development"` (com detecção dinâmica de ambiente de produção via propriedade `is_production`)
- `API_V1_STR`: `"/api/v1"` (prefixo padronizado para todos os routers da API v1)
- `MUNICIPIO_PADRAO`: `"Braúnas"`
- `UF_PADRAO`: `"MG"`

### 2.2. Constantes Globais de Negócio e Infraestrutura (`app/core/constants.py`)
Criação do módulo dedicado `app/core/constants.py` para erradicar literais soltos e magic values:
- **Prazos Regulatórios e Sanitários**:
  - `PRAZO_VALIDADE_ALVARA_DIAS = 365` (Validade padrão de 12 meses do Alvará Sanitário).
  - `PRAZO_PADRAO_NOTIFICACAO_DIAS = 30` (Prazo regulamentar padrão para cumprimento de termos de notificação).
  - `DIAS_MES_COMERCIAL = 30.4167` (Constante de conversão de meses para dias).
- **Limites e Tamanhos de Upload Binário**:
  - `MAX_UPLOAD_SIZE_MB = 10`
  - `MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024` (10 MB).
  - `UPLOAD_MAGIC_BYTES_INSPECTION_BUFFER = 2048` (Buffer seguro para inspeção de cabeçalho).
  - `UPLOAD_CHUNK_SIZE_BYTES = 64 * 1024` (Chunk de leitura sem estourar memória RAM).
- **Formatos Padronizados de Data/Hora**:
  - `DATE_FORMAT_BR = "%d/%m/%Y"`
  - `DATETIME_FORMAT_BR = "%d/%m/%Y %H:%M:%S"`
  - `DATETIME_FORMAT_ISO = "%Y-%m-%dT%H:%M:%SZ"`
- **Cabeçalhos HTTP Customizados**:
  - `HEADER_RESPONSE_TIME = "X-Response-Time"`
  - `HEADER_FORWARDED_FOR = "x-forwarded-for"`
  - `HEADER_FORWARDED_PROTO = "x-forwarded-proto"`
- **Taxas de Rate Limiting**:
  - `RATE_LIMIT_DEFAULT = "100/minute"`
  - `RATE_LIMIT_LOGIN = "5/minute"`
  - `RATE_LIMIT_PUBLIC = "30/minute"`
  - `RATE_LIMIT_RETRY_AFTER_SECONDS = "60"`
- **Status de Telemetria e Monitoramento**:
  - `STATUS_OPERACIONAL = "operacional"`
  - `STATUS_HEALTHY = "healthy"`
  - `STATUS_DEGRADED = "degraded"`
  - `STATUS_ONLINE = "online"`
  - `STATUS_OFFLINE = "offline"`

---

## 3. Contrato de Metadados e Telemetria Operacional

### 3.1. Endpoint `GET /api/v1/system/info` (`app/presentation/routers/system_router.py`)
Implementado para permitir que o frontend e sistemas de monitoramento consultem em tempo de execução o status e versão da API.

#### Contrato Pydantic (`SystemInfoResponseDTO`):
```json
{
  "sistema": "VigiMinas",
  "versao": "1.0.0",
  "ambiente": "development",
  "municipio": "Braúnas",
  "uf": "MG",
  "status": "operacional",
  "database_connected": true,
  "timestamp": "2026-11-09T12:00:00Z"
}
```

#### Características Técnicas:
- **Resiliência na Checagem do Banco**: Executa `SELECT 1` assíncrono via `async_engine`. Em caso de indisponibilidade transitória ou falha de conexão, não bloqueia o retorno HTTP 200, retornando `database_connected: false` de maneira segura e informativa.
- **Roteamento Unificado**: Incluído em `app/main.py` sob o prefixo `settings.API_V1_STR`.

---

## 4. Auditoria e Limpeza DRY nos Routers e Casos de Uso

1. **`app/main.py`**:
   - Inicialização do `FastAPI` consome `settings.PROJECT_NAME`, `settings.APP_DESCRIPTION` e `settings.APP_VERSION`.
   - Inclusão de todos os routers da API sob o prefixo dinâmico `settings.API_V1_STR`.
   - Rotas raiz `GET /` e `GET /health` refatoradas para consumir `settings.*` e constantes operacionais (`STATUS_OPERACIONAL`, `STATUS_HEALTHY`, etc.).

2. **`app/application/licenciamento/use_cases/emitir_alvara.py`**:
   - Substituição do magic number `365` por `PRAZO_VALIDADE_ALVARA_DIAS` e da taxa de conversão mensal por `DIAS_MES_COMERCIAL`.

3. **`app/core/upload_validator.py`**:
   - Substituição de literais soltos de tamanho (`10`, `2048`, `64 KB`) pelas constantes `MAX_UPLOAD_SIZE_MB`, `UPLOAD_MAGIC_BYTES_INSPECTION_BUFFER` e `UPLOAD_CHUNK_SIZE_BYTES`.

4. **`app/core/latency_middleware.py`**:
   - Injeção de cabeçalho baseada na constante `HEADER_RESPONSE_TIME`.

5. **`app/core/limiter.py` & Routers (`auth_router.py`, `licenciamento_router.py`)**:
   - Taxas de rate limiting vinculadas a `RATE_LIMIT_DEFAULT`, `RATE_LIMIT_LOGIN` e `RATE_LIMIT_PUBLIC`.

6. **Routers com RBAC (`licenciamento_router.py`, `ouvidoria_router.py`, `indicadores_router.py`)**:
   - Substituição de strings literais soltas nas dependências de autorização (`"admin_master"`, `"coordenador"`, `"fiscal_tecnico"`) por membros canônicos do Enum de domínio `PerfilUsuario`.

---

## 5. Validação da Suíte de Testes Automatizados

### 5.1. Novos Testes Desenvolvidos:
- **`tests/unit/presentation/test_system_router.py`**:
  - `test_system_info_endpoint_sucesso`: Valida status 200, campos obrigatórios e paridade com `settings`.
  - `test_system_info_database_offline`: Valida degradação graciosa com banco offline (`database_connected == False`).
- **`tests/unit/presentation/test_root_metadata.py`**:
  - `test_root_metadata`: Valida endpoint `GET /` refletindo `settings.PROJECT_NAME`, `settings.APP_VERSION` e `settings.ENVIRONMENT`.
  - `test_health_check_endpoint`: Valida endpoint `GET /health` e status operacional.

### 5.2. Resultado da Suíte Pytest:
- **Total de Testes Executados**: 103 testes.
- **Taxa de Sucesso**: 100% aprovados (zero regressões).
- **Tempo de Execução**: ~25 segundos.

---

## 6. Conclusão
A sprint **QA-08** estabelece o backend do **VigiMinas** como a Fonte Única de Verdade (SSOT) para toda a stack, eliminando magic values e redundâncias, além de fornecer um contrato transparente e dinâmico de metadados operacionais (`/api/v1/system/info`) para consumo pelo frontend e monitoramento da infraestrutura municipal de Braúnas/MG.
