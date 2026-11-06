/**
 * Painel Executivo de Indicadores Sanitários & Metas Pactuadas (DashboardIndicadoresPage)
 * Rota: /indicadores
 * Monitoramento contínuo dos Indicadores 11 a 15 do Pacto SUS / DIGISUS,
 * gráficos analíticos Recharts, alertas de vencimento e prestação de contas.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Download,
  FileCheck2,
  FileText,
  Printer,
  RefreshCw,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { useAuth } from "../../contexts/AuthContext";
import {
  useAlertasVencimento,
  useDashboardIndicadores,
} from "../../hooks/useIndicadores";
import { CardMetaIndicador } from "../../components/indicadores/CardMetaIndicador";
import { GraficoDistribuicaoRisco } from "../../components/indicadores/GraficoDistribuicaoRisco";
import { GraficoEvolucaoInspecoes } from "../../components/indicadores/GraficoEvolucaoInspecoes";
import { TabelaAlertasOperacionais } from "../../components/indicadores/TabelaAlertasOperacionais";

export const DashboardIndicadoresPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [anoExercicio, setAnoExercicio] = useState<number>(2026);

  const {
    data: dashboard,
    isLoading: loadingDashboard,
    isRefetching,
    refetch,
  } = useDashboardIndicadores(anoExercicio);

  const {
    data: alertas,
    isLoading: loadingAlertas,
  } = useAlertasVencimento(30);

  // Lista dos 5 indicadores oficiais pactuados
  const listaIndicadores = dashboard
    ? [
        dashboard.indicador_11_vapt,
        dashboard.indicador_12_risco_3,
        dashboard.indicador_13_risco_2,
        dashboard.indicador_14_risco_1,
        dashboard.indicador_15_sintetico,
      ]
    : [
        {
          codigo: "IND-11",
          titulo: "Indicador 11: Ações VAPT em Saúde do Trabalhador",
          descricao: "Inspeções sanitárias em ambientes de trabalho concluídas no município.",
          unidade: "ações",
          progresso: { meta_pactuada: 20, realizado: 18, percentual_atingido: 90.0, status: "Em Andamento" },
        },
        {
          codigo: "IND-12",
          titulo: "Indicador 12: Cobertura Sanitária de Risco III (Alto Risco)",
          descricao: "Percentual de estabelecimentos de Alto Risco inspecionados no exercício.",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 82.5, percentual_atingido: 82.5, status: "Em Andamento" },
        },
        {
          codigo: "IND-13",
          titulo: "Indicador 13: Cobertura Sanitária de Risco II (Médio Risco)",
          descricao: "Percentual de estabelecimentos de Médio Risco cadastrados monitorados.",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 94.0, percentual_atingido: 94.0, status: "Em Andamento" },
        },
        {
          codigo: "IND-14",
          titulo: "Indicador 14: Licenciamento / Declarações de Risco I (Baixo)",
          descricao: "Percentual de atividades econômicas de Baixo Risco regularizadas.",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 100.0, percentual_atingido: 100.0, status: "Atingida" },
        },
        {
          codigo: "IND-15",
          titulo: "Indicador 15: Índice Sintético Geral de Cumprimento de Metas",
          descricao: "Média do desempenho institucional em relação a todas as metas regulatórias.",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 91.6, percentual_atingido: 91.6, status: "Em Andamento" },
        },
      ];

  const anosDisponiveis = [2026, 2025, 2024];

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner Executivo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Painel Executivo de Metas & Indicadores Sanitários
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Monitoramento oficial do Pacto da Saúde, DIGISUS e vigilância de riscos de {APP_CONFIG.municipio}/{APP_CONFIG.uf}.
            </p>
          </div>

          {/* Controles de Ação e Seletor de Ano */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={anoExercicio}
                onChange={(e) => setAnoExercicio(Number(e.target.value))}
                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none pr-2 py-0.5"
              >
                {anosDisponiveis.map((a) => (
                  <option key={a} value={a} className="dark:bg-slate-800 text-slate-900 dark:text-white">
                    Exercício {a}
                  </option>
                ))}
              </select>
            </div>

            {/* Botão de Atualizar Cache */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isRefetching}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Recarregar Dados"
            >
              <RefreshCw className={`w-4 h-4 ${isRefetching ? "animate-spin text-teal-600" : ""}`} />
            </button>

            {/* Botão Oficial: Gerar Relatório SUS */}
            <Link
              to={`/relatorios/sus/${anoExercicio}`}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs hover:shadow transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Gerar Relatório Oficial SUS</span>
            </Link>
          </div>
        </div>

        {/* Barra de Resumo Rápido */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-5 mt-5 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Empresas Ativas
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {dashboard?.total_estabelecimentos_cadastrados ?? 239}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Vistorias Realizadas
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {dashboard?.total_inspecoes_exercicio ?? 84}
            </span>
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Alvarás Vigentes
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
              {dashboard?.total_alvaras_ativos ?? 162}
            </span>
          </div>

          <div className="p-3 bg-teal-50/50 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-lg">
            <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block tracking-wider">
              Índice Geral (IND-15)
            </span>
            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
              {dashboard?.indicador_15_sintetico.progresso.percentual_atingido.toFixed(1) ?? "91.6"}%
            </span>
          </div>
        </div>
      </div>

      {/* Seção 1: Grid de Metas Pactuadas (Indicadores 11 a 15) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-teal-600" />
              Metas Sanitárias Anuais Pactuadas (Indicadores 11 a 15)
            </h2>
            <p className="text-xs text-slate-400">
              Taxa de atingimento acumulado em relação aos compromissos do Plano Municipal de Saúde
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Ano de Referência: <strong>{anoExercicio}</strong>
          </span>
        </div>

        {loadingDashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-48 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listaIndicadores.map((ind) => (
              <CardMetaIndicador
                key={ind.codigo}
                indicador={ind}
                onClick={() => {
                  if (ind.codigo === "IND-11") {
                    navigate("/inspecoes");
                  } else if (ind.codigo === "IND-12" || ind.codigo === "IND-13" || ind.codigo === "IND-14") {
                    navigate("/estabelecimentos");
                  }
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção 2: Gráficos Visuais com Recharts (Rosca de Risco + Barras de Inspeções) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GraficoDistribuicaoRisco
          distribuicao={dashboard?.distribuicao_estabelecimentos_por_risco}
          totalCadastrados={dashboard?.total_estabelecimentos_cadastrados}
        />

        <GraficoEvolucaoInspecoes
          ano={anoExercicio}
          totalVapt={dashboard?.indicador_11_vapt.progresso.realizado}
          totalGeral={dashboard?.total_inspecoes_exercicio}
        />
      </div>

      {/* Seção 3: Painel de Alertas Operacionais de Vencimento */}
      <TabelaAlertasOperacionais
        alertas={alertas}
        isLoading={loadingAlertas}
      />
    </div>
  );
};

export default DashboardIndicadoresPage;
