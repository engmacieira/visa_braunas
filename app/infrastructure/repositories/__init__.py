from app.infrastructure.repositories.auditoria_repository import AuditoriaRepository
from app.infrastructure.repositories.cnae_repository import CNAERepository
from app.infrastructure.repositories.estabelecimento_repository import EstabelecimentoRepository
from app.infrastructure.repositories.indicadores_read_repository import IndicadoresReadRepository
from app.infrastructure.repositories.inspecao_repository import InspecaoRepository
from app.infrastructure.repositories.licenciamento_repository import (
    AlvaraRepository,
    RequerimentoRepository,
)
from app.infrastructure.repositories.ouvidoria_repository import DenunciaRepository
from app.infrastructure.repositories.representante_repository import RepresentanteLegalRepository
from app.infrastructure.repositories.usuario_repository import UsuarioRepository

__all__ = [
    "UsuarioRepository",
    "AuditoriaRepository",
    "EstabelecimentoRepository",
    "CNAERepository",
    "RepresentanteLegalRepository",
    "InspecaoRepository",
    "RequerimentoRepository",
    "AlvaraRepository",
    "DenunciaRepository",
    "IndicadoresReadRepository",
]
