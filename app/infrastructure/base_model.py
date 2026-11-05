import uuid
from datetime import datetime
from sqlalchemy import Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    """
    Classe Declarativa Base do SQLAlchemy 2.0 para todos os modelos da infraestrutura.
    """
    pass


class SoftDeleteAuditMixin:
    """
    Mixin abstrato universal para conformidade DDD e integridade referencial:
    - Identificador único UUIDv4
    - Controle de ciclo de vida com soft delete (is_active, is_deleted)
    - Auditoria de carimbos temporais automáticos (criado_em, atualizado_em)
    """

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
    )

    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    criado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    atualizado_em: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
