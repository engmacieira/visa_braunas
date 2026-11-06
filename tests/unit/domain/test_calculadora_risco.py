"""
Testes Unitários: Calculadora de Risco Sanitário Preponderante
Sprint QA-04 - VigiMinas.

Validação exaustiva da regra hierárquica oficial de precedência de risco sanitário:
- Presença de ao menos 1 CNAE de Risco III -> Risco Sanitário = Risco III
- Apenas CNAEs de Risco II e Risco I -> Risco Sanitário = Risco II
- Apenas CNAEs de Risco I -> Risco Sanitário = Risco I
- Apenas CNAEs Dispensados -> Risco Sanitário = Risco I (operacional)
"""

import uuid
import pytest

from app.domain.estabelecimentos.entities import (
    CNAE,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
    VinculoCNAE,
)
from app.domain.estabelecimentos.services import CalculadoraRiscoSanitarioService


def _criar_cnae(grau_risco: NivelRiscoCNAE, is_active: bool = True, is_deleted: bool = False) -> CNAE:
    return CNAE(
        id=uuid.uuid4(),
        codigo=f"CNAE-{uuid.uuid4().hex[:5]}",
        descricao="Atividade Econômica de Teste",
        grau_risco_padrao=grau_risco,
        is_active=is_active,
        is_deleted=is_deleted,
    )


def _criar_vinculo(cnae: CNAE, eh_principal: bool = False, is_active: bool = True, is_deleted: bool = False) -> VinculoCNAE:
    return VinculoCNAE(
        id=uuid.uuid4(),
        estabelecimento_id=uuid.uuid4(),
        cnae_id=cnae.id,
        cnae_codigo=cnae.codigo,
        eh_principal=eh_principal,
        cnae=cnae,
        is_active=is_active,
        is_deleted=is_deleted,
    )


class TestCalculadoraRiscoSanitario:
    def test_presenca_de_pelo_menos_um_cnae_risco_iii_determina_risco_iii(self):
        cnae_disp = _criar_cnae(NivelRiscoCNAE.DISPENSADO)
        cnae_r1 = _criar_cnae(NivelRiscoCNAE.RISCO_I)
        cnae_r2 = _criar_cnae(NivelRiscoCNAE.RISCO_II)
        cnae_r3 = _criar_cnae(NivelRiscoCNAE.RISCO_III)

        # Mix com Risco III
        risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes(
            [cnae_disp, cnae_r1, cnae_r2, cnae_r3]
        )
        assert risco == NivelRiscoSanitario.RISCO_III

        # Apenas Risco III
        risco_solo = CalculadoraRiscoSanitarioService.calcular_risco_cnaes([cnae_r3])
        assert risco_solo == NivelRiscoSanitario.RISCO_III

    def test_apenas_cnaes_risco_ii_e_risco_i_determina_risco_ii(self):
        cnae_disp = _criar_cnae(NivelRiscoCNAE.DISPENSADO)
        cnae_r1 = _criar_cnae(NivelRiscoCNAE.RISCO_I)
        cnae_r2 = _criar_cnae(NivelRiscoCNAE.RISCO_II)

        risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes(
            [cnae_disp, cnae_r1, cnae_r2]
        )
        assert risco == NivelRiscoSanitario.RISCO_II

        # Apenas Risco II
        risco_solo = CalculadoraRiscoSanitarioService.calcular_risco_cnaes([cnae_r2])
        assert risco_solo == NivelRiscoSanitario.RISCO_II

    def test_apenas_cnaes_risco_i_determina_risco_i(self):
        cnae_disp = _criar_cnae(NivelRiscoCNAE.DISPENSADO)
        cnae_r1 = _criar_cnae(NivelRiscoCNAE.RISCO_I)

        risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes([cnae_disp, cnae_r1])
        assert risco == NivelRiscoSanitario.RISCO_I

        # Apenas Risco I
        risco_solo = CalculadoraRiscoSanitarioService.calcular_risco_cnaes([cnae_r1])
        assert risco_solo == NivelRiscoSanitario.RISCO_I

    def test_apenas_cnaes_dispensados_determina_risco_i_operacional(self):
        cnae_disp1 = _criar_cnae(NivelRiscoCNAE.DISPENSADO)
        cnae_disp2 = _criar_cnae(NivelRiscoCNAE.DISPENSADO)

        # Regra de negócio: dispensados são classificados operacionalmente como Risco I
        risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes([cnae_disp1, cnae_disp2])
        assert risco == NivelRiscoSanitario.RISCO_I

    def test_cnaes_inativos_ou_excluidos_sao_desconsiderados_no_calculo(self):
        # Se um CNAE Risco III foi excluído logicamente (soft delete) ou está inativo, não deve puxar para Risco III
        cnae_r3_inativo = _criar_cnae(NivelRiscoCNAE.RISCO_III, is_active=False)
        cnae_r3_deleted = _criar_cnae(NivelRiscoCNAE.RISCO_III, is_deleted=True)
        cnae_r2_ativo = _criar_cnae(NivelRiscoCNAE.RISCO_II, is_active=True, is_deleted=False)

        risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes(
            [cnae_r3_inativo, cnae_r3_deleted, cnae_r2_ativo]
        )
        assert risco == NivelRiscoSanitario.RISCO_II

    def test_calculo_atraves_de_vinculos_de_cnae(self):
        cnae_r3 = _criar_cnae(NivelRiscoCNAE.RISCO_III)
        cnae_r1 = _criar_cnae(NivelRiscoCNAE.RISCO_I)

        vinc1 = _criar_vinculo(cnae_r1, eh_principal=True)
        vinc2 = _criar_vinculo(cnae_r3, eh_principal=False)

        # Mesmo com CNAE principal Risco I, a atividade secundária Risco III puxa o risco preponderante
        risco = CalculadoraRiscoSanitarioService.calcular_risco_vinculos([vinc1, vinc2])
        assert risco == NivelRiscoSanitario.RISCO_III

        # Desativando o vínculo de risco III
        vinc2_inativo = _criar_vinculo(cnae_r3, eh_principal=False, is_active=False)
        risco_sem_vinc2 = CalculadoraRiscoSanitarioService.calcular_risco_vinculos([vinc1, vinc2_inativo])
        assert risco_sem_vinc2 == NivelRiscoSanitario.RISCO_I
