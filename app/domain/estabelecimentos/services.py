from typing import Iterable, List

from app.domain.estabelecimentos.entities import (
    CNAE,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
    VinculoCNAE,
)


class CalculadoraRiscoSanitarioService:
    """
    Serviço de Domínio que apura o Grau de Risco Sanitário Preponderante do Estabelecimento.
    Regra hierárquica oficial (ANVISA e VISA Estadual):
    - Se houver qualquer atividade de Risco III -> Risco III
    - Senão, se houver qualquer atividade de Risco II -> Risco II
    - Senão, se houver atividade de Risco I -> Risco I
    - Caso todas sejam Dispensadas -> Classificado operacionalmente como Risco I
    """

    @classmethod
    def calcular_risco_cnaes(cls, cnaes: Iterable[CNAE]) -> NivelRiscoSanitario:
        graus = {c.grau_risco_padrao for c in cnaes if c.is_active and not c.is_deleted}

        if NivelRiscoCNAE.RISCO_III in graus:
            return NivelRiscoSanitario.RISCO_III
        if NivelRiscoCNAE.RISCO_II in graus:
            return NivelRiscoSanitario.RISCO_II
        return NivelRiscoSanitario.RISCO_I

    @classmethod
    def calcular_risco_vinculos(cls, vinculos: Iterable[VinculoCNAE]) -> NivelRiscoSanitario:
        cnaes_validos: List[CNAE] = []
        for v in vinculos:
            if v.is_active and not v.is_deleted and v.cnae:
                cnaes_validos.append(v.cnae)
        return cls.calcular_risco_cnaes(cnaes_validos)
