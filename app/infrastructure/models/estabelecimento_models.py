import uuid
from datetime import date, datetime
from typing import List, Optional

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
    text,
)
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.domain.estabelecimentos.entities import (
    CategoriaDocumento,
    CompetenciaFiscalizacao,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
    SituacaoAlvara,
    SituacaoCadastral,
    SituacaoDocumento,
    TipoPessoa,
)
from app.infrastructure.base_model import Base, SoftDeleteAuditMixin

# ==============================================================================
# TIPOS ENUMERADOS DO POSTGRESQL (REFLEXO EXATO DO DDL)
# ==============================================================================
tipo_pessoa_enum = PG_ENUM(
    TipoPessoa,
    name="tipo_pessoa",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

nivel_risco_sanitario_enum = PG_ENUM(
    NivelRiscoSanitario,
    name="nivel_risco_sanitario",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

nivel_risco_cnae_enum = PG_ENUM(
    NivelRiscoCNAE,
    name="nivel_risco_cnae",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

situacao_cadastral_enum = PG_ENUM(
    SituacaoCadastral,
    name="situacao_cadastral",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

situacao_alvara_enum = PG_ENUM(
    SituacaoAlvara,
    name="situacao_alvara",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

competencia_fiscalizacao_enum = PG_ENUM(
    CompetenciaFiscalizacao,
    name="competencia_fiscalizacao",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

categoria_documento_enum = PG_ENUM(
    CategoriaDocumento,
    name="categoria_documento",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)

situacao_documento_estabelecimento_enum = PG_ENUM(
    SituacaoDocumento,
    name="situacao_documento_estabelecimento",
    values_callable=lambda x: [e.value for e in x],
    create_type=False,
)


# ==============================================================================
# 1. TABELA: CNAES
# ==============================================================================
class CnaeModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "cnaes"

    codigo: Mapped[str] = mapped_column(String(10), nullable=False)
    descricao: Mapped[str] = mapped_column(String(300), nullable=False)
    grau_risco_padrao: Mapped[NivelRiscoCNAE] = mapped_column(
        nivel_risco_cnae_enum,
        nullable=False,
        default=NivelRiscoCNAE.RISCO_II,
        server_default="Risco II",
    )
    competencia_padrao: Mapped[CompetenciaFiscalizacao] = mapped_column(
        competencia_fiscalizacao_enum,
        nullable=False,
        default=CompetenciaFiscalizacao.MUNICIPAL,
        server_default="Municipal",
    )
    exige_rt: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    exige_projeto_arquitetonico: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        Index("uq_cnaes_codigo", "codigo", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_cnaes_grau_risco", "grau_risco_padrao", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_cnaes_ativo", "is_active", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 2. TABELA: TIPOS_DOCUMENTOS
# ==============================================================================
class TipoDocumentoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "tipos_documentos"

    codigo_identificador: Mapped[str] = mapped_column(String(50), nullable=False)
    nome_documento: Mapped[str] = mapped_column(String(200), nullable=False)
    descricao: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    categoria: Mapped[CategoriaDocumento] = mapped_column(
        categoria_documento_enum,
        nullable=False,
        default=CategoriaDocumento.LICENCIAMENTO,
        server_default="licenciamento",
    )
    possui_validade: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    validade_padrao_meses: Mapped[Optional[int]] = mapped_column(Integer, default=12, nullable=True)
    exige_orgao_emissor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    exige_responsavel_emissao: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    __table_args__ = (
        CheckConstraint(
            "validade_padrao_meses IS NULL OR validade_padrao_meses > 0",
            name="chk_tipos_docs_validade_positiva",
        ),
        Index("uq_tipos_documentos_codigo", "codigo_identificador", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_tipos_docs_categoria", "categoria", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_tipos_docs_ativo", "is_active", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 3. TABELA: REPRESENTANTES_LEGAIS
# ==============================================================================
class RepresentanteLegalModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "representantes_legais"

    nome_completo: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    rg_numero: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    rg_orgao_emissor: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    endereco_residencial: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        Index("uq_representantes_cpf", "cpf", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_representantes_nome", "nome_completo", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 4. TABELA: ESTABELECIMENTOS
# ==============================================================================
class EstabelecimentoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimentos"

    tipo_cadastro: Mapped[TipoPessoa] = mapped_column(
        tipo_pessoa_enum,
        nullable=False,
        default=TipoPessoa.PJ,
        server_default="PJ",
    )
    cnpj_cpf: Mapped[str] = mapped_column(String(20), nullable=False)
    inscricao_municipal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    razao_social: Mapped[str] = mapped_column(String(200), nullable=False)
    nome_fantasia: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    natureza_juridica: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Localização
    cep: Mapped[str] = mapped_column(String(10), nullable=False, default="35.189-000", server_default="35.189-000")
    logradouro: Mapped[str] = mapped_column(String(255), nullable=False)
    numero: Mapped[str] = mapped_column(String(20), nullable=False)
    complemento: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    bairro: Mapped[str] = mapped_column(String(100), nullable=False)
    municipio: Mapped[str] = mapped_column(String(100), nullable=False, default="Braúnas", server_default="Braúnas")
    uf: Mapped[str] = mapped_column(String(2), nullable=False, default="MG", server_default="MG")
    ponto_referencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    acesso_compartilhado_residencia: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Comunicação
    telefone_fixo: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    telefone_celular: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[str] = mapped_column(String(150), nullable=False)

    # Situação e Risco
    nivel_risco: Mapped[NivelRiscoSanitario] = mapped_column(nivel_risco_sanitario_enum, nullable=False)
    competencia_fiscalizacao: Mapped[CompetenciaFiscalizacao] = mapped_column(
        competencia_fiscalizacao_enum,
        nullable=False,
        default=CompetenciaFiscalizacao.MUNICIPAL,
        server_default="Municipal",
    )
    situacao_estabelecimento: Mapped[SituacaoCadastral] = mapped_column(
        situacao_cadastral_enum,
        nullable=False,
        default=SituacaoCadastral.ATIVO,
        server_default="Ativo",
    )
    observacoes_baixa: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # Estrutura Operacional
    horario_funcionamento: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fonte_abastecimento_agua: Mapped[Optional[str]] = mapped_column(
        String(100),
        default="Rede Pública (COPASA)",
        server_default="Rede Pública (COPASA)",
    )
    possui_reservatorio_proprio: Mapped[Optional[bool]] = mapped_column(Boolean, default=False)
    capacidade_reservatorio_litros: Mapped[Optional[int]] = mapped_column(Integer, default=0)

    # Alvará Sanitário Sincronizado
    numero_alvara: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    data_validade_alvara: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    situacao_alvara: Mapped[SituacaoAlvara] = mapped_column(
        situacao_alvara_enum,
        default=SituacaoAlvara.NAO_POSSUI_IRREGULAR,
        server_default="Não Possui (Irregular)",
    )

    # Vínculos Estruturais
    representante_legal_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("representantes_legais.id", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=True,
    )
    firestore_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    cadastrado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )

    # Relacionamentos ORM
    representante_legal: Mapped[Optional[RepresentanteLegalModel]] = relationship(
        "RepresentanteLegalModel",
        lazy="joined",
    )
    cnaes_associados: Mapped[List["EstabelecimentoCnaeModel"]] = relationship(
        "EstabelecimentoCnaeModel",
        back_populates="estabelecimento",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    responsaveis_tecnicos_associados: Mapped[List["EstabelecimentoResponsavelTecnicoModel"]] = relationship(
        "EstabelecimentoResponsavelTecnicoModel",
        back_populates="estabelecimento",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        Index("uq_estabelecimentos_firestore_id", "firestore_id", unique=True, postgresql_where=text("firestore_id IS NOT NULL AND is_deleted = FALSE")),
        Index("idx_estabelecimentos_cnpj_cpf", "cnpj_cpf", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estabelecimentos_risco_alvara", "nivel_risco", "situacao_alvara", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estabelecimentos_situacao", "situacao_estabelecimento", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estabelecimentos_validade_alvara", "data_validade_alvara", postgresql_where=text("situacao_alvara = 'Válido' AND is_deleted = FALSE")),
    )


# ==============================================================================
# 5. TABELA ASSOCIATIVA: ESTABELECIMENTO_CNAES
# ==============================================================================
class EstabelecimentoCnaeModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimento_cnaes"

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    cnae_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cnaes.id", ondelete="RESTRICT"),
        nullable=False,
    )
    cnae_codigo: Mapped[str] = mapped_column(String(10), nullable=False)
    eh_principal: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    data_inicio_atividade: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    estabelecimento: Mapped[EstabelecimentoModel] = relationship("EstabelecimentoModel", back_populates="cnaes_associados")
    cnae: Mapped[CnaeModel] = relationship("CnaeModel", lazy="joined")

    __table_args__ = (
        Index("uq_estab_cnae_associacao", "estabelecimento_id", "cnae_id", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("uq_estabelecimento_cnae_principal", "estabelecimento_id", unique=True, postgresql_where=text("eh_principal = TRUE AND is_deleted = FALSE")),
        Index("idx_estab_cnaes_codigo", "cnae_codigo", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estab_cnaes_ativos", "estabelecimento_id", "eh_principal", postgresql_where=text("is_active = TRUE AND is_deleted = FALSE")),
    )


# ==============================================================================
# 6. TABELA: RESPONSAVEIS_TECNICOS
# ==============================================================================
class ResponsavelTecnicoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "responsaveis_tecnicos"

    nome_completo: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    conselho_classe: Mapped[str] = mapped_column(String(30), nullable=False)
    numero_registro_conselho: Mapped[str] = mapped_column(String(50), nullable=False)
    uf_conselho: Mapped[str] = mapped_column(String(2), nullable=False, default="MG", server_default="MG")
    telefone: Mapped[str] = mapped_column(String(20), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)

    __table_args__ = (
        Index("uq_rt_cpf", "cpf", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("uq_rt_registro_uf", "conselho_classe", "numero_registro_conselho", "uf_conselho", unique=True, postgresql_where=text("is_deleted = FALSE")),
        Index("idx_rt_conselho_registro", "conselho_classe", "numero_registro_conselho", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 7. TABELA ASSOCIATIVA: ESTABELECIMENTO_RESPONSAVEIS_TECNICOS
# ==============================================================================
class EstabelecimentoResponsavelTecnicoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimento_responsaveis_tecnicos"

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    responsavel_tecnico_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("responsaveis_tecnicos.id", ondelete="RESTRICT"),
        nullable=False,
    )
    eh_substituto: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    carga_horaria_semanal: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    horario_permanencia: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    numero_art_crt: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False, default=date.today)
    data_fim: Mapped[Optional[date]] = mapped_column(Date, nullable=True)

    estabelecimento: Mapped[EstabelecimentoModel] = relationship("EstabelecimentoModel", back_populates="responsaveis_tecnicos_associados")
    responsavel_tecnico: Mapped[ResponsavelTecnicoModel] = relationship("ResponsavelTecnicoModel", lazy="joined")

    __table_args__ = (
        Index("uq_estab_rt_titular_ativo", "estabelecimento_id", unique=True, postgresql_where=text("eh_substituto = FALSE AND is_active = TRUE AND is_deleted = FALSE")),
        Index("idx_estab_rt_estabelecimento", "estabelecimento_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estab_rt_profissional", "responsavel_tecnico_id", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 8. TABELA: ESTABELECIMENTO_DOCUMENTOS
# ==============================================================================
class EstabelecimentoDocumentoModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimento_documentos"

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    tipo_documento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tipos_documentos.id", ondelete="RESTRICT"),
        nullable=False,
    )
    eh_versao_atual: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    situacao: Mapped[SituacaoDocumento] = mapped_column(
        situacao_documento_estabelecimento_enum,
        nullable=False,
        default=SituacaoDocumento.EM_ANALISE,
        server_default="em_analise",
    )
    numero_identificacao: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    orgao_empresa_emissora: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    responsavel_tecnico_emissor: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    registro_conselho_emissor: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    data_emissao: Mapped[date] = mapped_column(Date, nullable=False)
    data_validade: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    url_arquivo_anexo: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    observacoes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    validado_por: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("usuarios.id", ondelete="SET NULL"),
        nullable=True,
    )
    data_validacao: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("uq_estab_tipo_doc_vigente", "estabelecimento_id", "tipo_documento_id", unique=True, postgresql_where=text("eh_versao_atual = TRUE AND is_deleted = FALSE")),
        Index("idx_estab_docs_estabelecimento", "estabelecimento_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estab_docs_tipo", "tipo_documento_id", postgresql_where=text("is_deleted = FALSE")),
        Index(
            "idx_estab_docs_alerta_vencimento",
            "data_validade",
            "situacao",
            postgresql_where=text("eh_versao_atual = TRUE AND data_validade IS NOT NULL AND is_deleted = FALSE"),
        ),
    )


# ==============================================================================
# 9. TABELA: ESTABELECIMENTO_FUNCIONARIOS
# ==============================================================================
class EstabelecimentoFuncionarioModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimento_funcionarios"

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    nome_completo: Mapped[str] = mapped_column(String(255), nullable=False)
    cpf: Mapped[Optional[str]] = mapped_column(String(14), nullable=True)
    funcao_cargo: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    eh_manipulador: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        Index("idx_estab_func_estabelecimento", "estabelecimento_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estab_func_ativo", "estabelecimento_id", "is_active", postgresql_where=text("is_deleted = FALSE")),
    )


# ==============================================================================
# 10. TABELA: ESTABELECIMENTO_FORNECEDORES
# ==============================================================================
class EstabelecimentoFornecedorModel(Base, SoftDeleteAuditMixin):
    __tablename__ = "estabelecimento_fornecedores"

    estabelecimento_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("estabelecimentos.id", ondelete="CASCADE"),
        nullable=False,
    )
    razao_social: Mapped[str] = mapped_column(String(255), nullable=False)
    nome_fantasia: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    cnpj: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    tipo_produto_fornecido: Mapped[Optional[str]] = mapped_column(String(150), nullable=True)
    municipio_uf: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("idx_estab_fornec_estabelecimento", "estabelecimento_id", postgresql_where=text("is_deleted = FALSE")),
        Index("idx_estab_fornec_cnpj", "cnpj", postgresql_where=text("is_deleted = FALSE")),
    )
