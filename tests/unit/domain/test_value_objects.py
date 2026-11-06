"""
Testes Unitários: Value Objects do Domínio (DDD)
Sprint QA-04 - VigiMinas.

Validação estrita sem I/O de banco: CPF, CNPJ, CEP, NumeroTermo e CodigoAutenticidadeAlvara.
"""

import pytest

from app.domain.auth.value_objects import (
    CPF,
    InvalidCPFException,
    Email,
    InvalidEmailException,
)
from app.domain.estabelecimentos.value_objects import (
    CNPJ,
    InvalidCNPJException,
    CEP,
    InvalidCEPException,
)
from app.domain.fiscalizacao.value_objects import (
    NumeroTermo,
    InvalidNumeroTermoException,
)
from app.domain.licenciamento.value_objects import (
    CodigoAutenticidadeAlvara,
    NumeroProtocoloRequerimento,
    NumeroFormatadoAlvara,
)


class TestCPFValueObject:
    def test_cpf_valido_com_e_sem_formatacao(self):
        # CPF com dígitos verificadores matematicamente válidos
        cpf1 = CPF("111.444.777-35")
        assert cpf1.valor == "11144477735"
        assert cpf1.formatado == "111.444.777-35"
        assert str(cpf1) == "111.444.777-35"

        cpf2 = CPF("11144477735")
        assert cpf2.valor == "11144477735"
        assert cpf2.formatado == "111.444.777-35"

    def test_cpf_rejeita_digitos_repetidos(self):
        with pytest.raises(InvalidCPFException, match="repetição de dígitos"):
            CPF("111.111.111-11")

        with pytest.raises(InvalidCPFException, match="repetição de dígitos"):
            CPF("00000000000")

    def test_cpf_rejeita_tamanho_incorreto(self):
        with pytest.raises(InvalidCPFException, match="exatamente 11 dígitos"):
            CPF("123.456.789-0")

        with pytest.raises(InvalidCPFException, match="exatamente 11 dígitos"):
            CPF("123456789012")

    def test_cpf_rejeita_digito_verificador_invalido(self):
        # 111.444.777-35 é válido; vamos alterar o primeiro DV (3 -> 4)
        with pytest.raises(InvalidCPFException, match="Primeiro dígito verificador"):
            CPF("111.444.777-45")

        # Agora alterando o segundo DV (5 -> 6)
        with pytest.raises(InvalidCPFException, match="Segundo dígito verificador"):
            CPF("111.444.777-36")


class TestCNPJValueObject:
    def test_cnpj_valido_com_e_sem_formatacao(self):
        # CNPJ com dígitos verificadores válidos: 18.303.187/0001-68
        cnpj1 = CNPJ("18.303.187/0001-68")
        assert cnpj1.valor == "18303187000168"
        assert cnpj1.formatado == "18.303.187/0001-68"
        assert str(cnpj1) == "18.303.187/0001-68"

        # Outro CNPJ válido: 00.000.000/0001-91 (Banco do Brasil)
        cnpj2 = CNPJ("00000000000191")
        assert cnpj2.valor == "00000000000191"
        assert cnpj2.formatado == "00.000.000/0001-91"

    def test_cnpj_rejeita_digitos_repetidos(self):
        with pytest.raises(InvalidCNPJException, match="repetição de dígitos"):
            CNPJ("11.111.111/1111-11")

    def test_cnpj_rejeita_tamanho_incorreto(self):
        with pytest.raises(InvalidCNPJException, match="exatamente 14 dígitos"):
            CNPJ("18.303.187/0001-6")

        with pytest.raises(InvalidCNPJException, match="exatamente 14 dígitos"):
            CNPJ("1830318700016899")

    def test_cnpj_rejeita_digito_verificador_invalido(self):
        # 18.303.187/0001-68 -> alterando 1º DV para 5
        with pytest.raises(InvalidCNPJException, match="Primeiro dígito verificador"):
            CNPJ("18.303.187/0001-58")

        # 18.303.187/0001-68 -> mantendo 1º DV (6) e alterando 2º DV para 0
        with pytest.raises(InvalidCNPJException, match="Segundo dígito verificador"):
            CNPJ("18.303.187/0001-60")


class TestCEPValueObject:
    def test_cep_valido_e_mascara(self):
        cep1 = CEP("35.189-000")
        assert cep1.valor == "35189000"
        assert cep1.formatado == "35189-000"
        assert str(cep1) == "35189-000"

        cep2 = CEP("35189000")
        assert cep2.valor == "35189000"
        assert cep2.formatado == "35189-000"

    def test_cep_rejeita_comprimento_invalido(self):
        with pytest.raises(InvalidCEPException, match="exatamente 8 dígitos"):
            CEP("35189-00")

        with pytest.raises(InvalidCEPException, match="exatamente 8 dígitos"):
            CEP("35189-0000")


class TestNumeroTermoValueObject:
    def test_numero_termo_valido(self):
        termo = NumeroTermo("ti-2026/001 ")
        assert termo.valor == "TI-2026/001"
        assert str(termo) == "TI-2026/001"

    def test_numero_termo_vazio_rejeitado(self):
        with pytest.raises(InvalidNumeroTermoException, match="não pode ser vazio"):
            NumeroTermo("")

        with pytest.raises(InvalidNumeroTermoException, match="não pode ser vazio"):
            NumeroTermo("   ")

    def test_numero_termo_excedente_rejeitado(self):
        with pytest.raises(InvalidNumeroTermoException, match="não pode exceder 50 caracteres"):
            NumeroTermo("T" * 51)


class TestCodigoAutenticidadeAlvara:
    def test_codigo_autenticidade_formato_e_geracao(self):
        codigo = CodigoAutenticidadeAlvara("8F2C7B19-2026")
        assert codigo.valor == "8F2C7B19-2026"
        assert str(codigo.valor) == "8F2C7B19-2026"

        # Geração dinâmica
        gerado = CodigoAutenticidadeAlvara.gerar(exercicio=2026)
        assert len(gerado.valor) == 13
        assert gerado.valor.endswith("-2026")

    def test_codigo_autenticidade_vazio_rejeitado(self):
        with pytest.raises(ValueError, match="não pode ser vazio"):
            CodigoAutenticidadeAlvara("")

    def test_codigo_autenticidade_tamanho_maximo(self):
        with pytest.raises(ValueError, match="não pode exceder 32 caracteres"):
            CodigoAutenticidadeAlvara("A" * 35)


class TestOutrosValueObjects:
    def test_email_valido_e_invalido(self):
        email = Email(" VISA@Braunas.MG.GOV.BR ")
        assert email.endereco == "visa@braunas.mg.gov.br"

        with pytest.raises(InvalidEmailException):
            Email("invalido_sem_arroba.com")

    def test_numero_protocolo_requerimento(self):
        proto = NumeroProtocoloRequerimento.gerar(sequencial=1, exercicio=2026)
        assert proto.valor == "REQ-2026-00001"

    def test_numero_formatado_alvara(self):
        alv = NumeroFormatadoAlvara.criar(numero=1, exercicio=2026)
        assert alv.valor == "001/2026"
