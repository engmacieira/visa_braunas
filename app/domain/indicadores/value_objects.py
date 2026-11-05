"""
Módulo de Domínio: Value Objects Analíticos para Indicadores Sanitários e CQRS
"""
from dataclasses import dataclass
from decimal import Decimal
from enum import Enum


class StatusCumprimentoMeta(str, Enum):
    ATINGIDA = "Atingida"
    EM_ANDAMENTO = "Em Andamento"
    CRITICA = "Crítica"


@dataclass(frozen=True)
class ScoreIndicador:
    valor: Decimal
    unidade: str = "%"

    def __post_init__(self):
        if self.unidade == "%" and (self.valor < Decimal("0.00")):
            object.__setattr__(self, "valor", Decimal("0.00"))

    @property
    def formatado(self) -> str:
        if self.unidade == "%":
            return f"{self.valor:.1f}%"
        return f"{self.valor} {self.unidade}"


@dataclass(frozen=True)
class ProgressoMeta:
    meta_pactuada: Decimal
    realizado: Decimal
    percentual_atingido: Decimal
    status: StatusCumprimentoMeta

    @classmethod
    def calcular(
        cls,
        meta: Decimal | int | float,
        realizado: Decimal | int | float,
    ) -> "ProgressoMeta":
        m = Decimal(str(meta)) if not isinstance(meta, Decimal) else meta
        r = Decimal(str(realizado)) if not isinstance(realizado, Decimal) else realizado

        if m <= Decimal("0"):
            pct = Decimal("100.00") if r > Decimal("0") else Decimal("0.00")
        else:
            pct = (r / m) * Decimal("100.00")

        pct_arredondado = round(pct, 2)

        if pct_arredondado >= Decimal("100.00"):
            status = StatusCumprimentoMeta.ATINGIDA
        elif pct_arredondado >= Decimal("60.00"):
            status = StatusCumprimentoMeta.EM_ANDAMENTO
        else:
            status = StatusCumprimentoMeta.CRITICA

        return cls(
            meta_pactuada=round(m, 2),
            realizado=round(r, 2),
            percentual_atingido=pct_arredondado,
            status=status,
        )
