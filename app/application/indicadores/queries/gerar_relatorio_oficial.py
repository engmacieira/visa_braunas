"""
Query CQRS: Gerar Relatório Oficial do Exercício Sanitário (Prestação de Contas SUS)
"""
from datetime import datetime

from app.application.indicadores.dtos import (
    IndicadorItemDTO,
    ProgressoMetaDTO,
    RelatorioOficialExercicioDTO,
)
from app.application.indicadores.queries.obter_dashboard_indicadores import (
    ObterDashboardIndicadoresQuery,
)
from app.domain.indicadores.repositories import IIndicadoresReadRepository


class GerarRelatorioOficialExercicioQuery:
    def __init__(self, read_repo: IIndicadoresReadRepository):
        self.read_repo = read_repo
        self.dashboard_query = ObterDashboardIndicadoresQuery(read_repo)

    async def execute(self, ano_exercicio: int | None = None) -> RelatorioOficialExercicioDTO:
        ano = ano_exercicio or datetime.now().year

        dados_oficiais = await self.read_repo.gerar_dados_relatorio_oficial(ano)
        dashboard_dto = await self.dashboard_query.execute(ano)

        indicadores_lista = [
            dashboard_dto.indicador_11_vapt,
            dashboard_dto.indicador_12_risco_3,
            dashboard_dto.indicador_13_risco_2,
            dashboard_dto.indicador_14_risco_1,
            dashboard_dto.indicador_15_sintetico,
        ]

        config = dados_oficiais.get("configuracao", {})
        return RelatorioOficialExercicioDTO(
            municipio=config.get("municipio", "Braúnas"),
            uf=config.get("uf", "MG"),
            nome_prefeitura=config.get("nome_prefeitura", "Prefeitura Municipal de Braúnas"),
            nome_secretaria=config.get("nome_secretaria", "Secretaria Municipal de Saúde"),
            nome_coordenadoria=config.get("nome_coordenadoria", "Coordenação Municipal de Vigilância Sanitária"),
            ano_exercicio=ano,
            data_emissao_relatorio=datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
            indicadores_sintese=indicadores_lista,
            resumo_geral={
                "total_estabelecimentos_cadastrados": dashboard_dto.total_estabelecimentos_cadastrados,
                "distribuicao_por_risco": dashboard_dto.distribuicao_estabelecimentos_por_risco,
                "total_inspecoes_exercicio": dashboard_dto.total_inspecoes_exercicio,
                "total_alvaras_ativos": dashboard_dto.total_alvaras_ativos,
                "acoes_vapt_concluidas": dashboard_dto.indicador_11_vapt.progresso.realizado,
                "status_geral_metas": dashboard_dto.indicador_15_sintetico.progresso.status,
            },
        )
