"""
Mapeamento ORM SQLAlchemy 2.0: Licenciamento Sanitário e Alvarás
DDL de Referência: 4_requerimentos_alvara.sql e 2_documentos_alvara_cnaes.sql
"""
from datetime import date, datetime
from typing import Optional
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.infrastructure.base_model import Base, SoftDeleteAuditMixin

# Definições de Enums PostgreSQL (Módulos 2 e 4)
tipo_solicitacao_alvara_enum = ENUM(
    "concessao_inicial",
    "renovacao",
    name="tipo_solicitacao_alvara",
    create_type=False,
)

status_requerimento_enum = ENUM(
    "pendente",
    "em_analise",
    "aguardando_inspecao",
    "aguardando_adequacao",
    "deferido",
    "indeferido",
    "cancelado",
    name="status_requerimento",
    create_type=False,
)

status_alvara_enum = ENUM(
    "ativo",
    "vencido",
    "suspenso",
    "revogado",
    "cassado",
    name="status_alvara",
    create_type=False,
)


class RequerimentoAlvaraModel(Base, SoftDeleteAuditMixin):
    """
    Tabela: requerimentos_alvara
    Livro de registro dos pedidos de licenciamento sanitário municipal
    """
    __tablename__ = "requerimentos_alvara"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    numero_protocolo: Mapped[str] = mapped_column(String(35), nullable=False)
    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    tipo_solicitacao: Mapped[str] = mapped_column(tipo_solicitacao_alvara_enum, nullable=False)
    status: Mapped[str] = mapped_column(status_requerimento_enum, nullable=False, default="pendente")

    # Histórico da Licença Anterior (se for Renovação)
    alvara_anterior_numero: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    alvara_anterior_exercicio: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Metadados de Entrada
    data_submissao: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    origem_solicitacao: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Google Forms Web",
    )

    # Tramitação e Parecer Fiscal
    analisado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    data_inicio_analise: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    data_conclusao: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    parecer_fiscal: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    motivo_indeferimento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relacionamentos ORM
    estabelecimento = relationship("EstabelecimentoModel", backref="requerimentos")
    analisador = relationship("UsuarioModel", foreign_keys=[analisado_por])
    dados = relationship("RequerimentoAlvaraDadosModel", back_populates="requerimento", uselist=False, cascade="all, delete-orphan")

    __table_args__ = (
        Index(
            "uq_requerimento_protocolo",
            "numero_protocolo",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_req_alvara_protocolo",
            "numero_protocolo",
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_req_alvara_painel_fila",
            "status",
            text("data_submissao ASC"),
            postgresql_where=text("status IN ('pendente', 'em_analise', 'aguardando_inspecao', 'aguardando_adequacao') AND is_deleted = FALSE"),
        ),
        Index(
            "idx_req_alvara_estabelecimento",
            "estabelecimento_id",
            text("data_submissao DESC"),
            postgresql_where=text("is_deleted = FALSE"),
        ),
    )


class RequerimentoAlvaraDadosModel(Base):
    """
    Tabela: requerimentos_alvara_dados
    Espelho cadastral integral da petição enviada pelo formulário web (Relacionamento 1:1).
    Possui chave primária requerimento_id (UUID PK 1:1) e campos explícitos de ciclo de vida / auditoria
    conforme DDL do módulo 4_requerimentos_alvara.sql.
    """
    __tablename__ = "requerimentos_alvara_dados"

    requerimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requerimentos_alvara.id", ondelete="CASCADE", onupdate="CASCADE"),
        primary_key=True,
    )

    # 1. IDENTIFICAÇÃO CADASTRAL DECLARADA
    tipo_cadastro: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    cpf_cnpj: Mapped[str] = mapped_column(String(20), nullable=False)
    razao_social: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_fantasia: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    inscricao_municipal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    natureza_juridica: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # 2. CONTACTOS DO ESTABELECIMENTO DECLARADOS
    telefone_fixo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    telefone_celular: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    email_comercial: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    # 3. LOCALIZAÇÃO DO ESTABELECIMENTO DECLARADA
    cep: Mapped[Optional[str]] = mapped_column(String(9), nullable=True)
    logradouro: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    numero: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    complemento: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bairro: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    ponto_referencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acesso_compartilhado_residencia: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 4. ATIVIDADES ECONÓMICAS DECLARADAS
    cnae_principal_selecionado: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cnae_principal_codigo_manual: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    cnae_principal_descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cnaes_secundarios_declarados: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    atividades_auxiliares: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 5. PROJETO ARQUITETÓNICO E AUTORIZAÇÕES FEDERAIS
    projeto_arquitetonico_aprovado: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    numero_processo_projeto_sei: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    afe_anvisa: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    ae_anvisa: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 6. CONDIÇÕES FÍSICO-OPERACIONAIS DECLARADAS
    dias_horario_funcionamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    num_funcionarios_manipuladores: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    fonte_abastecimento_agua: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    possui_caixa_agua_propria: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    capacidade_caixa_agua_litros: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    data_ultima_limpeza_caixa_agua: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    possui_coleta_rss: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    possui_raio_x: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)

    # 7. DADOS DO REPRESENTANTE LEGAL DECLARADO
    rep_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rep_cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    rep_rg: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    rep_orgao_uf: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rep_celular: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rep_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    rep_endereco_residencial: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 8. DADOS DO RESPONSÁVEL TÉCNICO (RT) DECLARADO
    exige_rt: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rt_proprio_representante: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rt_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    rt_cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    rt_conselho_classe: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    rt_numero_conselho: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rt_conselho_uf: Mapped[Optional[str]] = mapped_column(String(2), nullable=True)
    rt_carga_horaria: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    rt_telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    rt_email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    possui_rt_substituto: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    rt_substituto_dados: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # 9. ANEXOS E RESPONSÁVEL PELO PREENCHIMENTO
    relacao_documentos_declarados: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    link_drive_documentos: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    declaracao_veracidade_texto: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    preenchedor_nome: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    preenchedor_vinculo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    preenchedor_telefone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)

    # Controle de Ciclo de Vida (Soft Delete Universal) e Auditoria Padronizada
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        server_default=func.true() if hasattr(func, "true") else "true",
        nullable=False,
    )
    is_deleted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default=func.false() if hasattr(func, "false") else "false",
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

    requerimento = relationship("RequerimentoAlvaraModel", back_populates="dados")

    __table_args__ = (
        Index("idx_req_dados_cpf_cnpj", "cpf_cnpj", postgresql_where=text("is_deleted = FALSE")),
    )


class AlvaraSanitarioModel(Base, SoftDeleteAuditMixin):
    """
    Tabela: alvaras_sanitarios
    Registo oficial das licenças sanitárias emitidas pelo município
    """
    __tablename__ = "alvaras_sanitarios"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    numero_alvara: Mapped[int] = mapped_column(Integer, nullable=False)
    exercicio: Mapped[int] = mapped_column(Integer, nullable=False)
    numero_formatado: Mapped[str] = mapped_column(String(30), nullable=False)

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )
    requerimento_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("requerimentos_alvara.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    inspecao_conclusiva_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("inspecoes.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    codigo_autenticidade: Mapped[str] = mapped_column(String(32), nullable=False)
    data_emissao: Mapped[date] = mapped_column(Date, nullable=False, default=func.current_date())
    data_vencimento: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(status_alvara_enum, nullable=False, default="ativo")

    emitido_por: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False,
    )

    condicionantes_restricoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url_alvara_pdf: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relacionamentos ORM
    estabelecimento = relationship("EstabelecimentoModel", backref="alvaras")
    requerimento = relationship("RequerimentoAlvaraModel", backref="alvara_gerado")
    inspecao_conclusiva = relationship("InspecaoModel", backref="alvara_concessao")
    emissor = relationship("UsuarioModel", foreign_keys=[emitido_por])

    __table_args__ = (
        CheckConstraint("data_vencimento >= data_emissao", name="chk_alvara_datas"),
        Index(
            "uq_alvara_numero_exercicio",
            "numero_alvara",
            "exercicio",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "uq_alvara_codigo_autenticidade",
            "codigo_autenticidade",
            unique=True,
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_autenticidade",
            "codigo_autenticidade",
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_estabelecimento",
            "estabelecimento_id",
            text("data_emissao DESC"),
            postgresql_where=text("is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_vencimento_alerta",
            "data_vencimento",
            "status",
            postgresql_where=text("status = 'ativo' AND is_active = TRUE AND is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_requerimento",
            "requerimento_id",
            postgresql_where=text("requerimento_id IS NOT NULL AND is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_inspecao_conclusiva",
            "inspecao_conclusiva_id",
            postgresql_where=text("inspecao_conclusiva_id IS NOT NULL AND is_deleted = FALSE"),
        ),
        Index(
            "idx_alvaras_emitido_por",
            "emitido_por",
            postgresql_where=text("is_deleted = FALSE"),
        ),
    )
