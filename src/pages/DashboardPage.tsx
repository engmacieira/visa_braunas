/**
 * Painel Operacional Principal (DashboardPage)
 * Visão consolidada da Vigilância Sanitária Municipal de Braúnas/MG
 * Consome dados via TanStack Query (v5) e cliente Axios da API.
 */

import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileCheck,
  PlusCircle,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { APP_CONFIG } from "../config/app.config";
import { useAuth } from "../contexts/AuthContext";
import { apiClient } from "../services/apiClient";

interface HealthData {
  status: string;
  database: string;
  timestamp: string;
}

interface MetaExercicio {
  id: string;
  ano_exercicio: number;
  meta_inspecoes_vapt: number;
  meta_cobertura_risco_1: number;
  meta_cobertura_risco_2: number;
  meta_cobertura_risco_3: number;
  dias_validade_padrao_alvara: number;
  dias_prazo_padrao_notificacao: number;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  // Consulta de integridade do backend via TanStack Query
  const { data: health, isLoading: healthLoading } = useQuery<HealthData>({
    queryKey: ["health"],
    queryFn: async () => {
      const res = await apiClient.get<HealthData>("/health");
      return res.data;
    },
    staleTime: 60 * 1000,
  });

  // Consulta de Metas do Exercício via TanStack Query
  const { data: metas } = useQuery<MetaExercicio>({
    queryKey: ["metas", 2026],
    queryFn: async () => {
      const res = await apiClient.get<MetaExercicio>("/indicadores/metas/2026");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho de Boas-Vindas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Painel Operacional · {APP_CONFIG.municipio}/{APP_CONFIG.uf}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Olá, <strong className="text-slate-700 dark:text-slate-200">{user?.nome_completo}</strong> ({user?.cargo}).
              Bem-vindo ao sistema de regulação sanitária municipal.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                health?.status === "healthy"
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                  : healthLoading
                  ? "bg-slate-100 text-slate-600 border-slate-200"
                  : "bg-rose-50 text-rose-700 border-rose-200"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  health?.status === "healthy"
                    ? "bg-emerald-500"
                    : healthLoading
                    ? "bg-slate-400"
                    : "bg-rose-500"
                }`}
              />
              <span>
                {healthLoading
                  ? "Conectando..."
                  : health?.status === "healthy"
                  ? "API & Banco Operacionais"
                  : "Conexão Degradada"}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Grid de Métricas Principais (Indicadores Pactuados) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Indicador 11 VAPT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Indicador 11 (VAPT)
            </span>
            <ClipboardCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metas?.meta_inspecoes_vapt || 12}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Meta anual pactuada de inspeções de saúde do trabalhador
          </p>
        </div>

        {/* Card 2: Cobertura Risco III */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Risco Alto (III)
            </span>
            <ShieldAlert className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metas?.meta_cobertura_risco_3 ? `${metas.meta_cobertura_risco_3}%` : "100%"}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Meta de cobertura de fiscalização para alto risco
          </p>
        </div>

        {/* Card 3: Validade de Alvará */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Prazo de Alvará
            </span>
            <FileCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metas?.dias_validade_padrao_alvara || 365} dias
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Vigência padrão de licenças sanitárias emitidas
          </p>
        </div>

        {/* Card 4: Prazo de Notificação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Adequação Fiscal
            </span>
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {metas?.dias_prazo_padrao_notificacao || 30} dias
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Prazo legal para cumprimento de notificações
          </p>
        </div>
      </div>

      {/* Ações Rápidas e Acessos Operacionais */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h2 className="text-base font-semibold text-slate-900 dark:text-white mb-4">
          Acessos Rápidos aos Módulos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/estabelecimentos"
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
            to="/inspecoes"
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
            to="/licenciamento"
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
            to="/ouvidoria"
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
            to="/indicadores"
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
                  Painéis analíticos e relatórios CQRS
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
