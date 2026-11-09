/**
 * Painel Operacional Principal (DashboardPage)
 * Visão consolidada da Vigilância Sanitária Municipal de Braúnas/MG
 * Consome dados reais em tempo de execução via TanStack Query (v5) e cliente Axios da API.
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  PlusCircle,
  RefreshCw,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { APP_CONFIG } from "../config/app.config";
import { ROUTES } from "../config/routes.config";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/apiClient";
import { useDashboardIndicadores } from "../hooks/useIndicadores";
import { useEstabelecimentosList } from "../hooks/useEstabelecimentos";
import { useInspecoesList, useNotificacoesPendentes } from "../hooks/useFiscalizacao";
import { useRequerimentosList } from "../hooks/useLicenciamento";
import RiscoBadge from "../components/estabelecimentos/RiscoBadge";
import SituacaoAlvaraBadge from "../components/estabelecimentos/SituacaoAlvaraBadge";
import { formatCpfCnpj, formatData } from "../utils/formatters";

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
}

const MOTIVO_LABELS: Record<string, string> = {
  rotina_programada: "Rotina Programada",
  requerimento_alvara: "Requerimento de Alvará",
  denuncia: "Apuração de Denúncia",
  reinspecao: "Reinspeção Fiscal",
  vapt_trabalhador: "VAPT (Saúde Trabalhador)",
  investigacao_surto: "Investigação de Surto",
};

const STATUS_INSPECAO_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  agendada: {
    label: "Agendada",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  em_andamento: {
    label: "Em Andamento",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  concluida: {
    label: "Concluída",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  cancelada: {
    label: "Cancelada",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
};

const STATUS_REQUERIMENTO_BADGES: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pendente: {
    label: "Pendente",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  em_analise: {
    label: "Em Análise",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  aguardando_inspecao: {
    label: "Aguardando Vistoria",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
  },
  aguardando_adequacao: {
    label: "Com Notificação",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  deferido: {
    label: "Deferido",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
  indeferido: {
    label: "Indeferido",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  cancelado: {
    label: "Cancelado",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
  },
};

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"estabelecimentos" | "inspecoes" | "requerimentos" | "alertas">(
    "estabelecimentos"
  );

  // 1. Integridade operacional e conectividade do banco
  const { data: health, isLoading: healthLoading, refetch: refetchHealth } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await apiClient.get<HealthData>("/health");
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  // 2. Indicadores e metas oficiais do exercício
  const { data: dashboard, isLoading: dashboardLoading } = useDashboardIndicadores(
    APP_CONFIG.anoExercicioPadrao
  );

  // 3. Registros reais do banco: Estabelecimentos recentes
  const {
    data: estabelecimentosData,
    isLoading: estabelecimentosLoading,
    refetch: refetchEstabelecimentos,
  } = useEstabelecimentosList({ limit: 5 });

  // 4. Registros reais do banco: Inspeções recentes
  const {
    data: inspecoes = [],
    isLoading: inspecoesLoading,
    refetch: refetchInspecoes,
  } = useInspecoesList({ limit: 5 });

  // 5. Registros reais do banco: Requerimentos pendentes
  const {
    data: requerimentosData,
    isLoading: requerimentosLoading,
    refetch: refetchRequerimentos,
  } = useRequerimentosList({ limit: 5, apenas_fila: true });

  // 6. Registros reais do banco: Notificações com prazos
  const {
    data: notificacoesPendentes = [],
    isLoading: notificacoesLoading,
    refetch: refetchNotificacoes,
  } = useNotificacoesPendentes(30);

  const listaEstabelecimentos =
    estabelecimentosData?.itens ||
    (estabelecimentosData as { items?: typeof estabelecimentosData extends { itens: infer T } ? T : never } | undefined)?.items ||
    [];
  const totalEstabelecimentos = estabelecimentosData?.total ?? dashboard?.total_estabelecimentos_cadastrados ?? 0;
  const listaRequerimentos = requerimentosData?.items || [];

  const handleRecarregarTudo = () => {
    refetchHealth();
    refetchEstabelecimentos();
    refetchInspecoes();
    refetchRequerimentos();
    refetchNotificacoes();
  };

  const isDbOnline = health?.database === "online" || health?.status === "healthy";

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Boas-Vindas e Conexão */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel Operacional · {APP_CONFIG.municipio}/{APP_CONFIG.uf}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Olá, <strong className="text-slate-700 dark:text-slate-200">{user?.nome_completo}</strong> ({user?.cargo}).
              Ambiente de monitoramento sanitário e gestão regulatória.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                isDbOnline
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : healthLoading
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isDbOnline
                    ? "bg-emerald-500 animate-pulse"
                    : healthLoading
                    ? "bg-slate-400"
                    : "bg-rose-500"
                }`}
              />
              <span>
                {healthLoading
                  ? "Verificando Conexão..."
                  : isDbOnline
                  ? "PostgreSQL & API Conectados"
                  : "Conexão Degradada / Offline"}
              </span>
            </span>

            <button
              type="button"
              onClick={handleRecarregarTudo}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
              title="Recarregar Dados Operacionais"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais Consolidadas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Estabelecimentos no Banco */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Estabelecimentos Ativos
            </span>
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {estabelecimentosLoading ? (
              <span className="text-sm font-normal text-slate-400 animate-pulse">Carregando...</span>
            ) : (
              totalEstabelecimentos
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastros econômicos regulados pela VISA
          </p>
        </div>

        {/* Card 2: Vistorias Realizadas no Exercício */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Vistorias no Exercício
            </span>
            <ClipboardCheck className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {dashboardLoading ? (
              <span className="text-sm font-normal text-slate-400 animate-pulse">Carregando...</span>
            ) : (
              dashboard?.total_inspecoes_exercicio ?? inspecoes.length
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Inspeções sanitárias e fiscalizações concluídas
          </p>
        </div>

        {/* Card 3: Alvarás Sanitários Ativos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Alvarás Vigentes
            </span>
            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {dashboardLoading ? (
              <span className="text-sm font-normal text-slate-400 animate-pulse">Carregando...</span>
            ) : (
              dashboard?.total_alvaras_ativos ?? 0
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Licenças sanitárias expedidas com QR Code
          </p>
        </div>

        {/* Card 4: Notificações com Prazo */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Notificações Pendentes
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {notificacoesLoading ? (
              <span className="text-sm font-normal text-slate-400 animate-pulse">Carregando...</span>
            ) : (
              notificacoesPendentes.length
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Termos com contagem regressiva de adequação
          </p>
        </div>
      </div>

      {/* Seção Operacional com Dados do Banco de Dados */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Registros Operacionais do Banco de Dados</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Consultas em tempo real)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Acompanhe as últimas movimentações cadastradas no sistema.
            </p>
          </div>

          {/* Abas Rápidas */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveTab("estabelecimentos")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "estabelecimentos"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Estabelecimentos ({totalEstabelecimentos})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("inspecoes")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "inspecoes"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Inspeções ({inspecoes.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("requerimentos")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "requerimentos"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Fila de Alvarás ({listaRequerimentos.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("alertas")}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === "alertas"
                  ? "bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              Alertas ({notificacoesPendentes.length})
            </button>
          </div>
        </div>

        {/* Conteúdo da Aba Ativa */}
        <div className="p-5">
          {/* TAB 1: Estabelecimentos */}
          {activeTab === "estabelecimentos" && (
            <div>
              {estabelecimentosLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
                  Consultando estabelecimentos no banco de dados...
                </div>
              ) : listaEstabelecimentos.length === 0 ? (
                <div className="py-12 text-center">
                  <Building2 className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum estabelecimento cadastrado no banco de dados.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Cadastre o primeiro estabelecimento regulado ou execute a carga inicial para iniciar o monitoramento sanitário.
                  </p>
                  <Link
                    to={ROUTES.ESTABELECIMENTOS.NOVO}
                    className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Cadastrar Estabelecimento</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Razão Social / Fantasia</th>
                        <th className="py-3 px-3">CNPJ / CPF</th>
                        <th className="py-3 px-3">Grau de Risco</th>
                        <th className="py-3 px-3">Situação do Alvará</th>
                        <th className="py-3 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {listaEstabelecimentos.map((est) => (
                        <tr key={est.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-3 font-medium text-slate-900 dark:text-white">
                            <div>{est.razao_social}</div>
                            {est.nome_fantasia && (
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {est.nome_fantasia}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                            {formatCpfCnpj(est.cnpj_cpf)}
                          </td>
                          <td className="py-3 px-3">
                            <RiscoBadge risco={est.nivel_risco} size="sm" />
                          </td>
                          <td className="py-3 px-3">
                            <SituacaoAlvaraBadge situacao={est.situacao_alvara} size="sm" />
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              to={ROUTES.ESTABELECIMENTOS.DETALHE(est.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 rounded-md hover:bg-teal-100 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ficha</span>
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <span>Mostrando {listaEstabelecimentos.length} de {totalEstabelecimentos} registros</span>
                    <Link
                      to={ROUTES.ESTABELECIMENTOS.LIST}
                      className="font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Ver todos os estabelecimentos</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Inspeções */}
          {activeTab === "inspecoes" && (
            <div>
              {inspecoesLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
                  Consultando fiscalizações no banco de dados...
                </div>
              ) : inspecoes.length === 0 ? (
                <div className="py-12 text-center">
                  <ClipboardCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma inspeção registrada no banco de dados.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Agende uma vistoria de rotina, análise de alvará ou ação VAPT de saúde do trabalhador.
                  </p>
                  <Link
                    to={ROUTES.INSPECOES.LIST}
                    className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Acessar Módulo de Fiscalização</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Termo / Notificação</th>
                        <th className="py-3 px-3">Motivo da Ação</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Data Início</th>
                        <th className="py-3 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {inspecoes.map((insp) => {
                        const statusConfig = STATUS_INSPECAO_BADGES[insp.status] || {
                          label: insp.status,
                          bg: "bg-slate-100",
                          text: "text-slate-700",
                          border: "border-slate-200",
                        };

                        return (
                          <tr key={insp.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                              {insp.numero_termo}
                            </td>
                            <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                              {MOTIVO_LABELS[insp.motivo] || insp.motivo}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                              {formatData(insp.data_inicio)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to={ROUTES.INSPECOES.LAUDO(insp.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 rounded-md hover:bg-teal-100 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Laudo</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <span>Mostrando {inspecoes.length} inspeções recentes</span>
                    <Link
                      to={ROUTES.INSPECOES.LIST}
                      className="font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Ver todas as fiscalizações</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Requerimentos */}
          {activeTab === "requerimentos" && (
            <div>
              {requerimentosLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
                  Consultando requerimentos de alvará no banco de dados...
                </div>
              ) : listaRequerimentos.length === 0 ? (
                <div className="py-12 text-center">
                  <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhum requerimento de alvará pendente na fila.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    A fila de solicitações e protocolos sanitários está limpa no momento.
                  </p>
                  <Link
                    to={ROUTES.LICENCIAMENTO.LIST}
                    className="inline-flex items-center gap-2 mt-4 px-3.5 py-2 rounded-lg bg-teal-600 text-white text-xs font-semibold hover:bg-teal-700 transition-colors"
                  >
                    <span>Abrir Fila de Licenciamento</span>
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Protocolo</th>
                        <th className="py-3 px-3">Razão Social / Solicitante</th>
                        <th className="py-3 px-3">Tipo de Solicitação</th>
                        <th className="py-3 px-3">Status</th>
                        <th className="py-3 px-3">Data</th>
                        <th className="py-3 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {listaRequerimentos.map((req) => {
                        const statusConfig = STATUS_REQUERIMENTO_BADGES[req.status] || {
                          label: req.status,
                          bg: "bg-slate-100",
                          text: "text-slate-700",
                          border: "border-slate-200",
                        };

                        return (
                          <tr key={req.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-semibold font-mono text-slate-900 dark:text-white">
                              {req.numero_protocolo}
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                              {req.dados_declarados?.razao_social || "Estabelecimento Vinculado"}
                            </td>
                            <td className="py-3 px-3 capitalize text-slate-600 dark:text-slate-400">
                              {req.tipo_solicitacao.replace("_", " ")}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-medium ${statusConfig.bg} ${statusConfig.text} ${statusConfig.border}`}
                              >
                                {statusConfig.label}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                              {formatData(req.data_submissao)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to={ROUTES.LICENCIAMENTO.REQUERIMENTO_DETALHE(req.id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 rounded-md hover:bg-teal-100 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Análise</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <span>Mostrando {listaRequerimentos.length} processos na fila</span>
                    <Link
                      to={ROUTES.LICENCIAMENTO.LIST}
                      className="font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Ver fila completa</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: Alertas e Prazos */}
          {activeTab === "alertas" && (
            <div>
              {notificacoesLoading ? (
                <div className="py-12 text-center text-sm text-slate-500 animate-pulse">
                  Consultando notificações sanitárias no banco de dados...
                </div>
              ) : notificacoesPendentes.length === 0 ? (
                <div className="py-12 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    Nenhuma notificação com prazo a vencer no período de 30 dias.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                    Todos os termos de notificação e exigências estão em dia ou cumpridos.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-3">Termo</th>
                        <th className="py-3 px-3">Estabelecimento Notificado</th>
                        <th className="py-3 px-3">Fiscal Responsável</th>
                        <th className="py-3 px-3">Data Limite</th>
                        <th className="py-3 px-3">Prazo Restante</th>
                        <th className="py-3 px-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                      {notificacoesPendentes.map((notif) => {
                        const isVencido = notif.dias_restantes < 0;
                        const isCritico = notif.dias_restantes <= 5 && !isVencido;

                        return (
                          <tr key={notif.inspecao_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                              {notif.numero_termo}
                            </td>
                            <td className="py-3 px-3 text-slate-800 dark:text-slate-200">
                              {notif.razao_social}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                              {notif.fiscal_responsavel}
                            </td>
                            <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                              {formatData(notif.data_limite_adequacao)}
                            </td>
                            <td className="py-3 px-3">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[11px] font-semibold ${
                                  isVencido
                                    ? "bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300"
                                    : isCritico
                                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-200 border-amber-300"
                                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200"
                                }`}
                              >
                                {isVencido
                                  ? `Expirado (${Math.abs(notif.dias_restantes)} dias)`
                                  : `${notif.dias_restantes} dias restantes`}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <Link
                                to={ROUTES.INSPECOES.LAUDO(notif.inspecao_id)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-teal-600 hover:text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 rounded-md hover:bg-teal-100 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Ver Termo</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-xs text-slate-500">
                    <span>Mostrando {notificacoesPendentes.length} notificações</span>
                    <Link
                      to={ROUTES.INSPECOES.PRAZOS}
                      className="font-medium text-teal-600 dark:text-teal-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Abrir Painel de Prazos Completo</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Acessos Rápidos aos Módulos Principais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Acessos Rápidos aos Módulos do Sistema
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to={ROUTES.ESTABELECIMENTOS.LIST}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Estabelecimentos
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cadastros, CNAEs e vínculos de RT
                </p>
              </div>
            </div>
          </Link>

          <Link
            to={ROUTES.INSPECOES.LIST}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <ClipboardCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Fiscalização & VAPT
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Termos, vistorias e notificações
                </p>
              </div>
            </div>
          </Link>

          <Link
            to={ROUTES.LICENCIAMENTO.LIST}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Alvarás Sanitários
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Requerimentos e emissão com QR Code
                </p>
              </div>
            </div>
          </Link>

          <Link
            to={ROUTES.OUVIDORIA.LIST}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Ouvidoria & Denúncias
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Triagem e despacho fiscal
                </p>
              </div>
            </div>
          </Link>

          <Link
            to={ROUTES.INDICADORES.DASHBOARD}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Indicadores 11 a 15
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Painéis analíticos e metas SUS
                </p>
              </div>
            </div>
          </Link>

          <Link
            to={ROUTES.RELATORIOS.SUS()}
            className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-teal-500 dark:hover:border-teal-500 transition-all hover:shadow-xs group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <FileCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-teal-600 transition-colors">
                  Prestação de Contas SUS
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Relatório oficial DIGISUS em A4
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
