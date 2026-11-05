import re
from dataclasses import dataclass


class InvalidNumeroTermoException(ValueError):
    """Lançada quando a numeração de termo fiscal for inválida."""
    pass


@dataclass(frozen=True)
class NumeroTermo:
    """
    Value Object imutável representando a numeração oficial de um Termo de Inspeção / Vistoria Sanitária.
    Exemplos: 'TI-2026/001', 'NOT-2026/012', 'VAPT-2026/003'.
    """
    valor: str

    def __post_init__(self) -> None:
        limpo = (self.valor or "").strip().upper()
        if not limpo:
            raise InvalidNumeroTermoException("O número do termo fiscal não pode ser vazio.")
        if len(limpo) > 50:
            raise InvalidNumeroTermoException(f"O número do termo fiscal não pode exceder 50 caracteres: '{limpo}'")
        object.__setattr__(self, "valor", limpo)

    def __str__(self) -> str:
        return self.valor
