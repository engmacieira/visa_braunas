"""
Mapeamento ORM SQLAlchemy 2.0: Ouvidoria e Gestão de Denúncias Sanitárias
DDL de Referência: 6_denuncias.sql
"""
from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.base_model import Base, SoftDeleteAuditMixin

# Definições de Enums PostgreSQL (Módulo 6)
canal_denuncia_enum = ENUM(
    "formulario_web",
    "presencial",
    "telefone",
    "ouvidoria_geral",
    "oficio_ministerio",
    name="canal_denuncia",
    create_type=False,
)

status_denuncia_enum = ENUM(
    "recebida",
    "em_analise",
    "em_apuracao_fiscal",
    "procedente",
    "improcedente",
    "arquivada",
    name="status_denuncia",
    create_type=False,
)

gravidade_denuncia_enum = ENUM(
    "baixa",
    "media",
    "alta",
    "urgente",
    name="gravidade_denuncia",
    create_type=False,
)


class DenunciaModel(Base, SoftDeleteAuditMixin):
    """
    Tabela: denuncias
    Gestão de queixas, manifestações populares e fiscalizações dirigidas
    """
    __tablename__ = "denuncias"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    numero_protocolo: Mapped[str] = mapped_column(String(35), nullable=False)
    data_recebimento: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    origem: Mapped[str] = mapped_column(
        canal_denuncia_enum,
        nullable=False,
        default="formulario_web",
    )
    gravidade: Mapped[str] = mapped_column(
        gravidade_denuncia_enum,
        nullable=False,
        default="media",
    )
    status: Mapped[str] = mapped_column(
        status_denuncia_enum,
        nullable=False,
        default="recebida",
    )

    # Associação com Estabelecimento Cadastrado (Opcional, pois pode ser ambulante/clandestino)
    estabelecimento_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    # Localização Geográfica e Identificação do Local Denunciado
    local_denunciado_identificacao: Mapped[str] = mapped_column(String(255), nullable=False)
    logradouro: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    numero: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bairro: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ponto_referencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Dados do Denunciante (Sigilo e Anonimato)
    denunciante_anonimo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    denunciante_nome: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    denunciante_telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    denunciante_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Relato dos Fatos e Ficheiros Anexos
    relato_denuncia: Mapped[str] = mapped_column(Text, nullable=False)
    url_anexos_evidencias: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        default=list,
        server_default="[]",
        nullable=False,
    )

    # Tramitação, Apuração e Encerramento
    fiscal_designado_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    despacho_coordenacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    conclusao_apuracao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    resposta_ao_denunciante: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    data_encerramento: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    finalizado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    # Relacionamentos ORM
    estabelecimento = relationship("EstabelecimentoModel", backref="denuncias")
    fiscal_designado = relationship("UsuarioModel", foreign_keys=[fiscal_designado_id])
    usuario_finalizador = relationship("UsuarioModel", foreign_keys=[finalizado_por])

    __table_args__ = (
        Index(
            "uq_denuncia_protocolo",
            "numero_protocolo",
            unique=True,
            postgresql_where=(SoftDeleteAuditMixin.is_deleted.is_(False)),
        ),
        Index(
            "idx_denuncias_protocolo",
            "numero_protocolo",
            postgresql_where=(SoftDeleteAuditMixin.is_deleted.is_(False)),
        ),
        Index(
            "idx_denuncias_status_fila",
            "status",
            "gravidade",
            "data_recebimento",
            postgresql_where=(
                status.in_(["recebida", "em_analise", "em_apuracao_fiscal"])
                & (SoftDeleteAuditMixin.is_deleted.is_(False))
            ),
        ),
        Index(
            "idx_denuncias_estabelecimento",
            "estabelecimento_id",
            postgresql_where=(
                estabelecimento_id.isnot(None)
                & (SoftDeleteAuditMixin.is_deleted.is_(False))
            ),
        ),
        Index(
            "idx_denuncias_fiscal_designado",
            "fiscal_designado_id",
            postgresql_where=(
                fiscal_designado_id.isnot(None)
                & (SoftDeleteAuditMixin.is_deleted.is_(False))
            ),
        ),
    )
