import uuid
from abc import ABC, abstractmethod
from typing import List, Optional

from app.domain.estabelecimentos.entities import (
    CNAE,
    Estabelecimento,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
    RepresentanteLegal,
    ResponsavelTecnico,
    SituacaoCadastral,
    VinculoCNAE,
    VinculoRT,
)


class IEstabelecimentoRepository(ABC):
    """Contrato abstrato de repositório para Estabelecimentos e agregações."""

    @abstractmethod
    async def get_by_id(self, estabelecimento_id: uuid.UUID) -> Optional[Estabelecimento]:
        pass

    @abstractmethod
    async def get_by_cnpj_cpf(self, cnpj_cpf: str, include_deleted: bool = False) -> Optional[Estabelecimento]:
        pass

    @abstractmethod
    async def list_estabelecimentos(
        self,
        skip: int = 0,
        limit: int = 50,
        situacao: Optional[SituacaoCadastral] = None,
        risco: Optional[NivelRiscoSanitario] = None,
        busca: Optional[str] = None,
        only_active: bool = True,
        order_by: Optional[str] = None,
        order_direction: Optional[str] = "asc",
    ) -> List[Estabelecimento]:
        pass

    @abstractmethod
    async def count_estabelecimentos(
        self,
        situacao: Optional[SituacaoCadastral] = None,
        risco: Optional[NivelRiscoSanitario] = None,
        busca: Optional[str] = None,
        only_active: bool = True,
    ) -> int:
        pass

    @abstractmethod
    async def save(self, estabelecimento: Estabelecimento) -> Estabelecimento:
        pass

    @abstractmethod
    async def update(self, estabelecimento: Estabelecimento) -> Estabelecimento:
        pass

    @abstractmethod
    async def adicionar_cnae(self, vinculo: VinculoCNAE) -> VinculoCNAE:
        pass

    @abstractmethod
    async def remover_cnae(self, estabelecimento_id: uuid.UUID, cnae_id: uuid.UUID) -> None:
        pass

    @abstractmethod
    async def substituir_cnaes(
        self, estabelecimento_id: uuid.UUID, novos_vinculos: List[VinculoCNAE]
    ) -> None:
        pass


class ICNAERepository(ABC):
    """Contrato abstrato de repositório para o catálogo de CNAEs."""

    @abstractmethod
    async def get_by_id(self, cnae_id: uuid.UUID) -> Optional[CNAE]:
        pass

    @abstractmethod
    async def get_by_codigo(self, codigo: str) -> Optional[CNAE]:
        pass

    @abstractmethod
    async def list_cnaes(
        self,
        skip: int = 0,
        limit: int = 50,
        busca: Optional[str] = None,
        risco: Optional[NivelRiscoCNAE] = None,
    ) -> List[CNAE]:
        pass

    @abstractmethod
    async def count_cnaes(
        self,
        busca: Optional[str] = None,
        risco: Optional[NivelRiscoCNAE] = None,
    ) -> int:
        pass

    @abstractmethod
    async def save(self, cnae: CNAE) -> CNAE:
        pass


class IRepresentanteLegalRepository(ABC):
    """Contrato abstrato de repositório para Representantes Legais."""

    @abstractmethod
    async def get_by_id(self, rep_id: uuid.UUID) -> Optional[RepresentanteLegal]:
        pass

    @abstractmethod
    async def get_by_cpf(self, cpf: str) -> Optional[RepresentanteLegal]:
        pass

    @abstractmethod
    async def save(self, rep: RepresentanteLegal) -> RepresentanteLegal:
        pass

    @abstractmethod
    async def update(self, rep: RepresentanteLegal) -> RepresentanteLegal:
        pass
