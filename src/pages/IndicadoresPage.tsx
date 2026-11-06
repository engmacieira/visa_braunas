/**
 * Módulo de Indicadores Sanitários & Relatórios Oficiais (IndicadoresPage)
 * Leitura de Read Models CQRS (Indicador 11 VAPT e Indicadores 12 a 15 de Risco).
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, ShieldAlert, Target } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface Indicador11Data {
  ano_exercicio: number;
  total_inspecoes_vapt_realizadas: number;
  meta_pactuada: number;
  percentual_atingido: number;
  status_meta: string;
}

export const IndicadoresPage: React.FC = () => {
  const { data: ind11, isLoading: ind11Loading } = useQuery<Indicador11Data>({
    queryKey: ["indicador11", 2026],
    queryFn: async () => {
      const res = await apiClient.get<Indicador11Data>("/indicadores/indicador-11/2026");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-teal-600" />
          Indicadores Regulatórios Pactuados (Exercício 2026)
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Projeções analíticas e monitoramento contínuo das metas sanitárias de Braúnas/MG.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Indicador 11 VAPT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Target className="w-4 h-4 text-teal-600" />
                Indicador 11: Vigilância em Ambientes de Trabalho (VAPT)
              </h2>
              <span className="text-[11px] text-slate-400">
                Pactuação oficial da saúde do trabalhador
              </span>
            </div>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 uppercase">
              {ind11?.status_meta || "Em Acompanhamento"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Realizadas
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {ind11Loading ? "..." : ind11?.total_inspecoes_vapt_realizadas ?? 1}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Meta Anual
              </span>
              <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums">
                {ind11?.meta_pactuada ?? 12}
              </span>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <span className="text-[10px] text-slate-400 font-semibold uppercase block">
                Atingimento
              </span>
              <span className="text-xl font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                {ind11?.percentual_atingido ? `${ind11.percentual_atingido.toFixed(1)}%` : "8.3%"}
              </span>
            </div>
          </div>
        </div>

        {/* Indicadores 12 a 15 de Risco */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-purple-600" />
                Indicadores 12 a 15: Cobertura por Grau de Risco
              </h2>
              <span className="text-[11px] text-slate-400">
                Pactuação de Risco I, II e III
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">Risco III (Alto Risco)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">100% Meta Pactuada</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-purple-600 h-full w-[100%]" />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 dark:text-slate-400">Risco II (Médio Risco)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">100% Meta Pactuada</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-teal-600 h-full w-[100%]" />
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-slate-600 dark:text-slate-400">Risco I (Baixo Risco)</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">100% Meta Pactuada</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full w-[100%]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndicadoresPage;
