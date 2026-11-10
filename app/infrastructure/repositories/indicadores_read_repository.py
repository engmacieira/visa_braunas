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


CTE_ESTABELECIMENTOS_RISCO = """
    WITH estab_com_risco AS (
        SELECT 
            e.id AS estabelecimento_id,
            e.id,
            e.cnpj_cpf,
            e.razao_social,
            e.nome_fantasia,
            e.situacao_alvara,
            e.numero_alvara,
            CASE 
                -- 1. Prioriza CNAEs consolidados na view oficial caso existam com Risco III / Alto
                WHEN v.risco_sanitario_preponderante::text IN ('Risco III', '3', 'RISCO_III', 'alto') THEN 'Risco III'
                -- 2. Senão, se e.nivel_risco cadastrado for Risco III / 3
                WHEN e.nivel_risco::text IN ('Risco III', '3', 'RISCO_III', 'alto') THEN 'Risco III'

                -- 3. Prioriza CNAEs consolidados na view oficial caso existam com Risco II / Médio
                WHEN v.risco_sanitario_preponderante::text IN ('Risco II', '2', 'RISCO_II', 'medio') THEN 'Risco II'
                -- 4. Senão, se e.nivel_risco cadastrado for Risco II / 2
                WHEN e.nivel_risco::text IN ('Risco II', '2', 'RISCO_II', 'medio') THEN 'Risco II'

                -- 5. Prioriza CNAEs consolidados na view oficial caso existam com Risco I / Baixo / Dispensado
                WHEN v.risco_sanitario_preponderante::text IN ('Risco I', '1', 'RISCO_I', 'baixo', 'Dispensado') THEN 'Risco I'
                -- 6. Senão, se e.nivel_risco cadastrado for Risco I / 1 / Dispensado
                WHEN e.nivel_risco::text IN ('Risco I', '1', 'RISCO_I', 'baixo', 'Dispensado') THEN 'Risco I'

                -- 7. Fallback seguro: Risco I (Baixo Risco)
                ELSE 'Risco I'
            END AS grau_risco
        FROM estabelecimentos e
        LEFT JOIN vw_estabelecimentos_risco_consolidado v ON e.id = v.estabelecimento_id
        WHERE e.situacao_estabelecimento = 'Ativo' AND e.is_deleted = FALSE
    )
"""


def normalizar_grau_risco(grau: Any) -> str:
    g = str(grau).strip().lower()
    if g in ("3", "risco_3", "risco-3", "risco 3", "risco iii", "alto"):
        return "Risco III"
    if g in ("2", "risco_2", "risco-2", "risco 2", "risco ii", "medio"):
        return "Risco II"
    if g in ("1", "risco_1", "risco-1", "risco 1", "risco i", "baixo", "dispensado", "dispensados"):
        return "Risco I"
    return "Risco I"


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
        Calcula os universos e coberturas dos Indicadores por grau de risco (Risco III, Risco II e Risco I),
        utilizando a apuração canônica sem perdas por ausência de vínculos.
        """
        # Contagem de estabelecimentos ativos por grau de risco
        stmt_estab = text(f"""
            {CTE_ESTABELECIMENTOS_RISCO}
            SELECT 
                grau_risco AS grau_risco_preponderante,
                COUNT(estabelecimento_id) AS total
            FROM estab_com_risco
            GROUP BY grau_risco
        """)
        res_estab = await self.session.execute(stmt_estab)
        estab_por_risco = {r["grau_risco_preponderante"]: r["total"] for r in res_estab.mappings().all()}

        total_ativos = sum(estab_por_risco.values())

        # Estabelecimentos fiscalizados / cobertos no exercício anual corrente
        stmt_cobertura = text(f"""
            {CTE_ESTABELECIMENTOS_RISCO}
            SELECT 
                er.grau_risco AS grau_risco_preponderante,
                COUNT(DISTINCT er.estabelecimento_id) AS total_fiscalizados
            FROM estab_com_risco er
            JOIN inspecoes i ON er.estabelecimento_id = i.estabelecimento_id
            WHERE i.status::text IN ('concluida', 'CONCLUIDA', 'concluido', 'realizada')
              AND EXTRACT(YEAR FROM i.data_inicio) = :ano
              AND i.is_deleted = FALSE
            GROUP BY er.grau_risco
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
        grau_alvo = normalizar_grau_risco(grau_risco)
        base_query = f"""
            {CTE_ESTABELECIMENTOS_RISCO}
            SELECT 
                er.id,
                er.cnpj_cpf,
                er.razao_social,
                er.nome_fantasia,
                er.grau_risco,
                er.situacao_alvara,
                er.numero_alvara,
                CASE WHEN ultima_insp.id IS NOT NULL THEN TRUE ELSE FALSE END AS fiscalizado_no_exercicio,
                TO_CHAR(ultima_insp.data_inicio, 'YYYY-MM-DD') AS data_ultima_inspecao,
                ultima_insp.resultado::text AS resultado_ultima_inspecao
            FROM estab_com_risco er
            LEFT JOIN LATERAL (
                SELECT i.id, i.data_inicio, i.resultado
                FROM inspecoes i
                WHERE i.estabelecimento_id = er.id
                  AND i.status::text IN ('concluida', 'CONCLUIDA', 'concluido', 'realizada')
                  AND EXTRACT(YEAR FROM i.data_inicio) = :ano
                  AND i.is_deleted = FALSE
                ORDER BY i.data_inicio DESC
                LIMIT 1
            ) ultima_insp ON TRUE
            WHERE er.grau_risco = :grau_risco
              AND (:apenas_nao_fiscalizados = FALSE OR ultima_insp.id IS NULL)
            ORDER BY er.razao_social ASC
        """
        res = await self.session.execute(
            text(base_query),
            {
                "ano": ano,
                "grau_risco": grau_alvo,
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
            "nome_coordenadoria": getattr(config, "orgao_vigilancia", "Coordenação Municipal de Vigilância Sanitária") if config else "Coordenação Municipal de Vigilância Sanitária",
        }

        return {
            "configuracao": config_dict,
            "ano_exercicio": ano,
        }

    async def obter_resumo_indicadores_universais(self, ano: int) -> Dict[str, Any]:
        """
        Calcula a apuração oficial do Bloco Universal dos Indicadores 11 a 15
        conforme as fichas técnicas pactuadas do Estado de Minas Gerais (SES/MG) para Braúnas/MG.
        """
        # 1. Total de estabelecimentos ativos e distribuição por risco
        stmt_estab = text(f"""
            {CTE_ESTABELECIMENTOS_RISCO}
            SELECT 
                grau_risco,
                COUNT(estabelecimento_id) AS total
            FROM estab_com_risco
            GROUP BY grau_risco
        """)
        res_estab = await self.session.execute(stmt_estab)
        estab_por_risco = {r["grau_risco"]: r["total"] for r in res_estab.mappings().all()}
        total_ativos = sum(estab_por_risco.values())

        # 2. Estabelecimentos fiscalizados no ano por grau de risco
        stmt_fisc = text(f"""
            {CTE_ESTABELECIMENTOS_RISCO}
            SELECT 
                er.grau_risco,
                COUNT(DISTINCT er.estabelecimento_id) AS total_fiscalizados
            FROM estab_com_risco er
            JOIN inspecoes i ON er.estabelecimento_id = i.estabelecimento_id
            WHERE i.status::text IN ('concluida', 'CONCLUIDA', 'concluido', 'realizada')
              AND EXTRACT(YEAR FROM i.data_inicio) = :ano
              AND i.is_deleted = FALSE
            GROUP BY er.grau_risco
        """)
        res_fisc = await self.session.execute(stmt_fisc, {"ano": ano})
        fisc_por_risco = {r["grau_risco"]: r["total_fiscalizados"] for r in res_fisc.mappings().all()}

        # 3. Total de inspeções e alvarás
        stmt_total_insp = select(func.count(InspecaoModel.id)).where(
            func.extract("year", InspecaoModel.data_inicio) == ano,
            InspecaoModel.is_deleted.is_(False),
        )
        total_inspecoes = (await self.session.execute(stmt_total_insp)).scalar_one() or 0

        stmt_alvaras = select(func.count(AlvaraSanitarioModel.id)).where(
            AlvaraSanitarioModel.status == "ativo",
            AlvaraSanitarioModel.is_active.is_(True),
            AlvaraSanitarioModel.is_deleted.is_(False),
        )
        total_alvaras = (await self.session.execute(stmt_alvaras)).scalar_one() or 0

        # =========================================================================
        # INDICADOR 11: VAPT - Saúde do Trabalhador
        # Meta: 2 ações para porte populacional de 2.001 a 10.000 habitantes (Braúnas/MG)
        # =========================================================================
        stmt_vapt = text("""
            SELECT COUNT(DISTINCT i.id) AS total_concluidas
            FROM inspecoes i
            WHERE i.motivo = 'vapt_trabalhador'
              AND i.status = 'concluida'
              AND EXTRACT(YEAR FROM i.data_inicio) = :ano
              AND i.is_deleted = FALSE
        """)
        vapt_concluidas = (await self.session.execute(stmt_vapt, {"ano": ano})).scalar_one() or 0

        meta_vapt = 2.0
        num_vapt = float(vapt_concluidas)
        pct_vapt = round((num_vapt / meta_vapt * 100.0), 2)
        atingiu_vapt = num_vapt >= 2.0 or pct_vapt >= 90.0
        pontos_vapt = 5.0 if atingiu_vapt else round(min(5.0, (pct_vapt / 100.0) * 5.0), 2)
        status_vapt = "Atingida" if atingiu_vapt else ("Em Andamento" if num_vapt >= 1.0 else "Crítica")

        ind_11 = {
            "codigo": "IND-11",
            "numero": 11,
            "titulo": "Indicador 11: Inspeções em Ambientes e Processos de Trabalho (VAPT)",
            "descricao": "Inspeções sanitárias em ambientes de trabalho visando identificação de riscos ocupacionais (Meta SES/MG: 2 ações).",
            "unidade": "ações",
            "peso_financeiro_percentual": 5.0,
            "numerador": num_vapt,
            "denominador": meta_vapt,
            "meta_pactuada": meta_vapt,
            "meta_percentual": 100.0,
            "percentual_alcancado": pct_vapt,
            "atingiu_meta": atingiu_vapt,
            "status": status_vapt,
            "pontuacao_alcancada": pontos_vapt,
            "grau_risco_rotulo": "Saúde do Trabalhador",
            "progresso": {
                "meta_pactuada": meta_vapt,
                "realizado": num_vapt,
                "percentual_atingido": pct_vapt,
                "status": status_vapt,
            },
        }

        # =========================================================================
        # INDICADOR 12: Atualização do Cadastro Municipal de Estabelecimentos
        # Meta: 1 (Envio/consolidação da base municipal anual)
        # =========================================================================
        stmt_cad = text("""
            SELECT COUNT(DISTINCT e.id) AS total_cadastros_validos
            FROM estabelecimentos e
            JOIN estabelecimento_cnaes ec ON e.id = ec.estabelecimento_id
            WHERE e.situacao_estabelecimento = 'Ativo'
              AND e.is_deleted = FALSE
              AND ec.is_deleted = FALSE
        """)
        cadastros_validos = (await self.session.execute(stmt_cad)).scalar_one() or 0
        num_cad = 1.0 if cadastros_validos > 0 else 0.0
        meta_cad = 1.0
        pct_cad = 100.0 if num_cad >= 1.0 else 0.0
        atingiu_cad = num_cad >= 1.0
        pontos_cad = 5.0 if atingiu_cad else 0.0
        status_cad = "Atingida" if atingiu_cad else "Crítica"

        ind_12 = {
            "codigo": "IND-12",
            "numero": 12,
            "titulo": "Indicador 12: Atualização do Cadastro Municipal de Estabelecimentos",
            "descricao": "Consolidação anual e sincronização da base de estabelecimentos ativos com CNAEs de interesse sanitário.",
            "unidade": "remessa",
            "peso_financeiro_percentual": 5.0,
            "numerador": num_cad,
            "denominador": meta_cad,
            "meta_pactuada": meta_cad,
            "meta_percentual": 100.0,
            "percentual_alcancado": pct_cad,
            "atingiu_meta": atingiu_cad,
            "status": status_cad,
            "pontuacao_alcancada": pontos_cad,
            "grau_risco_rotulo": "Cadastro Municipal",
            "progresso": {
                "meta_pactuada": meta_cad,
                "realizado": num_cad,
                "percentual_atingido": pct_cad,
                "status": status_cad,
            },
        }

        # =========================================================================
        # INDICADOR 13: Inspeções em Estabelecimentos de Nível de Risco I (Baixo Risco)
        # Meta: >= 15% de cobertura de inspeção
        # =========================================================================
        den_r1 = float(estab_por_risco.get("Risco I", 0))
        num_r1 = float(fisc_por_risco.get("Risco I", 0))
        pct_cob_r1 = round((num_r1 / den_r1 * 100.0), 2) if den_r1 > 0 else 100.0
        meta_pct_r1 = 15.0
        atingiu_r1 = pct_cob_r1 >= meta_pct_r1
        pontos_r1 = 5.0 if atingiu_r1 else round(min(5.0, (pct_cob_r1 / meta_pct_r1) * 5.0), 2)
        status_r1 = "Atingida" if atingiu_r1 else ("Em Andamento" if pct_cob_r1 >= 7.5 else "Crítica")

        ind_13 = {
            "codigo": "IND-13",
            "numero": 13,
            "titulo": "Indicador 13: Inspeções em Estabelecimentos de Nível de Risco I",
            "descricao": "Cobertura de inspeção sanitária em atividades de Baixo Risco (Meta oficial SES/MG: >= 15% dos estabelecimentos).",
            "unidade": "%",
            "peso_financeiro_percentual": 5.0,
            "numerador": num_r1,
            "denominador": den_r1,
            "meta_pactuada": meta_pct_r1,
            "meta_percentual": meta_pct_r1,
            "percentual_alcancado": pct_cob_r1,
            "atingiu_meta": atingiu_r1,
            "status": status_r1,
            "pontuacao_alcancada": pontos_r1,
            "grau_risco_rotulo": "Risco I",
            "progresso": {
                "meta_pactuada": meta_pct_r1,
                "realizado": pct_cob_r1,
                "percentual_atingido": round((pct_cob_r1 / meta_pct_r1 * 100.0), 2) if meta_pct_r1 > 0 else 100.0,
                "status": status_r1,
            },
        }

        # =========================================================================
        # INDICADOR 14: Inspeções em Estabelecimentos de Nível de Risco II (Médio Risco)
        # Meta: >= 90% dos estabelecimentos de Médio Risco inspecionados
        # =========================================================================
        den_r2 = float(estab_por_risco.get("Risco II", 0))
        num_r2 = float(fisc_por_risco.get("Risco II", 0))
        pct_cob_r2 = round((num_r2 / den_r2 * 100.0), 2) if den_r2 > 0 else 100.0
        meta_pct_r2 = 90.0
        atingiu_r2 = pct_cob_r2 >= meta_pct_r2
        pontos_r2 = 5.0 if atingiu_r2 else round(min(5.0, (pct_cob_r2 / meta_pct_r2) * 5.0), 2)
        status_r2 = "Atingida" if atingiu_r2 else ("Em Andamento" if pct_cob_r2 >= 50.0 else "Crítica")

        ind_14 = {
            "codigo": "IND-14",
            "numero": 14,
            "titulo": "Indicador 14: Inspeções em Estabelecimentos de Nível de Risco II",
            "descricao": "Inspeção e licenciamento de estabelecimentos de Médio Risco (Meta oficial SES/MG: >= 90% dos elegíveis).",
            "unidade": "%",
            "peso_financeiro_percentual": 5.0,
            "numerador": num_r2,
            "denominador": den_r2,
            "meta_pactuada": meta_pct_r2,
            "meta_percentual": meta_pct_r2,
            "percentual_alcancado": pct_cob_r2,
            "atingiu_meta": atingiu_r2,
            "status": status_r2,
            "pontuacao_alcancada": pontos_r2,
            "grau_risco_rotulo": "Risco II",
            "progresso": {
                "meta_pactuada": meta_pct_r2,
                "realizado": pct_cob_r2,
                "percentual_atingido": round((pct_cob_r2 / meta_pct_r2 * 100.0), 2) if meta_pct_r2 > 0 else 100.0,
                "status": status_r2,
            },
        }

        # =========================================================================
        # INDICADOR 15: Inspeções em Estabelecimentos de Nível de Risco III (Alto Risco)
        # Meta: 100% de cobertura dos estabelecimentos sob competência municipal
        # =========================================================================
        den_r3 = float(estab_por_risco.get("Risco III", 0))
        num_r3 = float(fisc_por_risco.get("Risco III", 0))
        pct_cob_r3 = round((num_r3 / den_r3 * 100.0), 2) if den_r3 > 0 else 100.0
        meta_pct_r3 = 100.0
        atingiu_r3 = pct_cob_r3 >= meta_pct_r3
        pontos_r3 = 5.0 if atingiu_r3 else round(min(5.0, (pct_cob_r3 / meta_pct_r3) * 5.0), 2)
        status_r3 = "Atingida" if atingiu_r3 else ("Em Andamento" if pct_cob_r3 >= 60.0 else "Crítica")

        ind_15 = {
            "codigo": "IND-15",
            "numero": 15,
            "titulo": "Indicador 15: Inspeções em Estabelecimentos de Nível de Risco III",
            "descricao": "Fiscalização sanitária prioritária de Alto Risco municipal (Meta oficial SES/MG: 100% de cobertura).",
            "unidade": "%",
            "peso_financeiro_percentual": 5.0,
            "numerador": num_r3,
            "denominador": den_r3,
            "meta_pactuada": meta_pct_r3,
            "meta_percentual": meta_pct_r3,
            "percentual_alcancado": pct_cob_r3,
            "atingiu_meta": atingiu_r3,
            "status": status_r3,
            "pontuacao_alcancada": pontos_r3,
            "grau_risco_rotulo": "Risco III",
            "progresso": {
                "meta_pactuada": meta_pct_r3,
                "realizado": pct_cob_r3,
                "percentual_atingido": pct_cob_r3,
                "status": status_r3,
            },
        }

        # =========================================================================
        # BLOCO UNIVERSAL CONSOLIDADO (5 INDICADORES x 5% = 25% PONTOS TOTAIS)
        # =========================================================================
        pontuacao_total = round(pontos_vapt + pontos_cad + pontos_r1 + pontos_r2 + pontos_r3, 2)
        percentual_bloco = round((pontuacao_total / 25.0) * 100.0, 2)
        total_atingidos = sum(1 for a in [atingiu_vapt, atingiu_cad, atingiu_r1, atingiu_r2, atingiu_r3] if a)
        status_bloco = "Excelente" if percentual_bloco >= 90.0 else ("Regular" if percentual_bloco >= 60.0 else "Crítico")

        bloco_universal = {
            "peso_total_percentual": 25.0,
            "pontuacao_total_alcancada": pontuacao_total,
            "percentual_atingido_bloco": percentual_bloco,
            "status_bloco": status_bloco,
            "total_indicadores_atingidos": total_atingidos,
        }

        return {
            "ano_exercicio": ano,
            "bloco_universal": bloco_universal,
            "indicador_11": ind_11,
            "indicador_12": ind_12,
            "indicador_13": ind_13,
            "indicador_14": ind_14,
            "indicador_15": ind_15,
            "indicadores": [ind_11, ind_12, ind_13, ind_14, ind_15],
            "total_estabelecimentos_cadastrados": total_ativos,
            "distribuicao_estabelecimentos_por_risco": estab_por_risco,
            "total_inspecoes_exercicio": total_inspecoes,
            "total_alvaras_ativos": total_alvaras,
        }

    async def listar_estabelecimentos_por_indicador(
        self,
        indicador_numero: int,
        ano: int,
    ) -> List[Dict[str, Any]]:
        """
        Retorna o universo de estabelecimentos específico de cada indicador para auditoria e drill-down.
        """
        if indicador_numero == 11:
            # Estabelecimentos com ações VAPT no ano ou em histórico
            sql = f"""
                {CTE_ESTABELECIMENTOS_RISCO}
                SELECT DISTINCT
                    e.id,
                    e.cnpj_cpf,
                    e.razao_social,
                    e.nome_fantasia,
                    COALESCE(er.grau_risco, 'Risco I') AS grau_risco,
                    e.situacao_alvara,
                    e.numero_alvara,
                    TRUE AS fiscalizado_no_exercicio,
                    TO_CHAR(i.data_inicio, 'YYYY-MM-DD') AS data_ultima_inspecao,
                    i.resultado::text AS resultado_ultima_inspecao
                FROM estabelecimentos e
                JOIN inspecoes i ON e.id = i.estabelecimento_id
                LEFT JOIN estab_com_risco er ON e.id = er.id
                WHERE i.motivo::text = 'vapt_trabalhador'
                  AND i.status::text IN ('concluida', 'CONCLUIDA', 'concluido', 'realizada')
                  AND EXTRACT(YEAR FROM i.data_inicio) = :ano
                  AND i.is_deleted = FALSE
                  AND e.is_deleted = FALSE
                ORDER BY e.razao_social ASC
            """
            res = await self.session.execute(text(sql), {"ano": ano})
            rows = [dict(r) for r in res.mappings().all()]
            return rows

        elif indicador_numero == 12:
            # Base geral de estabelecimentos ativos (Cadastro Municipal)
            sql = f"""
                {CTE_ESTABELECIMENTOS_RISCO}
                SELECT 
                    er.id,
                    er.cnpj_cpf,
                    er.razao_social,
                    er.nome_fantasia,
                    er.grau_risco,
                    er.situacao_alvara,
                    er.numero_alvara,
                    CASE WHEN ultima_insp.id IS NOT NULL THEN TRUE ELSE FALSE END AS fiscalizado_no_exercicio,
                    TO_CHAR(ultima_insp.data_inicio, 'YYYY-MM-DD') AS data_ultima_inspecao,
                    ultima_insp.resultado::text AS resultado_ultima_inspecao
                FROM estab_com_risco er
                LEFT JOIN LATERAL (
                    SELECT i.id, i.data_inicio, i.resultado
                    FROM inspecoes i
                    WHERE i.estabelecimento_id = er.id
                      AND i.status::text IN ('concluida', 'CONCLUIDA', 'concluido', 'realizada')
                      AND EXTRACT(YEAR FROM i.data_inicio) = :ano
                      AND i.is_deleted = FALSE
                    ORDER BY i.data_inicio DESC
                    LIMIT 1
                ) ultima_insp ON TRUE
                ORDER BY er.razao_social ASC
            """
            res = await self.session.execute(text(sql), {"ano": ano})
            return [dict(r) for r in res.mappings().all()]

        else:
            # Indicadores 13 (Risco I), 14 (Risco II), 15 (Risco III)
            grau_map = {13: "Risco I", 14: "Risco II", 15: "Risco III"}
            grau = grau_map.get(indicador_numero, "Risco I")
            return await self.listar_estabelecimentos_cobertura_detalhada(
                ano=ano,
                grau_risco=grau,
                apenas_nao_fiscalizados=False,
            )

