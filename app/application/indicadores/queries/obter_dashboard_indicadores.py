"""
Query CQRS: Obter Dashboard Consolidado de Metas e Indicadores Regulatórios
"""
from datetime import datetime
from decimal import Decimal

from app.application.indicadores.dtos import (
    BlocoUniversalResumoDTO,
    DashboardMetasConsolidadoDTO,
    IndicadorItemDTO,
    IndicadorUniversalDetalheDTO,
    ProgressoMetaDTO,
)
from app.domain.indicadores.repositories import IIndicadoresReadRepository
from app.domain.indicadores.value_objects import ProgressoMeta


class ObterDashboardIndicadoresQuery:
    def __init__(self, read_repo: IIndicadoresReadRepository):
        self.read_repo = read_repo

    async def execute(self, ano_exercicio: int | None = None) -> DashboardMetasConsolidadoDTO:
        ano = ano_exercicio or datetime.now().year

        # 1. Apuração oficial dos 5 Indicadores Universais do SES/MG para Braúnas/MG
        dados_oficiais = await self.read_repo.obter_resumo_indicadores_universais(ano)
        bloco_resumo = BlocoUniversalResumoDTO(**dados_oficiais["bloco_universal"])

        ind_11_dto = IndicadorUniversalDetalheDTO(**dados_oficiais["indicador_11"])
        ind_12_dto = IndicadorUniversalDetalheDTO(**dados_oficiais["indicador_12"])
        ind_13_dto = IndicadorUniversalDetalheDTO(**dados_oficiais["indicador_13"])
        ind_14_dto = IndicadorUniversalDetalheDTO(**dados_oficiais["indicador_14"])
        ind_15_dto = IndicadorUniversalDetalheDTO(**dados_oficiais["indicador_15"])

        lista_indicadores = [ind_11_dto, ind_12_dto, ind_13_dto, ind_14_dto, ind_15_dto]

        # 2. Metas pactuadas para o exercício (para retrocompatibilidade legada)
        metas = await self.read_repo.obter_metas_exercicio(ano)
        meta_vapt = metas.get("meta_inspecoes_vapt", 2) if metas else 2
        meta_risco_1 = metas.get("meta_cobertura_risco_1", Decimal("100.00")) if metas else Decimal("100.00")
        meta_risco_2 = metas.get("meta_cobertura_risco_2", Decimal("100.00")) if metas else Decimal("100.00")
        meta_risco_3 = metas.get("meta_cobertura_risco_3", Decimal("100.00")) if metas else Decimal("100.00")

        # Dados VAPT legados
        dados_vapt = await self.read_repo.obter_resumo_indicador_11_vapt(ano)
        vapt_realizado = dados_vapt.get("inspecoes_concluidas", 0)
        progresso_vapt = ProgressoMeta.calcular(meta=meta_vapt, realizado=vapt_realizado)

        # Cobertura por Grau de Risco legada
        dados_cobertura = await self.read_repo.obter_cobertura_risco_consolidada(ano)
        risco_3_dados = dados_cobertura.get("risco_3", {})
        risco_2_dados = dados_cobertura.get("risco_2", {})
        risco_1_dados = dados_cobertura.get("risco_1", {})

        progresso_risco_3 = ProgressoMeta.calcular(
            meta=meta_risco_3,
            realizado=risco_3_dados.get("percentual_realizado", 0.0),
        )
        progresso_risco_2 = ProgressoMeta.calcular(
            meta=meta_risco_2,
            realizado=risco_2_dados.get("percentual_realizado", 0.0),
        )
        progresso_risco_1 = ProgressoMeta.calcular(
            meta=meta_risco_1,
            realizado=risco_1_dados.get("percentual_realizado", 0.0),
        )

        pct_vapt = min(progresso_vapt.percentual_atingido, Decimal("100.00"))
        pct_r3 = min(progresso_risco_3.percentual_atingido, Decimal("100.00"))
        pct_r2 = min(progresso_risco_2.percentual_atingido, Decimal("100.00"))
        pct_r1 = min(progresso_risco_1.percentual_atingido, Decimal("100.00"))
        media_sintetica = (pct_vapt + pct_r3 + pct_r2 + pct_r1) / Decimal("4.00")
        progresso_sintetico = ProgressoMeta.calcular(meta=100.00, realizado=media_sintetica)

        distribuicao = dados_oficiais.get("distribuicao_estabelecimentos_por_risco", {})

        return DashboardMetasConsolidadoDTO(
            ano_exercicio=ano,
            bloco_universal=bloco_resumo,
            indicadores=lista_indicadores,
            indicador_11=ind_11_dto,
            indicador_12=ind_12_dto,
            indicador_13=ind_13_dto,
            indicador_14=ind_14_dto,
            indicador_15=ind_15_dto,
            # Campos retrocompatíveis legados
            indicador_11_vapt=IndicadorItemDTO(
                codigo="IND-11",
                titulo="Indicador 11: Ações VAPT em Saúde do Trabalhador",
                descricao="Inspeções e vistorias sanitárias em ambientes e processos de trabalho concluídas no município.",
                unidade="ações",
                progresso=ProgressoMetaDTO(
                    meta_pactuada=float(progresso_vapt.meta_pactuada),
                    realizado=float(progresso_vapt.realizado),
                    percentual_atingido=float(progresso_vapt.percentual_atingido),
                    status=progresso_vapt.status.value,
                ),
            ),
            indicador_12_risco_3=IndicadorItemDTO(
                codigo="IND-12",
                titulo="Indicador 12: Cobertura Sanitária de Risco III (Alto Risco)",
                descricao="Percentual de estabelecimentos classificados em Alto Risco inspecionados no exercício corrente.",
                unidade="%",
                progresso=ProgressoMetaDTO(
                    meta_pactuada=float(progresso_risco_3.meta_pactuada),
                    realizado=float(progresso_risco_3.realizado),
                    percentual_atingido=float(progresso_risco_3.percentual_atingido),
                    status=progresso_risco_3.status.value,
                ),
            ),
            indicador_13_risco_2=IndicadorItemDTO(
                codigo="IND-13",
                titulo="Indicador 13: Cobertura Sanitária de Risco II (Médio Risco)",
                descricao="Percentual de estabelecimentos de Médio Risco cadastrados fiscalizados ou monitorados no município.",
                unidade="%",
                progresso=ProgressoMetaDTO(
                    meta_pactuada=float(progresso_risco_2.meta_pactuada),
                    realizado=float(progresso_risco_2.realizado),
                    percentual_atingido=float(progresso_risco_2.percentual_atingido),
                    status=progresso_risco_2.status.value,
                ),
            ),
            indicador_14_risco_1=IndicadorItemDTO(
                codigo="IND-14",
                titulo="Indicador 14: Licenciamento / Declarações de Risco I (Baixo Risco)",
                descricao="Percentual de atividades econômicas de Baixo Risco licenciadas, autodeclaradas ou regularizadas.",
                unidade="%",
                progresso=ProgressoMetaDTO(
                    meta_pactuada=float(progresso_risco_1.meta_pactuada),
                    realizado=float(progresso_risco_1.realizado),
                    percentual_atingido=float(progresso_risco_1.percentual_atingido),
                    status=progresso_risco_1.status.value,
                ),
            ),
            indicador_15_sintetico=IndicadorItemDTO(
                codigo="IND-15",
                titulo="Indicador 15: Índice Sintético Geral de Cumprimento de Metas",
                descricao="Média harmônica do desempenho institucional em relação a todas as metas regulatórias pactuadas.",
                unidade="%",
                progresso=ProgressoMetaDTO(
                    meta_pactuada=float(progresso_sintetico.meta_pactuada),
                    realizado=float(progresso_sintetico.realizado),
                    percentual_atingido=float(progresso_sintetico.percentual_atingido),
                    status=progresso_sintetico.status.value,
                ),
            ),
            total_estabelecimentos_cadastrados=dados_oficiais.get("total_estabelecimentos_cadastrados", 0),
            distribuicao_estabelecimentos_por_risco=distribuicao,
            total_inspecoes_exercicio=dados_oficiais.get("total_inspecoes_exercicio", 0),
            total_alvaras_ativos=dados_oficiais.get("total_alvaras_ativos", 0),
            atualizado_em=datetime.now(),
        )
