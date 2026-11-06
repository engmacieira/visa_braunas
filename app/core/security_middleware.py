"""
Middleware de Cabeçalhos de Segurança e Proteção HTTPS / HSTS.
Sprint QA-05 - VigiMinas.
"""
from typing import Callable
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import RedirectResponse, Response

from app.core.config import settings


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Middleware defensivo de cabeçalhos HTTP alinhado com as recomendações da OWASP:
    - X-Content-Type-Options: nosniff
    - X-Frame-Options: DENY
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: geolocation=(), camera=(), microphone=()
    - Content-Security-Policy: default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
    - Strict-Transport-Security: max-age=31536000; includeSubDomains; preload (apenas em produção)
    - Redirecionamento forçado para HTTPS quando ENVIRONMENT == "production"
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Em ambiente de produção, força HTTPS caso a requisição chegue em HTTP puro
        if settings.is_production:
            # Verifica o schema direto da URL ou via proxy reverso (X-Forwarded-Proto)
            proto = request.headers.get("x-forwarded-proto", request.url.scheme).lower()
            if proto == "http":
                secure_url = request.url.replace(scheme="https")
                return RedirectResponse(
                    url=str(secure_url),
                    status_code=307,
                )

        response: Response = await call_next(request)

        # Injeção dos cabeçalhos defensivos mandatórios
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
        )

        # HSTS apenas em ambiente de produção para não quebrar testes locais sem TLS
        if settings.is_production:
            response.headers["Strict-Transport-Security"] = (
                "max-age=31536000; includeSubDomains; preload"
            )

        return response
