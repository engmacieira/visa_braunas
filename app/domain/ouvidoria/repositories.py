"""
Módulo de Domínio: Interfaces Abstratas de Repositório para Ouvidoria e Denúncias Sanitárias
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
import uuid

from app.domain.ouvidoria.entities import Denuncia, GravidadeDenuncia, StatusDenuncia


class IDenunciaRepository(ABC):
    @abstractmethod
    async def salvar(self, denuncia: Denuncia) -> Denuncia:
        pass

    @abstractmethod
    async def buscar_por_id(self, id: uuid.UUID) -> Optional[Denuncia]:
        pass

    @abstractmethod
    async def buscar_por_protocolo(self, protocolo: str) -> Optional[Denuncia]:
        pass

    @abstractmethod
    async def obter_proximo_sequencial(self, ano: int) -> int:
        pass

    @abstractmethod
    async def listar(
        self,
        skip: int = 0,
        limit: int = 50,
        status: Optional[StatusDenuncia] = None,
        gravidade: Optional[GravidadeDenuncia] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        estabelecimento_id: Optional[uuid.UUID] = None,
    ) -> Tuple[List[Denuncia], int]:
        pass

    @abstractmethod
    async def listar_fila_trabalho(
        self,
        skip: int = 0,
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        pass
