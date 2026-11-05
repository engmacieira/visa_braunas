"""
Módulo de Domínio: Value Objects para Licenciamento Sanitário e Alvarás
"""
from dataclasses import dataclass
from datetime import datetime
import re
import uuid


@dataclass(frozen=True)
class NumeroProtocoloRequerimento:
    valor: str

    def __post_init__(self):
        if not self.valor or not self.valor.strip():
            raise ValueError("O número do protocolo não pode ser vazio.")
        cleaned = self.valor.strip().upper()
        if len(cleaned) > 35:
            raise ValueError("O número do protocolo não pode exceder 35 caracteres.")
        object.__setattr__(self, "valor", cleaned)

    @classmethod
    def gerar(cls, sequencial: int, exercicio: int | None = None) -> "NumeroProtocoloRequerimento":
        ano = exercicio or datetime.now().year
        return cls(f"REQ-{ano}-{sequencial:05d}")


@dataclass(frozen=True)
class CodigoAutenticidadeAlvara:
    """
    Gera e valida o hash seguro para o QR Code e fé pública no formato XXXXXXXX-YYYY
    Exemplo: '8F2C7B19-2026'
    """
    valor: str

    def __post_init__(self):
        if not self.valor or not self.valor.strip():
            raise ValueError("O código de autenticidade do alvará não pode ser vazio.")
        cleaned = self.valor.strip().upper()
        if not re.match(r"^[A-F0-9]{8}-\d{4}$", cleaned):
            if len(cleaned) > 32:
                raise ValueError("O código de autenticidade não pode exceder 32 caracteres.")
        object.__setattr__(self, "valor", cleaned)

    @classmethod
    def gerar(cls, exercicio: int | None = None) -> "CodigoAutenticidadeAlvara":
        ano = exercicio or datetime.now().year
        token = uuid.uuid4().hex[:8].upper()
        return cls(f"{token}-{ano}")


@dataclass(frozen=True)
class NumeroFormatadoAlvara:
    numero: int
    exercicio: int
    valor: str

    def __post_init__(self):
        if self.numero <= 0:
            raise ValueError("O número do alvará deve ser um inteiro positivo.")
        if self.exercicio < 2020 or self.exercicio > 2100:
            raise ValueError("O exercício do alvará deve estar entre 2020 e 2100.")
        formatado = f"{self.numero:03d}/{self.exercicio}"
        if not self.valor:
            object.__setattr__(self, "valor", formatado)
        elif self.valor != formatado:
            object.__setattr__(self, "valor", formatado)

    @classmethod
    def criar(cls, numero: int, exercicio: int) -> "NumeroFormatadoAlvara":
        return cls(numero=numero, exercicio=exercicio, valor=f"{numero:03d}/{exercicio}")
