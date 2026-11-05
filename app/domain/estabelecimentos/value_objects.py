import re
from dataclasses import dataclass


class InvalidCNPJException(ValueError):
    """Lançada quando um CNPJ possui formato ou dígitos verificadores inválidos."""
    pass


class InvalidCPFException(ValueError):
    """Lançada quando um CPF possui formato ou dígitos verificadores inválidos."""
    pass


class InvalidCEPException(ValueError):
    """Lançada quando um CEP possui formato inválido."""
    pass


@dataclass(frozen=True)
class CNPJ:
    """
    Value Object imutável representando o Cadastro Nacional da Pessoa Jurídica (CNPJ).
    Valida estritamente os 14 dígitos e o algoritmo oficial de dígitos verificadores da Receita Federal.
    """
    valor: str

    def __post_init__(self) -> None:
        apenas_digitos = re.sub(r"\D", "", self.valor or "")
        if len(apenas_digitos) != 14:
            raise InvalidCNPJException(f"CNPJ deve conter exatamente 14 dígitos numéricos: '{self.valor}'")

        if len(set(apenas_digitos)) == 1:
            raise InvalidCNPJException(f"CNPJ inválido por repetição de dígitos: '{self.valor}'")

        # 1º Dígito Verificador
        pesos_1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma_1 = sum(int(apenas_digitos[i]) * pesos_1[i] for i in range(12))
        resto_1 = soma_1 % 11
        dv_1 = 0 if resto_1 < 2 else 11 - resto_1
        if dv_1 != int(apenas_digitos[12]):
            raise InvalidCNPJException(f"Primeiro dígito verificador do CNPJ inválido: '{self.valor}'")

        # 2º Dígito Verificador
        pesos_2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        soma_2 = sum(int(apenas_digitos[i]) * pesos_2[i] for i in range(13))
        resto_2 = soma_2 % 11
        dv_2 = 0 if resto_2 < 2 else 11 - resto_2
        if dv_2 != int(apenas_digitos[13]):
            raise InvalidCNPJException(f"Segundo dígito verificador do CNPJ inválido: '{self.valor}'")

        object.__setattr__(self, "valor", apenas_digitos)

    @property
    def formatado(self) -> str:
        d = self.valor
        return f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"

    def __str__(self) -> str:
        return self.formatado


@dataclass(frozen=True)
class CPF:
    """
    Value Object imutável representando o Cadastro de Pessoa Física (CPF).
    """
    valor: str

    def __post_init__(self) -> None:
        apenas_digitos = re.sub(r"\D", "", self.valor or "")
        if len(apenas_digitos) != 11:
            raise InvalidCPFException(f"CPF deve conter exatamente 11 dígitos numéricos: '{self.valor}'")

        if len(set(apenas_digitos)) == 1:
            raise InvalidCPFException(f"CPF inválido por repetição de dígitos: '{self.valor}'")

        soma_1 = sum(int(apenas_digitos[i]) * (10 - i) for i in range(9))
        resto_1 = (soma_1 * 10) % 11
        dv_1 = 0 if resto_1 == 10 else resto_1
        if dv_1 != int(apenas_digitos[9]):
            raise InvalidCPFException(f"Primeiro dígito verificador do CPF inválido: '{self.valor}'")

        soma_2 = sum(int(apenas_digitos[i]) * (11 - i) for i in range(10))
        resto_2 = (soma_2 * 10) % 11
        dv_2 = 0 if resto_2 == 10 else resto_2
        if dv_2 != int(apenas_digitos[10]):
            raise InvalidCPFException(f"Segundo dígito verificador do CPF inválido: '{self.valor}'")

        object.__setattr__(self, "valor", apenas_digitos)

    @property
    def formatado(self) -> str:
        d = self.valor
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"

    def __str__(self) -> str:
        return self.formatado


@dataclass(frozen=True)
class CEP:
    """
    Value Object imutável representando o Código de Endereçamento Postal (CEP).
    """
    valor: str

    def __post_init__(self) -> None:
        apenas_digitos = re.sub(r"\D", "", self.valor or "")
        if len(apenas_digitos) != 8:
            raise InvalidCEPException(f"CEP deve conter exatamente 8 dígitos numéricos: '{self.valor}'")
        object.__setattr__(self, "valor", apenas_digitos)

    @property
    def formatado(self) -> str:
        d = self.valor
        return f"{d[:5]}-{d[5:]}"

    def __str__(self) -> str:
        return self.formatado
