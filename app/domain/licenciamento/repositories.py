"""
Módulo de Domínio: Interfaces Abstratas de Repositório para Licenciamento Sanitário e Alvarás
"""
from abc import ABC, abstractmethod
from typing import List, Optional, Tuple
import uuid

from app.domain.licenciamento.entities import AlvaraSanitario, RequerimentoAlvara
from app.domain.licenciamento.enums import StatusAlvara, StatusRequerimento


class IRequerimentoRepository(ABC):
    @abstractmethod
    async def salvar(self, requerimento: RequerimentoAlvara) -> RequerimentoAlvara:
        pass

    @abstractmethod
    async def buscar_por_id(self, id: uuid.UUID) -> Optional[RequerimentoAlvara]:
        pass

    @abstractmethod
    async def buscar_por_protocolo(self, protocolo: str) -> Optional[RequerimentoAlvara]:
        pass

    @abstractmethod
    async def obter_proximo_sequencial(self, ano: int) -> int:
        pass

    @abstractmethod
    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[StatusRequerimento] = None,
        estabelecimento_id: Optional[uuid.UUID] = None,
        apenas_fila_trabalho: bool = False,
    ) -> Tuple[List[RequerimentoAlvara], int]:
        pass


class IAlvaraRepository(ABC):
    @abstractmethod
    async def salvar(self, alvara: AlvaraSanitario) -> AlvaraSanitario:
        pass

    @abstractmethod
    async def buscar_por_id(self, id: uuid.UUID) -> Optional[AlvaraSanitario]:
        pass

    @abstractmethod
    async def buscar_por_autenticidade(self, codigo_autenticidade: str) -> Optional[AlvaraSanitario]:
        pass

    @abstractmethod
    async def obter_proximo_numero_exercicio(self, exercicio: int) -> int:
        pass

    @abstractmethod
    async def buscar_alvara_vigente_estabelecimento(self, estabelecimento_id: uuid.UUID) -> Optional[AlvaraSanitario]:
        pass

    @abstractmethod
    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        estabelecimento_id: Optional[uuid.UUID] = None,
        exercicio: Optional[int] = None,
        status: Optional[StatusAlvara] = None,
    ) -> Tuple[List[AlvaraSanitario], int]:
        pass
