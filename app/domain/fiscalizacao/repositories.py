import uuid
from abc import ABC, abstractmethod
from datetime import date
from typing import Any, Dict, List, Optional

from app.domain.fiscalizacao.entities import (
    Inspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)


class IInspecaoRepository(ABC):
    """Contrato abstrato de repositório para Inspeções e Termos Fiscais."""

    @abstractmethod
    async def get_by_id(self, inspecao_id: uuid.UUID) -> Optional[Inspecao]:
        pass

    @abstractmethod
    async def get_by_numero_termo(self, numero_termo: str) -> Optional[Inspecao]:
        pass

    @abstractmethod
    async def list_inspecoes(
        self,
        skip: int = 0,
        limit: int = 50,
        estabelecimento_id: Optional[uuid.UUID] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        motivo: Optional[TipoMotivoInspecao] = None,
        status: Optional[StatusInspecao] = None,
        data_inicio_de: Optional[date] = None,
        data_inicio_ate: Optional[date] = None,
        only_active: bool = True,
    ) -> List[Inspecao]:
        pass

    @abstractmethod
    async def count_inspecoes(
        self,
        estabelecimento_id: Optional[uuid.UUID] = None,
        fiscal_id: Optional[uuid.UUID] = None,
        motivo: Optional[TipoMotivoInspecao] = None,
        status: Optional[StatusInspecao] = None,
        data_inicio_de: Optional[date] = None,
        data_inicio_ate: Optional[date] = None,
        only_active: bool = True,
    ) -> int:
        pass

    @abstractmethod
    async def save(self, inspecao: Inspecao) -> Inspecao:
        pass

    @abstractmethod
    async def update(self, inspecao: Inspecao) -> Inspecao:
        pass

    @abstractmethod
    async def obter_notificacoes_pendentes(
        self, limite_dias: int = 30
    ) -> List[Dict[str, Any]]:
        """Retorna alertas das notificações com prazo de adequação vencendo."""
        pass

    @abstractmethod
    async def obter_indicador_11_consolidado(
        self, exercicio: Optional[int] = None
    ) -> List[Dict[str, Any]]:
        """Retorna a consolidação anual das ações VAPT em Saúde do Trabalhador."""
        pass
