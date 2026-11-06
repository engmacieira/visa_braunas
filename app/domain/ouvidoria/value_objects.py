from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class NumeroProtocoloDenuncia:
    valor: str

    def __post_init__(self):
        if not self.valor or not self.valor.strip():
            raise ValueError("O número do protocolo da denúncia não pode ser vazio.")
        cleaned = self.valor.strip().upper()
        if len(cleaned) > 35:
            raise ValueError("O número do protocolo da denúncia não pode exceder 35 caracteres.")
        object.__setattr__(self, "valor", cleaned)

    @classmethod
    def gerar(cls, sequencial: int, exercicio: int | None = None) -> "NumeroProtocoloDenuncia":
        ano = exercicio or datetime.now().year
        return cls(f"DEN-{ano}-{sequencial:05d}")
