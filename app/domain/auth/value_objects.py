import re
from dataclasses import dataclass


class InvalidCPFException(ValueError):
    """Lançada quando um CPF possui formato ou dígitos verificadores inválidos."""
    pass


class InvalidEmailException(ValueError):
    """Lançada quando um endereço de e-mail possui formato sintaticamente inválido."""
    pass


@dataclass(frozen=True)
class CPF:
    """
    Value Object imutável representando o Cadastro de Pessoa Física (CPF).
    Valida estritamente os 11 dígitos e o cálculo oficial dos dígitos verificadores da Receita Federal.
    """
    valor: str

    def __post_init__(self) -> None:
        apenas_digitos = re.sub(r"\D", "", self.valor or "")
        if len(apenas_digitos) != 11:
            raise InvalidCPFException(f"CPF deve conter exatamente 11 dígitos numéricos: '{self.valor}'")

        # Rejeita CPFs compostos por sequências repetidas (ex: 111.111.111-11)
        if len(set(apenas_digitos)) == 1:
            raise InvalidCPFException(f"CPF inválido por repetição de dígitos: '{self.valor}'")

        # Validação do primeiro dígito verificador
        soma_1 = sum(int(apenas_digitos[i]) * (10 - i) for i in range(9))
        resto_1 = (soma_1 * 10) % 11
        dv_1 = 0 if resto_1 == 10 else resto_1
        if dv_1 != int(apenas_digitos[9]):
            raise InvalidCPFException(f"Primeiro dígito verificador do CPF inválido: '{self.valor}'")

        # Validação do segundo dígito verificador
        soma_2 = sum(int(apenas_digitos[i]) * (11 - i) for i in range(10))
        resto_2 = (soma_2 * 10) % 11
        dv_2 = 0 if resto_2 == 10 else resto_2
        if dv_2 != int(apenas_digitos[10]):
            raise InvalidCPFException(f"Segundo dígito verificador do CPF inválido: '{self.valor}'")

        object.__setattr__(self, "valor", apenas_digitos)

    @property
    def formatado(self) -> str:
        """Retorna o CPF formatado no padrão XXX.XXX.XXX-XX."""
        d = self.valor
        return f"{d[:3]}.{d[3:6]}.{d[6:9]}-{d[9:]}"

    def __str__(self) -> str:
        return self.formatado


@dataclass(frozen=True)
class Email:
    """
    Value Object imutável representando um endereço de e-mail corporativo/oficial.
    """
    endereco: str

    _EMAIL_REGEX = re.compile(
        r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    )

    def __post_init__(self) -> None:
        limpo = (self.endereco or "").strip().lower()
        if not limpo or not self._EMAIL_REGEX.match(limpo):
            raise InvalidEmailException(f"Endereço de e-mail inválido: '{self.endereco}'")
        object.__setattr__(self, "endereco", limpo)

    def __str__(self) -> str:
        return self.endereco
