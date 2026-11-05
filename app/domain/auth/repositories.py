import uuid
from abc import ABC, abstractmethod
from typing import List, Optional

from app.domain.auth.entities import (
    ConfiguracaoInstitucional,
    LogAuditoria,
    MetasExercicio,
    PerfilUsuario,
    Usuario,
)


class IUsuarioRepository(ABC):
    """Contrato abstrato de persistência para Usuários/Servidores."""

    @abstractmethod
    async def get_by_id(self, user_id: uuid.UUID) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def get_by_email(self, email: str, include_deleted: bool = False) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def get_by_cpf(self, cpf: str, include_deleted: bool = False) -> Optional[Usuario]:
        pass

    @abstractmethod
    async def list_usuarios(
        self,
        skip: int = 0,
        limit: int = 100,
        perfil: Optional[PerfilUsuario] = None,
        only_active: bool = True,
    ) -> List[Usuario]:
        pass

    @abstractmethod
    async def count_usuarios(
        self,
        perfil: Optional[PerfilUsuario] = None,
        only_active: bool = True,
    ) -> int:
        pass

    @abstractmethod
    async def save(self, usuario: Usuario) -> Usuario:
        pass

    @abstractmethod
    async def update(self, usuario: Usuario) -> Usuario:
        pass


class IConfiguracaoRepository(ABC):
    """Contrato abstrato de persistência para Configuração Institucional Singleton."""

    @abstractmethod
    async def get_singleton(self) -> Optional[ConfiguracaoInstitucional]:
        pass

    @abstractmethod
    async def save(self, config: ConfiguracaoInstitucional) -> ConfiguracaoInstitucional:
        pass


class IMetasRepository(ABC):
    """Contrato abstrato de persistência para Metas do Exercício."""

    @abstractmethod
    async def get_by_ano(self, ano: int) -> Optional[MetasExercicio]:
        pass

    @abstractmethod
    async def get_exercicio_vigente(self) -> Optional[MetasExercicio]:
        pass

    @abstractmethod
    async def save(self, metas: MetasExercicio) -> MetasExercicio:
        pass


class IAuditoriaRepository(ABC):
    """Contrato abstrato de persistência para a Trilha de Auditoria Append-Only."""

    @abstractmethod
    async def registrar(self, log: LogAuditoria) -> LogAuditoria:
        pass

    @abstractmethod
    async def list_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        tabela: Optional[str] = None,
        usuario_id: Optional[uuid.UUID] = None,
    ) -> List[LogAuditoria]:
        pass

    @abstractmethod
    async def count_logs(
        self,
        tabela: Optional[str] = None,
        usuario_id: Optional[uuid.UUID] = None,
    ) -> int:
        pass
