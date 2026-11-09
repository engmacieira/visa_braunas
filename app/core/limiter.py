"""
Configuração do Rate Limiter com SlowAPI.
Sprint QA-05 - VigiMinas.
"""
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from starlette.requests import Request
from starlette.responses import JSONResponse


def get_real_client_ip(request: Request) -> str:
    """
    Obtém o IP real do cliente inspecionando X-Forwarded-For antes do request.client.
    Crucial para balanceadores de carga, proxies reversos e testes com IP mockado.
    """
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "127.0.0.1"


from app.core.constants import RATE_LIMIT_DEFAULT, RATE_LIMIT_RETRY_AFTER_SECONDS


def _rate_limit_exceeded_custom_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """
    Handler padronizado de RateLimitExceeded que retorna HTTP 429 Too Many Requests
    em JSON explicativo e com cabeçalho Retry-After.
    """
    # SlowAPI exc pode conter limite no formato exc.detail
    return JSONResponse(
        status_code=429,
        content={
            "erro": "Muitas requisições (Rate limit exceeded)",
            "detail": f"Limite de requisições excedido: {exc.detail}",
            "codigo": "TAXA_LIMITE_EXCEDIDA",
        },
        headers={"Retry-After": RATE_LIMIT_RETRY_AFTER_SECONDS},
    )


# Instância global do Limiter com fallback default de RATE_LIMIT_DEFAULT (100/minute)
# Nota: headers_enabled=False evita que o decorador do slowapi exija que o endpoint
# retorne diretamente um Response ou declare o parâmetro response: Response quando
# o FastAPI retorna um DTO pydantic serializado automaticamente pelo framework.
# Os headers de rate limit em 429 continuam sendo injetados via custom handler (Retry-After).
limiter = Limiter(
    key_func=get_real_client_ip,
    default_limits=[RATE_LIMIT_DEFAULT],
    headers_enabled=False,
)
