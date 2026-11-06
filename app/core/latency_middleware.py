import json
import logging
import time
from datetime import datetime, timezone
from typing import Callable

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

logger = logging.getLogger("vigiminas.latency")


class LatencyMonitoringMiddleware(BaseHTTPMiddleware):
    """
    Middleware de Telemetria de Latência de Alta Precisão (Sem Overhead).
    - Calcula o tempo total de resposta de cada requisição via time.perf_counter().
    - Injeta o cabeçalho 'X-Response-Time: {tempo_ms:.2f}ms' com duas casas decimais.
    - Se tempo_total >= 1.0 segundo (1000 ms), emite alerta com log estruturado em JSON
      no nível WARNING com timestamp, method, path, status_code, latency_ms, client_ip e query_params.
    """

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        start_time = time.perf_counter()

        response: Response = await call_next(request)

        execution_seconds = time.perf_counter() - start_time
        latency_ms = execution_seconds * 1000.0

        # Injeta cabeçalho de resposta com formato padronizado de duas casas decimais
        response.headers["X-Response-Time"] = f"{latency_ms:.2f}ms"

        # Dispara log estruturado JSON se a execução for >= 1.0s (1000ms)
        if execution_seconds >= 1.0:
            client_ip = None
            if request.headers.get("x-forwarded-for"):
                client_ip = request.headers.get("x-forwarded-for").split(",")[0].strip()
            elif request.client:
                client_ip = request.client.host

            log_payload = {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "alerta": "LATENCIA_ELEVADA",
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "latency_ms": round(latency_ms, 2),
                "client_ip": client_ip,
                "query_params": dict(request.query_params),
            }
            logger.warning(json.dumps(log_payload, ensure_ascii=False))

        return response
