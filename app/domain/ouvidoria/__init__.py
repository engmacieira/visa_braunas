from app.domain.ouvidoria.entities import (
    CanalDenuncia,
    Denuncia,
    GravidadeDenuncia,
    NumeroProtocoloDenuncia,
    StatusDenuncia,
)
from app.domain.ouvidoria.repositories import IDenunciaRepository

__all__ = [
    "CanalDenuncia",
    "StatusDenuncia",
    "GravidadeDenuncia",
    "NumeroProtocoloDenuncia",
    "Denuncia",
    "IDenunciaRepository",
]
