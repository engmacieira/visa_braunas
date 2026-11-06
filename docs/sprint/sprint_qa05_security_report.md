# Relatório Técnico Formal - Sprint QA-05: Hardening de Segurança, OWASP e Proteção de Borda

**Projeto:** Sistema VigiMinas - Vigilância Sanitária Municipal (Braúnas/MG)
**Ciclo:** Sprint QA-05
**Data:** Novembro de 2026
**Status:** Concluído com 100% de Aprovação

---

## 1. Sumário Executivo

A Sprint QA-05 estabeleceu o ciclo de hardening de segurança, proteção de borda e mitigação de vulnerabilidades OWASP no backend do VigiMinas. O objetivo central foi blindar a infraestrutura de API governamental contra os principais vetores de ataque cibernético:
- Força bruta de credenciais e scraping automatizado;
- Injeção de SQL (SQLi);
- Uploads maliciosos com adulteração de extensão (executáveis mascarados de PDF ou imagem);
- Falta de cabeçalhos de segurança defensivos (Clickjacking, MIME Sniffing, XSS);
- Vazamento de segredos criptográficos ou credenciais no código-fonte.

Todas as implementações foram integradas à arquitetura DDD (Domain-Driven Design) em FastAPI e SQLAlchemy 2.0, mantendo 100% de retrocompatibilidade com a suíte de testes legada (zero regressão).

---

## 2. Checklist de Mitigações OWASP Top 10

| Vulnerabilidade OWASP | Vetor Mitigado | Implementação Realizada no VigiMinas |
|---|---|---|
| **A01: Broken Access Control** | Manipulação não autorizada de parâmetros e rotas | RBAC estrito via `require_roles`, rate limiting por IP simulado e token JWT com algoritmo HS256 e tempo de expiração curto (60 minutos). |
| **A02: Cryptographic Failures** | Exposição de tráfego HTTP puro e senhas em texto | Redirecionamento HTTPS forçado (HTTP 307) em produção (`ENVIRONMENT == "production"`), injeção de HSTS com preload (`Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`), hashes bcrypt com salt aleatório em senhas e secrets carregados estritamente via variáveis de ambiente Pydantic. |
| **A03: Injection (SQLi)** | Evasão de autenticação ou leitura não autorizada de dados | Consultas em SQLAlchemy parametrizadas (`ilike(:param)` com bind parameters), ausência de concatenação crua em SQL e testes automatizados com injeções clássicas (`' OR 1=1 --`, `DROP TABLE`). |
| **A04: Insecure Design** | Submissão de arquivos perigosos disfarçados | Criação do `upload_validator.py` inspecionando determinísticamente os primeiros 2048 bytes (Magic Bytes) para garantir conformidade entre extensão e binário real (`%PDF-`, PNG, JPEG), acompanhado de reset de cursor (`await file.seek(0)`). |
| **A05: Security Misconfiguration** | Ausência de headers defensivos do navegador | `SecurityHeadersMiddleware` injetando `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: geolocation=(), camera=(), microphone=()` e `Content-Security-Policy`. Desativação de `/docs` e `/redoc` em ambiente de produção. |
| **A07: Identification and Authentication Failures** | Ataques de força bruta no endpoint de login | `slowapi.Limiter` configurado na rota `POST /api/v1/auth/login` limitando requisições a 5 por minuto por IP de origem, com resposta HTTP 429 Too Many Requests e cabeçalho `Retry-After`. |
| **A08: Software and Data Integrity Failures** | Payloads malformados ou com parâmetros fantasmas | Pydantic v2 configurado com `model_config = ConfigDict(extra='forbid')` nos DTOs de escrita mais sensíveis (`LoginDTO`, `UsuarioCreateDTO`, `EstabelecimentoCreateDTO`, `SubmeterRequerimentoInputDTO`, `EmitirAlvaraSanitarioInputDTO`). |

---

## 3. Arquitetura e Módulos Implementados

### 3.1. Headers de Segurança e HTTPS (`app/core/security_middleware.py`)
- Middleware ASGI baseado em `BaseHTTPMiddleware` aplicado globalmente no pipeline do FastAPI em `app/main.py`.
- Injeção obrigatória dos seguintes cabeçalhos defensivos em todas as respostas HTTP:
  - `X-Content-Type-Options: nosniff` (prevenção contra MIME confusion e XSS em assets)
  - `X-Frame-Options: DENY` (prevenção contra Clickjacking e iframes externos)
  - `Referrer-Policy: strict-origin-when-cross-origin` (proteção de dados de navegação)
  - `Permissions-Policy: geolocation=(), camera=(), microphone=()` (bloqueio de recursos de hardware do cliente)
  - `Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';` (política estrita de execução)
- Redirecionamento HTTPS condicional (`settings.is_production`) com injeção de HSTS:
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.

### 3.2. Rate Limiting de Borda (`app/core/limiter.py`)
- Implementado com a biblioteca `slowapi`, com extração do IP real do cliente via `x-forwarded-for` (indispensável para proxies reversos e clusters Docker/Kubernetes) com fallback para `request.client.host`.
- Regras de taxa aplicadas:
  - `POST /api/v1/auth/login`: **5 requisições por minuto** por IP (blindagem contra credential stuffing e força bruta).
  - `GET /api/v1/alvaras/validar/{codigo_autenticidade}`: **30 requisições por minuto** por IP (mitigação de scraping massivo do banco de licenças).
  - Limite global de fallback: **100 requisições por minuto** por IP.
- Handler customizado `_rate_limit_exceeded_custom_handler`:
  - Retorna status `HTTP 429 Too Many Requests`.
  - Corpo padronizado: `{"erro": "Muitas requisições (Rate limit exceeded)", "detail": "...", "codigo": "TAXA_LIMITE_EXCEDIDA"}`.
  - Cabeçalho defensivo obrigatório `Retry-After: 60`.

### 3.3. Validador Seguro de Uploads Binários (`app/core/upload_validator.py`)
- Função assíncrona `validate_uploaded_file(file: UploadFile, allowed_types: list[str], max_size_mb: int)`:
  - Verificação de extensão com whitelist restrita (`pdf`, `png`, `jpg`, `jpeg`).
  - Inspeção determinística dos primeiros 2048 bytes contra assinaturas Magic Bytes reais:
    - **PDF:** `b"%PDF-"`
    - **PNG:** `b"\x89PNG\r\n\x1a\n"`
    - **JPEG:** `b"\xff\xd8\xff"`
  - Reset obrigatório do ponteiro do arquivo (`await file.seek(0)`) logo após a leitura, prevenindo arquivos corrompidos ou vazios no downstream.
  - Verificação iterativa do tamanho total do arquivo em blocos de 64 KB, bloqueando arquivos que excedam o limite configurado (padrão de 10 MB).

### 3.4. Auditoria de Repositórios e Validação Estrita de DTOs
- Repositórios auditados: eliminação de concatenação dinâmica de strings em queries SQL. Todas as cláusulas com ILIKE utilizam `Model.campo.ilike(termo)` com bind variables gerenciadas pelo SQLAlchemy.
- Modelos DTO de escrita sensíveis blindados com `ConfigDict(extra='forbid')`:
  - `LoginDTO` e `UsuarioCreateDTO` (`app/application/auth/dtos.py`)
  - `EstabelecimentoCreateDTO` (`app/application/estabelecimentos/dtos.py`)
  - `SubmeterRequerimentoInputDTO` e `EmitirAlvaraSanitarioInputDTO` (`app/application/licenciamento/dtos.py`)

---

## 4. Resultados da Suíte de Testes Automatizados

Foram criados 4 novos módulos de testes dedicados a segurança cobrindo todas as frentes solicitadas:
- `tests/unit/security/test_security_headers.py`: 2 testes unitários (headers defensivos e comportamento HSTS/redirecionamento em produção).
- `tests/unit/security/test_upload_validator.py`: 7 testes unitários (PDF legítimo com seek(0), PNG/JPEG legítimos, bloqueio de scripts mascarados, bloqueio de executáveis PE, bloqueio de arquivos vazios, extensões não homologadas e limite de tamanho máximo).
- `tests/integration/api/test_rate_limiter.py`: 2 testes de integração (bloqueio na 6ª requisição com HTTP 429 + Retry-After e isolamento estrito de taxa entre IPs diferentes).
- `tests/integration/api/test_sqli_resilience.py`: 3 testes de integração (injeção SQL em estabelecimentos, busca de CNAEs e validação de autenticidade de alvarás).

### Resultado Consolidado do Pytest:
```
============================= 96 passed in 24.71s ==============================
- 82 testes pré-existentes da Sprint QA-04: 100% aprovados (zero regressão)
- 14 novos testes de segurança da Sprint QA-05: 100% aprovados
```

---

## 5. Conclusão

Com a conclusão da Sprint QA-05, o backend do VigiMinas atinge grau de maturidade em conformidade com o padrão OWASP Top 10, com barreiras sólidas de proteção em camada de borda, transporte e aplicação. O sistema encontra-se formalmente apto para avançar à Sprint QA-06 (Testes de Carga e Estresse) e à Sprint QA-07 (Infraestrutura de CI/CD).
