"""
VigiMinas - Camada de Infraestrutura (DDD)
Modelos SQLAlchemy 2.0 mapeando estritamente os scripts DDL, repositórios concretos e conexões.
"""
from app.infrastructure.base_model import Base, SoftDeleteAuditMixin
from app.infrastructure.database import AsyncSessionLocal, async_engine, get_db_session

__all__ = [
    "Base",
    "SoftDeleteAuditMixin",
    "async_engine",
    "AsyncSessionLocal",
    "get_db_session",
]
