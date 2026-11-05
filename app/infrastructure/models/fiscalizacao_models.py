import uuid
from datetime import date, time
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.infrastructure.base_model import Base, SoftDeleteAuditMixin
from app.infrastructure.models.auth_models import UsuarioModel
from app.infrastructure.models.estabelecimento_models import EstabelecimentoModel

# ==============================================================================
# TIPOS ENUMERADOS DO POSTGRESQL (REFLEXO EXATO DO DDL MÓDULO 5)
# ==============================================================================
tipo_motivo_inspecao_enum = PG_ENUM(
    TipoMotivoInspecao,
    name="tipo_motivo_inspecao",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

status_inspecao_enum = PG_ENUM(
    StatusInspecao,
    name="status_inspecao",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

resultado_inspecao_enum = PG_ENUM(
    ResultadoInspecao,
    name="resultado_inspecao",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)


# ==============================================================================
# TABELA: INSPECOES
# ==============================================================================
class InspecaoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "inspecoes"

    # Identificação Oficial do Termo
    numero_termo: Mapped[str] = mapped_column(String(50), nullable=False)
    motivo: Mapped[TipoMotivoInspecao] = mapped_column(
        tipo_motivo_inspecao_enum,
        nullable=False,
        default=TipoMotivoInspecao.ROTINA_PROGRAMADA,
        server_default="rotina_programada",
    )
    status: Mapped[StatusInspecao] = mapped_column(
        status_inspecao_enum,
        nullable=False,
        default=StatusInspecao.AGENDADA,
        server_default="agendada",
    )

    # Vínculos Estruturais
    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    requerimento_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )
    denuncia_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        nullable=True,
    )

    # Equipe Fiscal Responsável
    fiscal_responsavel_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    fiscais_acompanhantes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Cronograma e Execução
    data_agendamento: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    hora_inspecao: Mapped[Optional[time]] = mapped_column(Time, nullable=True)

    # Dados de Campo e Desfecho
    resultado: Mapped[Optional[ResultadoInspecao]] = mapped_column(
        resultado_inspecao_enum,
        nullable=True,
    )
    nome_pessoa_acompanhou: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    cpf_pessoa_acompanhou: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)

    # Relato Técnico e Notificação
    relato_vistoria: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    irregularidades_constatadas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    exigencias_notificadas: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    prazo_adequacao_dias: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )
    data_limite_adequacao: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    # Especificidades de Saúde do Trabalhador (VAPT - Indicador 11)
    nome_local_trabalho: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    principais_riscos_identificados: Mapped[Optional[str]] = mapped_column(String(1500), nullable=True)
    recomendacoes_orientacoes: Mapped[Optional[str]] = mapped_column(String(1500), nullable=True)

    # Dados Flexíveis e Evidências
    checklist_respostas: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        server_default=text("'{}'::jsonb"),
    )
    relatorio_fotografico: Mapped[List[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        server_default=text("'[]'::jsonb"),
    )
    url_termo_assinado_pdf: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relacionamentos ORM
    estabelecimento: Mapped[EstabelecimentoModel] = relationship("EstabelecimentoModel", lazy="joined")
    fiscal_responsavel: Mapped[UsuarioModel] = relationship("UsuarioModel", lazy="joined")

    __table_args__ = (
        Index("uq_inspecoes_numero_termo", "numero_termo", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_inspecoes_estabelecimento", "estabelecimento_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_inspecoes_fiscal", "fiscal_responsavel_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_inspecoes_motivo_status", "motivo", "status", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_inspecoes_data_inicio", text("data_inicio DESC"), postgresql_where=text("is_deleted = FALSE")),
        Index("idx_inspecoes_requerimento", "requerimento_id", postgresql_where=text("requerimento_id IS NOT NULL AND is_deleted = FALSE")),
        Index(
            "idx_inspecoes_prazos_pendentes",
            "data_limite_adequacao",
            "status",
            postgresql_where=text("resultado = 'notificado_com_prazo' AND is_deleted = FALSE AND is_active = TRUE"),
        ),
    )
