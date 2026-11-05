import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.auth.entities import PerfilUsuario, TipoOperacaoAuditoria
from app.infrastructure.base_model import Base, SoftDeleteAuditMixin

# ==============================================================================
# TIPOS ENUMERADOS DO POSTGRESQL (REFLEXO EXATO DO DDL)
# ==============================================================================
perfil_usuario_enum = PG_ENUM(
    PerfilUsuario,
    name="perfil_usuario",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

tipo_operacao_auditoria_enum = PG_ENUM(
    TipoOperacaoAuditoria,
    name="tipo_operacao_auditoria",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)


# ==============================================================================
# 1. TABELA: USUARIOS
# ==============================================================================
class UsuarioModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "usuarios"

    # Credenciais e Acesso
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    perfil: Mapped[PerfilUsuario] = mapped_column(
        perfil_usuario_enum,
        nullable=False,
        default=PerfilUsuario.DIGITADOR,
        server_default="digitador",
    )

    # Identificação Civil e Funcional
    nome_completo: Mapped[str] = mapped_column(String(200), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    matricula: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    cargo: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Fiscal Sanitário",
        server_default="Fiscal Sanitário",
    )
    portaria_nomeacao: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    telefone_contato: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Recurso Operacional
    url_assinatura_rubrica: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Auditoria de Acesso
    ultimo_login: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Índices parciais e de performance
    __table_args__ = (
        Index(
            "uq_usuarios_email",
            "email",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "uq_usuarios_cpf",
            "cpf",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_usuarios_email",
            "email",
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_usuarios_perfil_ativo",
            "perfil",
            "is_active",
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_usuarios_cpf",
            "cpf",
            postgresql_where=text("is_deleted = FALSE"),
        ),
    )


# ==============================================================================
# 2. TABELA: CONFIGURACAO_INSTITUCIONAL (SINGLETON)
# ==============================================================================
class ConfiguracaoInstitucionalModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "configuracao_institucional"

    singleton_key: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        server_default="1",
    )

    # Dados do Ente Público e Secretaria
    municipio: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Braúnas",
        server_default="Braúnas",
    )
    uf: Mapped[str] = mapped_column(
        String(2),
        nullable=False,
        default="MG",
        server_default="MG",
    )
    nome_prefeitura: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        default="Prefeitura Municipal de Braúnas",
        server_default="Prefeitura Municipal de Braúnas",
    )
    nome_secretaria: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        default="Secretaria Municipal de Saúde",
        server_default="Secretaria Municipal de Saúde",
    )
    orgao_vigilancia: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        default="Coordenação de Vigilância em Saúde e Vigilância Sanitária",
        server_default="Coordenação de Vigilância em Saúde e Vigilância Sanitária",
    )
    cnpj_institucional: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Endereço Oficial e Contato
    logradouro: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    numero: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    bairro: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    cep: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    telefone_oficial: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email_oficial: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # Identidade Visual e Expedição Oficial
    url_brasao_prefeitura: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url_logo_vigilancia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    texto_padrao_rodape_alvara: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Responsável pela atualização
    atualizado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint("singleton_key = 1", name="chk_singleton_config"),
        Index(
            "uq_configuracao_institucional_singleton",
            "singleton_key",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_config_institucional_atualizado_por",
            "atualizado_por",
            postgresql_where=text("is_deleted = FALSE"),
        ),
    )


# ==============================================================================
# 3. TABELA: METAS_EXERCICIO
# ==============================================================================
class MetasExercicioModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "metas_exercicio"

    ano_exercicio: Mapped[int] = mapped_column(Integer, nullable=False)

    # Indicador 11: Ações de VAPT em Saúde do Trabalhador
    meta_inspecoes_vapt: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        server_default="0",
    )

    # Indicadores 12 a 15: Metas Percentuais de Cobertura Sanitária por Grau de Risco
    meta_cobertura_risco_1: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("100.00"),
        server_default="100.00",
    )
    meta_cobertura_risco_2: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("100.00"),
        server_default="100.00",
    )
    meta_cobertura_risco_3: Mapped[Decimal] = mapped_column(
        Numeric(5, 2),
        nullable=False,
        default=Decimal("100.00"),
        server_default="100.00",
    )

    # Prazos Operacionais e Regulatórios Padrão do Exercício
    dias_validade_padrao_alvara: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=365,
        server_default="365",
    )
    dias_prazo_padrao_notificacao: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=30,
        server_default="30",
    )

    observacoes_pactuacao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    configurado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    __table_args__ = (
        CheckConstraint(
            "ano_exercicio >= 2020 AND ano_exercicio <= 2100",
            name="chk_ano_valido",
        ),
        CheckConstraint(
            "meta_cobertura_risco_1 BETWEEN 0 AND 100",
            name="chk_percentual_risco_1",
        ),
        CheckConstraint(
            "meta_cobertura_risco_2 BETWEEN 0 AND 100",
            name="chk_percentual_risco_2",
        ),
        CheckConstraint(
            "meta_cobertura_risco_3 BETWEEN 0 AND 100",
            name="chk_percentual_risco_3",
        ),
        Index(
            "uq_metas_exercicio_ano_valido",
            "ano_exercicio",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "uq_exercicio_ativo",
            "is_active",
            unique=True,
            postgresql_where=text("is_active = TRUE AND is_deleted = FALSE"),
        ),
        Index(
            "idx_metas_exercicio_configurado_por",
            "configurado_por",
            postgresql_where=text("is_deleted = FALSE"),
        ),
    )


# ==============================================================================
# 4. TABELA: LOGS_AUDITORIA (APPEND-ONLY)
# ==============================================================================
class LogAuditoriaModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "logs_auditoria"

    # Objeto da Ação
    tabela_afetada: Mapped[str] = mapped_column(String(60), nullable=False)
    registro_id: Mapped[str] = mapped_column(String(128), nullable=False)
    identificador_entidade: Mapped[Optional[str]] = mapped_column(
        String(250),
        nullable=True,
    )

    # Operação e Contexto
    operacao: Mapped[TipoOperacaoAuditoria] = mapped_column(
        tipo_operacao_auditoria_enum,
        nullable=False,
    )
    acao: Mapped[str] = mapped_column(String(100), nullable=False)
    detalhes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Comparativo de Dados (Diff / Snapshot para Auditoria Reversa)
    dados_anteriores: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )
    dados_novos: Mapped[Optional[Dict[str, Any]]] = mapped_column(
        JSONB,
        nullable=True,
    )

    # Identificação do Agente Público Responsável
    usuario_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    usuario_nome: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    usuario_matricula: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # Metadados de Rede e Conexão
    ip_origem: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)
    user_agent: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("idx_logs_tabela_registro", "tabela_afetada", "registro_id"),
        Index("idx_logs_identificador", "identificador_entidade"),
        Index("idx_logs_usuario", "usuario_id", text("criado_em DESC")),
        Index("idx_logs_criado_em", text("criado_em DESC")),
    )
