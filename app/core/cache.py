import logging
from typing import Optional

from fastapi_cache import FastAPICache
from fastapi_cache.backends.inmemory import InMemoryBackend
from fastapi_cache.backends.redis import RedisBackend
import redis.asyncio as redis_async

from app.core.config import settings

logger = logging.getLogger("vigiminas.cache")


async def init_cache() -> None:
    """
    Inicializa a camada de cache do FastAPI (fastapi-cache2).
    Regra de ouro: Degradação graciosa.
    Se REDIS_URL estiver definido, tenta conectar ao Redis.
    Caso contrário ou em caso de falha de conexão inicial,
    faz fallback automático para InMemoryBackend garantindo que a aplicação
    nunca falhe na inicialização.
    """
    if settings.REDIS_URL:
        try:
            redis_client = redis_async.from_url(
                settings.REDIS_URL,
                encoding="utf8",
                decode_responses=False,
                socket_connect_timeout=2.0,
            )
            # Teste de conectividade com timeout
            await redis_client.ping()
            backend = RedisBackend(redis_client)
            FastAPICache.init(backend, prefix="vigiminas-cache")
            logger.info("Camada de cache inicializada com RedisBackend: %s", settings.REDIS_URL)
            return
        except Exception as exc:
            logger.warning(
                "Falha ao conectar com Redis em '%s' (%s: %s). Ativando degradação graciosa com InMemoryBackend.",
                settings.REDIS_URL,
                exc.__class__.__name__,
                exc,
            )

    # Fallback ou modo padrão em desenvolvimento/testes
    FastAPICache.init(InMemoryBackend(), prefix="vigiminas-cache")
    logger.info("Camada de cache inicializada com InMemoryBackend padrão.")


async def clear_cache_key(key: str) -> None:
    """Invalida uma chave explícita no cache ativo."""
    backend = FastAPICache.get_backend()
    if backend:
        await backend.clear(key=key)


async def clear_cache_all() -> None:
    """Limpa todo o namespace de cache."""
    backend = FastAPICache.get_backend()
    if backend:
        await backend.clear(namespace="vigiminas-cache")
