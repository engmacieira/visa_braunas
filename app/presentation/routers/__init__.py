from app.presentation.routers.auth_router import router as auth_router
from app.presentation.routers.cnaes_router import router as cnaes_router
from app.presentation.routers.estabelecimentos_router import (
    router as estabelecimentos_router,
)
from app.presentation.routers.indicadores_router import router as indicadores_router
from app.presentation.routers.inspecoes_router import router as inspecoes_router
from app.presentation.routers.licenciamento_router import router as licenciamento_router
from app.presentation.routers.ouvidoria_router import router as ouvidoria_router
from app.presentation.routers.usuarios_router import router as usuarios_router

__all__ = [
    "auth_router",
    "usuarios_router",
    "estabelecimentos_router",
    "cnaes_router",
    "inspecoes_router",
    "licenciamento_router",
    "ouvidoria_router",
    "indicadores_router",
]
