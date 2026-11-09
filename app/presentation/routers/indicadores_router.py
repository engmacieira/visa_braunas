"""
Router FastAPI: Indicadores Regulatórios, Metas Anuais e Relatórios Oficiais (CQRS Read Projections)
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi_cache.decorator import cache
from sqlalchemy.ext.asyncio import AsyncSession

from app.application.indicadores.dtos import (
    DashboardMetasConsolidadoDTO,
    PainelAlertasVencimentoDTO,
    RelatorioIndicador11DetalhadoDTO,
    RelatorioOficialExercicioDTO,
    RelatorioRiscoCoberturaDTO,
)
from app.application.indicadores.queries.gerar_relatorio_oficial import (
    GerarRelatorioOficialExercicioQuery,
)
from app.application.indicadores.queries.obter_dashboard_indicadores import (
    ObterDashboardIndicadoresQuery,
)
from app.core.constants import (
    PRAZO_PADRAO_NOTIFICACAO_DIAS,
    PRAZO_VALIDADE_ALVARA_DIAS,
)
from app.domain.auth.entities import PerfilUsuario, Usuario
from app.infrastructure.database import get_db_session
from app.infrastructure.repositories.indicadores_read_repository import (
    IndicadoresReadRepository,
)
from app.presentation.dependencies import get_current_active_user, require_roles

router = APIRouter(prefix="/indicadores", tags=["Indicadores Sanitários e Relatórios"])


def get_indicadores_read_repo(session: AsyncSession = Depends(get_db_session)) -> IndicadoresReadRepository:
    return IndicadoresReadRepository(session)


@router.get(
    "/dashboard",
    response_model=DashboardMetasConsolidadoDTO,
    summary="Dashboard Consolidado de Metas e Indicadores Regulatórios (11 a 15)",
)
@cache(expire=300)
async def obter_dashboard_indicadores(
    ano: Optional[int] = Query(None, description="Ano civil de exercício (padrão: ano corrente)"),
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(get_current_active_user),
):
    query = ObterDashboardIndicadoresQuery(repo)
    return await query.execute(ano_exercicio=ano)


@router.get(
    "/vapt-11",
    response_model=RelatorioIndicador11DetalhadoDTO,
    summary="Relatório Analítico do Indicador 11: Ações VAPT em Saúde do Trabalhador",
)
async def obter_relatorio_indicador_11(
    ano: Optional[int] = Query(None, description="Ano civil do exercício"),
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(get_current_active_user),
):
    ano_alvo = ano or 2026
    metas = await repo.obter_metas_exercicio(ano_alvo)
    meta_vapt = metas.get("meta_inspecoes_vapt", 20) if metas else 20
    dados = await repo.obter_resumo_indicador_11_vapt(ano_alvo)

    concluidas = dados.get("inspecoes_concluidas", 0)
    pct = round((concluidas / meta_vapt * 100.0), 2) if meta_vapt > 0 else 100.0
    status_meta = "Atingida" if pct >= 100.0 else ("Em Andamento" if pct >= 60.0 else "Crítica")

    return RelatorioIndicador11DetalhadoDTO(
        ano_exercicio=ano_alvo,
        meta_pactuada=meta_vapt,
        total_acoes_realizadas=dados.get("total_inspecoes_vapt", 0),
        acoes_concluidas=concluidas,
        acoes_em_andamento=dados.get("inspecoes_em_andamento", 0),
        estabelecimentos_distintos_atendidos=dados.get("estabelecimentos_distintos_atendidos", 0),
        percentual_atingido=pct,
        status_cumprimento=status_meta,
        historico_exercicios=dados.get("historico", []),
    )


@router.get(
    "/cobertura-risco/{grau_risco}",
    response_model=RelatorioRiscoCoberturaDTO,
    summary="Cobertura Sanitária por Grau de Risco (Indicadores 12, 13 e 14)",
)
async def obter_cobertura_por_risco(
    grau_risco: str,
    ano: Optional[int] = Query(None),
    apenas_pendentes: bool = Query(False, description="Exibir apenas empresas ainda não fiscalizadas"),
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(get_current_active_user),
):
    grau_normalizado = grau_risco.strip()
    if grau_normalizado.lower() in ["risco_3", "risco-3", "risco 3", "risco iii", "3"]:
        grau_alvo = "Risco III"
    elif grau_normalizado.lower() in ["risco_2", "risco-2", "risco 2", "risco ii", "2"]:
        grau_alvo = "Risco II"
    elif grau_normalizado.lower() in ["risco_1", "risco-1", "risco 1", "risco i", "1"]:
        grau_alvo = "Risco I"
    elif grau_normalizado.lower() in ["dispensado", "dispensados"]:
        grau_alvo = "Dispensado"
    else:
        grau_alvo = grau_risco

    ano_alvo = ano or 2026
    metas = await repo.obter_metas_exercicio(ano_alvo)
    meta_map = {
        "Risco III": metas.get("meta_cobertura_risco_3", 100.0) if metas else 100.0,
        "Risco II": metas.get("meta_cobertura_risco_2", 100.0) if metas else 100.0,
        "Risco I": metas.get("meta_cobertura_risco_1", 100.0) if metas else 100.0,
        "Dispensado": 100.0,
    }

    estabelecimentos = await repo.listar_estabelecimentos_cobertura_detalhada(
        ano=ano_alvo,
        grau_risco=grau_alvo,
        apenas_nao_fiscalizados=apenas_pendentes,
    )

    total_cadastradas = len(estabelecimentos)
    total_fisc = sum(1 for e in estabelecimentos if e.get("fiscalizado_no_exercicio", False))
    pct_realizado = round((total_fisc / total_cadastradas * 100.0), 2) if total_cadastradas > 0 else 100.0
    meta_pct = float(meta_map.get(grau_alvo, 100.0))
    status_cob = "Atingida" if pct_realizado >= meta_pct else ("Em Andamento" if pct_realizado >= (meta_pct * 0.6) else "Crítica")

    return RelatorioRiscoCoberturaDTO(
        ano_exercicio=ano_alvo,
        grau_risco=grau_alvo,
        total_estabelecimentos_cadastrados=total_cadastradas,
        total_estabelecimentos_fiscalizados=total_fisc,
        percentual_cobertura_realizado=pct_realizado,
        meta_cobertura_pactuada=meta_pct,
        status_cobertura=status_cob,
        estabelecimentos=estabelecimentos,
    )


@router.get(
    "/alertas",
    response_model=PainelAlertasVencimentoDTO,
    summary="Painel de Alertas de Vencimento de Notificações e Documentos",
)
async def obter_alertas_vencimento(
    limite_dias: int = Query(PRAZO_PADRAO_NOTIFICACAO_DIAS, ge=1, le=180),
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(get_current_active_user),
):
    dados = await repo.obter_painel_alertas_vencimento(limite_dias=limite_dias)
    return PainelAlertasVencimentoDTO(
        total_notificacoes_criticas=dados.get("total_notificacoes_criticas", 0),
        total_documentos_vencendo=dados.get("total_documentos_vencendo", 0),
        notificacoes=dados.get("notificacoes", []),
        documentos=dados.get("documentos", []),
    )


@router.get(
    "/relatorio-oficial",
    response_model=RelatorioOficialExercicioDTO,
    summary="Relatório Oficial do Exercício para Prestação de Contas ao SUS",
)
async def gerar_relatorio_oficial(
    ano: Optional[int] = Query(None),
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR])),
):
    query = GerarRelatorioOficialExercicioQuery(repo)
    return await query.execute(ano_exercicio=ano)


@router.get(
    "/relatorio-sus/{ano}",
    response_model=RelatorioOficialExercicioDTO,
    summary="Relatório Oficial do Exercício para Prestação de Contas ao SUS (DIGISUS)",
)
async def gerar_relatorio_sus_ano(
    ano: int,
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(require_roles([PerfilUsuario.ADMIN_MASTER, PerfilUsuario.COORDENADOR])),
):
    query = GerarRelatorioOficialExercicioQuery(repo)
    return await query.execute(ano_exercicio=ano)


@router.get(
    "/metas/{ano}",
    summary="Metas pactuadas para o exercício informado",
)
async def obter_metas_exercicio_endpoint(
    ano: int,
    repo: IndicadoresReadRepository = Depends(get_indicadores_read_repo),
    _: Usuario = Depends(get_current_active_user),
):
    metas = await repo.obter_metas_exercicio(ano)
    if not metas:
        return {
            "ano_exercicio": ano,
            "meta_inspecoes_vapt": 20,
            "meta_cobertura_risco_1": 100.0,
            "meta_cobertura_risco_2": 100.0,
            "meta_cobertura_risco_3": 100.0,
            "dias_validade_padrao_alvara": PRAZO_VALIDADE_ALVARA_DIAS,
            "dias_prazo_padrao_notificacao": PRAZO_PADRAO_NOTIFICACAO_DIAS,
        }
    return metas

