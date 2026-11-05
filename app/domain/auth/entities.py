import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional


class PerfilUsuario(str, Enum):
    ADMIN_MASTER = "admin_master"
    COORDENADOR = "coordenador"
    FISCAL_TECNICO = "fiscal_tecnico"
    DIGITADOR = "digitador"


class TipoOperacaoAuditoria(str, Enum):
    INSERT = "INSERT"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    SOFT_DELETE = "SOFT_DELETE"
    HOMOLOGACAO = "HOMOLOGACAO"
    INDEFERIMENTO = "INDEFERIMENTO"
    LOGIN = "LOGIN"
    ACESSO_SIGILOSO = "ACESSO_SIGILOSO"


@dataclass
class Usuario:
    """
    Entidade pura do Domínio representando um Servidor ou Usuário da VISA.
    Isenta de dependências de infraestrutura ou frameworks.
    """
    id: uuid.UUID
    email: str
    senha_hash: str
    perfil: PerfilUsuario
    nome_completo: str
    cpf: str
    matricula: Optional[str] = None
    cargo: str = "Fiscal Sanitário"
    portaria_nomeacao: Optional[str] = None
    telefone_contato: Optional[str] = None
    url_assinatura_rubrica: Optional[str] = None
    ultimo_login: Optional[datetime] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def desativar(self) -> None:
        """Desativa o acesso do usuário ao sistema."""
        self.is_active = False
        self.atualizado_em = datetime.now(timezone.utc)

    def reativar(self) -> None:
        """Reativa o acesso do usuário ao sistema."""
        self.is_active = True
        self.atualizado_em = datetime.now(timezone.utc)

    def soft_delete(self) -> None:
        """Aplica exclusão lógica."""
        self.is_deleted = True
        self.is_active = False
        self.atualizado_em = datetime.now(timezone.utc)

    def registrar_login(self) -> None:
        """Atualiza a estampa temporal do último login realizado."""
        self.ultimo_login = datetime.now(timezone.utc)
        self.atualizado_em = datetime.now(timezone.utc)

    def pode_assinar_termos(self) -> bool:
        """Verifica se o perfil tem competência legal para assinar autos e termos de vistoria."""
        return self.perfil in (PerfilUsuario.FISCAL_TECNICO, PerfilUsuario.COORDENADOR, PerfilUsuario.ADMIN_MASTER)

    def pode_homologar_alvara(self) -> bool:
        """Verifica se o perfil pode aprovar e emitir alvarás sanitários."""
        return self.perfil in (PerfilUsuario.COORDENADOR, PerfilUsuario.ADMIN_MASTER)


@dataclass
class ConfiguracaoInstitucional:
    """
    Entidade pura Singleton com os parâmetros municipais da VISA.
    """
    id: uuid.UUID
    singleton_key: int = 1
    municipio: str = "Braúnas"
    uf: str = "MG"
    nome_prefeitura: str = "Prefeitura Municipal de Braúnas"
    nome_secretaria: str = "Secretaria Municipal de Saúde"
    orgao_vigilancia: str = "Coordenação de Vigilância em Saúde e Vigilância Sanitária"
    cnpj_institucional: Optional[str] = None
    logradouro: Optional[str] = None
    numero: Optional[str] = None
    bairro: Optional[str] = None
    cep: Optional[str] = None
    telefone_oficial: Optional[str] = None
    email_oficial: Optional[str] = None
    url_brasao_prefeitura: Optional[str] = None
    url_logo_vigilancia: Optional[str] = None
    texto_padrao_rodape_alvara: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_por: Optional[uuid.UUID] = None


@dataclass
class MetasExercicio:
    """
    Entidade pura representando o pacto anual de metas e indicadores da VISA.
    """
    id: uuid.UUID
    ano_exercicio: int
    meta_inspecoes_vapt: int = 0
    meta_cobertura_risco_1: float = 100.00
    meta_cobertura_risco_2: float = 100.00
    meta_cobertura_risco_3: float = 100.00
    dias_validade_padrao_alvara: int = 365
    dias_prazo_padrao_notificacao: int = 30
    observacoes_pactuacao: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    configurado_por: Optional[uuid.UUID] = None

    def __post_init__(self) -> None:
        if not (2020 <= self.ano_exercicio <= 2100):
            raise ValueError(f"Ano de exercício inválido: {self.ano_exercicio}. Deve estar entre 2020 e 2100.")
        for nome, valor in [
            ("meta_cobertura_risco_1", self.meta_cobertura_risco_1),
            ("meta_cobertura_risco_2", self.meta_cobertura_risco_2),
            ("meta_cobertura_risco_3", self.meta_cobertura_risco_3),
        ]:
            if not (0 <= valor <= 100):
                raise ValueError(f"Percentual de meta para {nome} deve ser entre 0% e 100%. Recebido: {valor}")


@dataclass
class LogAuditoria:
    """
    Entidade pura representativa da trilha append-only imutável de auditoria.
    """
    id: uuid.UUID
    tabela_afetada: str
    registro_id: str
    operacao: TipoOperacaoAuditoria
    acao: str
    identificador_entidade: Optional[str] = None
    detalhes: Optional[str] = None
    dados_anteriores: Optional[Dict[str, Any]] = None
    dados_novos: Optional[Dict[str, Any]] = None
    usuario_id: Optional[uuid.UUID] = None
    usuario_nome: Optional[str] = None
    usuario_matricula: Optional[str] = None
    ip_origem: Optional[str] = None
    user_agent: Optional[str] = None
    is_active: bool = True
    is_deleted: bool = False
    criado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    atualizado_em: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
