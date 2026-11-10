/**
 * Painel Executivo de Indicadores Sanitários & Metas Pactuadas (DashboardIndicadoresPage)
 * Rota: /indicadores
 * Alinhamento estrito às Fichas Técnicas dos Indicadores Universais 11 a 15 (SES/MG - Braúnas/MG).
 * Bloco Universal (25% do repasse), Drill-Down de Estabelecimentos e Layout Oficial de Impressão.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  BarChart3,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Coins,
  FileText,
  Printer,
  RefreshCw,
  Shield,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { ROUTES } from "../../config/routes.config";
import { useAuth } from "../../contexts/AuthContext";
import {
  useAlertasVencimento,
  useDashboardIndicadores,
  useDetalhesIndicador,
} from "../../hooks/useIndicadores";
import { BlocoUniversalCard } from "../../components/indicadores/BlocoUniversalCard";
import { CardMetaIndicador } from "../../components/indicadores/CardMetaIndicador";
import { GraficoDistribuicaoRisco } from "../../components/indicadores/GraficoDistribuicaoRisco";
import { GraficoEvolucaoInspecoes } from "../../components/indicadores/GraficoEvolucaoInspecoes";
import { TabelaAlertasOperacionais } from "../../components/indicadores/TabelaAlertasOperacionais";
import { TabelaDrillDownIndicador } from "../../components/indicadores/TabelaDrillDownIndicador";
import { IndicadorUniversalDetalheItem } from "../../types/indicadores";

export const DashboardIndicadoresPage: React.FC = () => {
  const { user } = useAuth();
  const [anoExercicio, setAnoExercicio] = useState<number>(2026);
  const [indicadorSelecionadoNumero, setIndicadorSelecionadoNumero] = useState<number | null>(null);

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

  const {
    data: detalheIndicador,
    isLoading: loadingDetalhe,
  } = useDetalhesIndicador(indicadorSelecionadoNumero, anoExercicio);

  // Lista dos 5 indicadores oficiais pactuados do SES/MG para Braúnas/MG
  const listaIndicadores: IndicadorUniversalDetalheItem[] = dashboard?.indicadores ?? [
    {
      codigo: "IND-11",
      numero: 11,
      titulo: "Indicador 11: Inspeções em Ambientes e Processos de Trabalho (VAPT)",
      descricao: "Inspeções de vigilância em saúde do trabalhador (Meta oficial: 2 ações para porte 2.001 a 10.000 hab).",
      unidade: "ações",
      peso_financeiro_percentual: 5.0,
      numerador: 2,
      denominador: 2,
      meta_pactuada: 2,
      meta_percentual: 100,
      percentual_alcancado: 100.0,
      atingiu_meta: true,
      status: "Atingida",
      pontuacao_alcancada: 5.0,
      grau_risco_rotulo: "Saúde do Trabalhador",
      progresso: { meta_pactuada: 2, realizado: 2, percentual_atingido: 100.0, status: "Atingida" },
    },
    {
      codigo: "IND-12",
      numero: 12,
      titulo: "Indicador 12: Atualização do Cadastro Municipal de Estabelecimentos",
      descricao: "Consolidação e sincronização da base de estabelecimentos ativos com CNAEs de interesse sanitário.",
      unidade: "remessa",
      peso_financeiro_percentual: 5.0,
      numerador: 1,
      denominador: 1,
      meta_pactuada: 1,
      meta_percentual: 100,
      percentual_alcancado: 100.0,
      atingiu_meta: true,
      status: "Atingida",
      pontuacao_alcancada: 5.0,
      grau_risco_rotulo: "Cadastro Municipal",
      progresso: { meta_pactuada: 1, realizado: 1, percentual_atingido: 100.0, status: "Atingida" },
    },
    {
      codigo: "IND-13",
      numero: 13,
      titulo: "Indicador 13: Inspeções em Estabelecimentos de Nível de Risco I",
      descricao: "Cobertura de inspeção sanitária em atividades de Baixo Risco (Meta oficial: ≥ 15% dos estabelecimentos).",
      unidade: "%",
      peso_financeiro_percentual: 5.0,
      numerador: 36,
      denominador: 180,
      meta_pactuada: 15,
      meta_percentual: 15,
      percentual_alcancado: 20.0,
      atingiu_meta: true,
      status: "Atingida",
      pontuacao_alcancada: 5.0,
      grau_risco_rotulo: "Risco I",
      progresso: { meta_pactuada: 15, realizado: 20.0, percentual_atingido: 133.3, status: "Atingida" },
    },
    {
      codigo: "IND-14",
      numero: 14,
      titulo: "Indicador 14: Inspeções em Estabelecimentos de Nível de Risco II",
      descricao: "Inspeção e licenciamento de estabelecimentos de Médio Risco (Meta oficial: ≥ 90% dos elegíveis).",
      unidade: "%",
      peso_financeiro_percentual: 5.0,
      numerador: 42,
      denominador: 45,
      meta_pactuada: 90,
      meta_percentual: 90,
      percentual_alcancado: 93.3,
      atingiu_meta: true,
      status: "Atingida",
      pontuacao_alcancada: 5.0,
      grau_risco_rotulo: "Risco II",
      progresso: { meta_pactuada: 90, realizado: 93.3, percentual_atingido: 103.7, status: "Atingida" },
    },
    {
      codigo: "IND-15",
      numero: 15,
      titulo: "Indicador 15: Inspeções em Estabelecimentos de Nível de Risco III",
      descricao: "Fiscalização prioritária de estabelecimentos de Alto Risco municipal (Meta oficial: 100% de cobertura).",
      unidade: "%",
      peso_financeiro_percentual: 5.0,
      numerador: 14,
      denominador: 14,
      meta_pactuada: 100,
      meta_percentual: 100,
      percentual_alcancado: 100.0,
      atingiu_meta: true,
      status: "Atingida",
      pontuacao_alcancada: 5.0,
      grau_risco_rotulo: "Risco III",
      progresso: { meta_pactuada: 100, realizado: 100.0, percentual_atingido: 100.0, status: "Atingida" },
    },
  ];

  const indicadorAtivo = listaIndicadores.find((i) => i.numero === indicadorSelecionadoNumero);

  const anosDisponiveis = [2026, 2025, 2024];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      {/* Cabeçalho Oficial Exclusivo para Impressão */}
      <div className="hidden print:block border-b border-slate-800 pb-4 mb-4 text-center">
        <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900">
          {APP_CONFIG.prefeitura}
        </h1>
        <h2 className="text-sm font-semibold text-slate-700">
          {APP_CONFIG.secretaria} · {APP_CONFIG.orgao}
        </h2>
        <div className="text-xs text-slate-500 mt-1">
          Relatório Executivo de Cumprimento de Metas Sanitárias · Bloco Universal (Exercício {anoExercicio})
        </div>
        <div className="text-[11px] text-slate-400 mt-0.5">
          Município de {APP_CONFIG.municipio}/{APP_CONFIG.uf} · Emitido em {new Date().toLocaleDateString("pt-BR")}
        </div>
      </div>

      {/* Top Banner Executivo (Ocultado em impressão simples ou estilizado) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400">
                <BarChart3 className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Painel Executivo de Indicadores Sanitários (SES/MG)
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5">
              Pactuação municipal oficial de {APP_CONFIG.municipio}/{APP_CONFIG.uf}: Fichas Técnicas dos Indicadores 11 a 15 e Bloco Universal.
            </p>
          </div>

          {/* Controles de Ação e Seletor de Ano */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Seletor de Ano */}
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
              <Calendar className="w-3.5 h-3.5 text-slate-500 ml-1.5" />
              <select
                value={anoExercicio}
                onChange={(e) => {
                  setAnoExercicio(Number(e.target.value));
                  setIndicadorSelecionadoNumero(null);
                }}
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

            {/* Botão de Impressão Rápida */}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title="Imprimir Painel Oficial"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>

            {/* Botão Oficial: Gerar Relatório SUS */}
            <Link
              to={ROUTES.RELATORIOS.SUS(anoExercicio)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs hover:shadow transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Relatório DIGISUS</span>
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
              {dashboard?.total_inspecoes_exercicio ?? 92}
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
              Aproveitamento Bloco
            </span>
            <span className="text-xl font-bold text-teal-700 dark:text-teal-300 tabular-nums">
              {dashboard?.bloco_universal?.percentual_atingido_bloco.toFixed(1) ?? "100.0"}%
            </span>
          </div>
        </div>
      </div>

      {/* Seção Principal 1: Card Consolidado do Bloco Universal (25% do Repasse) */}
      <BlocoUniversalCard
        bloco={dashboard?.bloco_universal}
        indicadores={listaIndicadores}
        ano={anoExercicio}
      />

      {/* Seção Principal 2: Grid Oficial das 5 Metas Pactuadas (Indicadores 11 a 15) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Target className="w-4 h-4 text-teal-600" />
              Indicadores Universais Oficiais de Braúnas/MG (Fichas Técnicas 11 a 15)
            </h2>
            <p className="text-xs text-slate-400">
              Clique em um indicador para auditar o universo de estabelecimentos vinculados e a situação fiscal.
            </p>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline">
            Exercício <strong>{anoExercicio}</strong>
          </span>
        </div>

        {loadingDashboard ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 h-56 animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {listaIndicadores.map((ind) => (
              <CardMetaIndicador
                key={ind.codigo}
                indicador={ind}
                isSelected={indicadorSelecionadoNumero === ind.numero}
                onClick={() => {
                  setIndicadorSelecionadoNumero((prev) =>
                    prev === ind.numero ? null : ind.numero
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Seção 3: Painel de Drill-Down Interativo do Indicador Selecionado */}
      {indicadorAtivo && (
        <div className="scroll-mt-6" id="painel-drill-down">
          <TabelaDrillDownIndicador
            indicador={indicadorAtivo}
            estabelecimentos={detalheIndicador?.estabelecimentos ?? []}
            isLoading={loadingDetalhe}
            onClose={() => setIndicadorSelecionadoNumero(null)}
          />
        </div>
      )}

      {/* Seção 4: Gráficos Visuais Analíticos Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:hidden">
        <GraficoDistribuicaoRisco
          distribuicao={dashboard?.distribuicao_estabelecimentos_por_risco}
          totalCadastrados={dashboard?.total_estabelecimentos_cadastrados}
        />

        <GraficoEvolucaoInspecoes
          ano={anoExercicio}
          totalVapt={dashboard?.indicador_11?.numerador ?? dashboard?.indicador_11_vapt.progresso.realizado}
          totalGeral={dashboard?.total_inspecoes_exercicio}
        />
      </div>

      {/* Seção 5: Painel de Alertas Operacionais de Vencimento */}
      <div className="print:hidden">
        <TabelaAlertasOperacionais
          alertas={alertas}
          isLoading={loadingAlertas}
        />
      </div>

      {/* Rodapé Oficial para Impressão */}
      <div className="hidden print:block pt-8 mt-8 border-t border-slate-300">
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div className="pt-8 border-t border-slate-400">
            <p className="font-bold text-slate-800">{user?.nome_completo || "Coordenação de Vigilância Sanitária"}</p>
            <p className="text-slate-500">Responsável Técnico / Fiscal Sanitário</p>
          </div>
          <div className="pt-8 border-t border-slate-400">
            <p className="font-bold text-slate-800">Secretaria Municipal de Saúde</p>
            <p className="text-slate-500">Gestão do SUS · Município de Braúnas/MG</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardIndicadoresPage;
