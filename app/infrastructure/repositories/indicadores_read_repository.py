"""
Repositório Concreto de Leitura (CQRS Read Model) para Indicadores e Relatórios Sanitários
Consulta direta a Views SQL do PostgreSQL sem onerar tabelas transacionais de escrita.
"""
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.domain.indicadores.repositories import IIndicadoresReadRepository
from app.infrastructure.models.auth_models import (
    ConfiguracaoInstitucionalModel,
    MetasExercicioModel,
)
from app.infrastructure.models.fiscalizacao_models import InspecaoModel
from app.infrastructure.models.licenciamento_models import AlvaraSanitarioModel


class IndicadoresReadRepository(IIndicadoresReadRepository):
    def __init__(self, session: AsyncSession):
        self.session = session

    async def obter_metas_exercicio(self, ano: int) -> Optional[Dict[str, Any]]:
        stmt = (
            select(MetasExercicioModel)
            .where(
                MetasExercicioModel.ano_exercicio == ano,
                MetasExercicioModel.is_active.is_(True),
                MetasExercicioModel.is_deleted.is_(False),
            )
            .limit(1)
        )
        res = await self.session.execute(stmt)
        meta = res.scalar_one_or_none()
        if not meta:
            # Fallback para metas padrão do sistema caso o exercício ainda não tenha sido cadastrado
            return {
                "ano_exercicio": ano,
                "meta_inspecoes_vapt": 20,
                "meta_cobertura_risco_1": 100.00,
                "meta_cobertura_risco_2": 100.00,
                "meta_cobertura_risco_3": 100.00,
                "dias_validade_padrao_alvara": 365,
                "dias_prazo_padrao_notificacao": 30,
            }

        return {
            "ano_exercicio": meta.ano_exercicio,
            "meta_inspecoes_vapt": meta.meta_inspecoes_vapt,
            "meta_cobertura_risco_1": float(meta.meta_cobertura_risco_1),
            "meta_cobertura_risco_2": float(meta.meta_cobertura_risco_2),
            "meta_cobertura_risco_3": float(meta.meta_cobertura_risco_3),
            "dias_validade_padrao_alvara": meta.dias_validade_padrao_alvara,
            "dias_prazo_padrao_notificacao": meta.dias_prazo_padrao_notificacao,
        }

    async def obter_resumo_indicador_11_vapt(self, ano: int) -> Dict[str, Any]:
        """
        Consulta a view vw_indicador_11_vapt_consolidado
        """
        stmt = text("""
            SELECT 
                ano_exercicio,
                total_inspecoes_vapt,
                inspecoes_concluidas,
                inspecoes_em_andamento,
                estabelecimentos_distintos_atendidos
            FROM vw_indicador_11_vapt_consolidado
            WHERE ano_exercicio = :ano
        """)
        res = await self.session.execute(stmt, {"ano": ano})
        row = res.mappings().first()

        # Histórico geral de todos os exercícios registrados
        historico_stmt = text("""
            SELECT 
                ano_exercicio,
                total_inspecoes_vapt,
                inspecoes_concluidas,
                inspecoes_em_andamento,
                estabelecimentos_distintos_atendidos
            FROM vw_indicador_11_vapt_consolidado
            ORDER BY ano_exercicio DESC
        """)
        hist_res = await self.session.execute(historico_stmt)
        historico = [dict(r) for r in hist_res.mappings().all()]

        if not row:
            return {
                "ano_exercicio": ano,
                "total_inspecoes_vapt": 0,
                "inspecoes_concluidas": 0,
                "inspecoes_em_andamento": 0,
                "estabelecimentos_distintos_atendidos": 0,
                "historico": historico,
            }

        data = dict(row)
        data["historico"] = historico
        return data

    async def obter_cobertura_risco_consolidada(self, ano: int) -> Dict[str, Any]:
        """
        Consulta a view vw_estabelecimentos_risco_consolidado cruzando com inspeções e alvarás
        para calcular os universos e coberturas dos Indicadores 12 (Risco III), 13 (Risco II) e 14 (Risco I).
        """
        # Contagem de estabelecimentos ativos por grau de risco preponderante
        stmt_estab = text("""
            SELECT 
                v.risco_sanitario_preponderante AS grau_risco_preponderante,
                COUNT(v.estabelecimento_id) AS total
            FROM vw_estabelecimentos_risco_consolidado v
            JOIN estabelecimentos e ON v.estabelecimento_id = e.id
            WHERE e.situacao_estabelecimento = 'Ativo' AND e.is_deleted = FALSE
            GROUP BY v.risco_sanitario_preponderante
        """)
        res_estab = await self.session.execute(stmt_estab)
        estab_por_risco = {r["grau_risco_preponderante"]: r["total"] for r in res_estab.mappings().all()}

        total_ativos = sum(estab_por_risco.values())

        # Estabelecimentos fiscalizados / cobertos no exercício anual corrente
        # Risco III: Inspecionados no exercício (inspeção concluída no ano)
        stmt_cobertura = text("""
            SELECT 
                v.risco_sanitario_preponderante AS grau_risco_preponderante,
                COUNT(DISTINCT v.estabelecimento_id) AS total_fiscalizados
            FROM vw_estabelecimentos_risco_consolidado v
            JOIN estabelecimentos e ON v.estabelecimento_id = e.id
            JOIN inspecoes i ON v.estabelecimento_id = i.estabelecimento_id
            WHERE e.situacao_estabelecimento = 'Ativo'
              AND e.is_deleted = FALSE
              AND i.status = 'concluida'
              AND EXTRACT(YEAR FROM i.data_inicio) = :ano
              AND i.is_deleted = FALSE
            GROUP BY v.risco_sanitario_preponderante
        """)
        res_cob = await self.session.execute(stmt_cobertura, {"ano": ano})
        fiscalizados_por_risco = {r["grau_risco_preponderante"]: r["total_fiscalizados"] for r in res_cob.mappings().all()}

        # Total de inspeções no exercício
        stmt_total_insp = select(func.count(InspecaoModel.id)).where(
            func.extract("year", InspecaoModel.data_inicio) == ano,
            InspecaoModel.is_deleted.is_(False),
        )
        total_inspecoes = (await self.session.execute(stmt_total_insp)).scalar_one() or 0

        # Total de alvarás válidos/ativos
        stmt_alvaras = select(func.count(AlvaraSanitarioModel.id)).where(
            AlvaraSanitarioModel.status == "ativo",
            AlvaraSanitarioModel.is_active.is_(True),
            AlvaraSanitarioModel.is_deleted.is_(False),
        )
        total_alvaras = (await self.session.execute(stmt_alvaras)).scalar_one() or 0

        # Cálculo das coberturas percentuais
        def calc_cobertura(grau: str) -> Dict[str, Any]:
            universo = estab_por_risco.get(grau, 0)
            fisc = fiscalizados_por_risco.get(grau, 0)
            pct = round((fisc / universo * 100.0), 2) if universo > 0 else 100.0
            return {
                "grau_risco": grau,
                "universo_estabelecimentos": universo,
                "estabelecimentos_fiscalizados": fisc,
                "percentual_realizado": pct,
            }

        return {
            "ano_exercicio": ano,
            "total_estabelecimentos_ativos": total_ativos,
            "distribuicao_estabelecimentos": estab_por_risco,
            "total_inspecoes_exercicio": total_inspecoes,
            "total_alvaras_ativos": total_alvaras,
            "risco_3": calc_cobertura("Risco III"),
            "risco_2": calc_cobertura("Risco II"),
            "risco_1": calc_cobertura("Risco I"),
            "dispensado": calc_cobertura("Dispensado"),
        }

    async def listar_estabelecimentos_cobertura_detalhada(
        self,
        ano: int,
        grau_risco: str,
        apenas_nao_fiscalizados: bool = False,
    ) -> List[Dict[str, Any]]:
        base_query = """
            SELECT 
                e.id,
                e.cnpj_cpf,
                e.razao_social,
                e.nome_fantasia,
                e.grau_risco_preponderante AS grau_risco,
                e.situacao_alvara,
                e.numero_alvara,
                CASE WHEN ultima_insp.id IS NOT NULL THEN TRUE ELSE FALSE END AS fiscalizado_no_exercicio,
                TO_CHAR(ultima_insp.data_inicio, 'YYYY-MM-DD') AS data_ultima_inspecao,
                ultima_insp.resultado AS resultado_ultima_inspecao
            FROM vw_estabelecimentos_risco_consolidado e
            LEFT JOIN LATERAL (
                SELECT i.id, i.data_inicio, i.resultado
                FROM inspecoes i
                WHERE i.estabelecimento_id = e.id
                  AND i.status = 'concluida'
                  AND EXTRACT(YEAR FROM i.data_inicio) = :ano
                  AND i.is_deleted = FALSE
                ORDER BY i.data_inicio DESC
                LIMIT 1
            ) ultima_insp ON TRUE
            WHERE e.situacao_estabelecimento = 'Ativo'
              AND e.grau_risco_preponderante = :grau_risco
              AND (:apenas_nao_fiscalizados = FALSE OR ultima_insp.id IS NULL)
            ORDER BY e.razao_social ASC
        """
        res = await self.session.execute(
            text(base_query),
            {
                "ano": ano,
                "grau_risco": grau_risco,
                "apenas_nao_fiscalizados": apenas_nao_fiscalizados,
            },
        )
        return [dict(r) for r in res.mappings().all()]

    async def obter_painel_alertas_vencimento(self, limite_dias: int = 30) -> Dict[str, Any]:
        """
        Consulta combinada de notificações e documentos a vencer
        """
        # 1. Notificações com prazo a vencer da view vw_inspecoes_notificacoes_a_vencer
        stmt_notif = text("""
            SELECT 
                v.inspecao_id,
                v.numero_termo,
                v.estabelecimento_id,
                v.razao_social,
                e.cnpj_cpf,
                v.fiscal_responsavel,
                TO_CHAR(i.data_inicio, 'YYYY-MM-DD') AS data_inicio,
                TO_CHAR(v.data_limite_adequacao, 'YYYY-MM-DD') AS data_limite_cumprimento,
                v.dias_restantes,
                CASE
                    WHEN v.dias_restantes <= 5 THEN 'Crítico'
                    WHEN v.dias_restantes <= 15 THEN 'Moderado'
                    ELSE 'Normal'
                END AS urgencia_vencimento
            FROM vw_inspecoes_notificacoes_a_vencer v
            JOIN estabelecimentos e ON v.estabelecimento_id = e.id
            JOIN inspecoes i ON v.inspecao_id = i.id
            ORDER BY v.dias_restantes ASC
            LIMIT 50
        """)
        res_notif = await self.session.execute(stmt_notif)
        notificacoes = [dict(r) for r in res_notif.mappings().all()]

        # 2. Documentos com prazo a vencer da view vw_documentos_proximos_vencimento
        stmt_docs = text("""
            SELECT 
                ed.id AS documento_id,
                v.estabelecimento_id,
                v.razao_social,
                v.nome_documento,
                td.categoria,
                TO_CHAR(v.data_validade, 'YYYY-MM-DD') AS data_vencimento,
                v.dias_para_vencer AS dias_para_vencimento,
                'Vigente' AS status_vigencia
            FROM vw_documentos_proximos_vencimento v
            JOIN estabelecimento_documentos ed ON v.estabelecimento_id = ed.estabelecimento_id
                AND v.data_validade = ed.data_validade
                AND ed.eh_versao_atual = TRUE
                AND ed.is_deleted = FALSE
            JOIN tipos_documentos td ON ed.tipo_documento_id = td.id
            ORDER BY v.dias_para_vencer ASC
            LIMIT 50
        """)
        res_docs = await self.session.execute(stmt_docs)
        documentos = [dict(r) for r in res_docs.mappings().all()]

        criticos_notif = sum(1 for n in notificacoes if n.get("dias_restantes", 0) <= 5)

        return {
            "total_notificacoes_criticas": criticos_notif,
            "total_documentos_vencendo": len(documentos),
            "notificacoes": notificacoes,
            "documentos": documentos,
        }

    async def gerar_dados_relatorio_oficial(self, ano: int) -> Dict[str, Any]:
        # Configuração Institucional do Município
        stmt_config = select(ConfiguracaoInstitucionalModel).limit(1)
        res_config = await self.session.execute(stmt_config)
        config = res_config.scalar_one_or_none()

        config_dict = {
            "municipio": config.municipio if config else "Braúnas",
            "uf": config.uf if config else "MG",
            "nome_prefeitura": config.nome_prefeitura if config else "Prefeitura Municipal de Braúnas",
            "nome_secretaria": config.nome_secretaria if config else "Secretaria Municipal de Saúde",
            "nome_coordenadoria": config.nome_coordenadoria if config else "Coordenação Municipal de Vigilância Sanitária",
        }

        return {
            "configuracao": config_dict,
            "ano_exercicio": ano,
        }
