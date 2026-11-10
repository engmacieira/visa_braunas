/**
 * Card Executivo do Bloco Universal de Indicadores Sanitários (SES/MG)
 * Exibe a soma ponderada dos 5 indicadores universais (5 x 5% = 25% do recurso total).
 */

import React from "react";
import { Award, CheckCircle2, AlertTriangle, ShieldCheck, TrendingUp, Info } from "lucide-react";
import { BlocoUniversalResumo, IndicadorUniversalDetalheItem } from "../../types/indicadores";

interface BlocoUniversalCardProps {
  bloco?: BlocoUniversalResumo;
  indicadores?: IndicadorUniversalDetalheItem[];
  ano: number;
}

export const BlocoUniversalCard: React.FC<BlocoUniversalCardProps> = ({
  bloco,
  indicadores,
  ano,
}) => {
  // Valores padrão baseados na pactuação oficial de Braúnas/MG
  const pontuacaoTotal = bloco?.pontuacao_total_alcancada ?? 25.0;
  const percentualTotal = bloco?.percentual_atingido_bloco ?? 100.0;
  const totalAtingidos = bloco?.total_indicadores_atingidos ?? 5;
  const status = bloco?.status_bloco ?? "Excelente";

  const isExcelente = percentualTotal >= 90;
  const isRegular = !isExcelente && percentualTotal >= 60;

  const statusConfig = isExcelente
    ? {
        label: "Desempenho Excelente (≥ 90%)",
        desc: "Repasse financeiro integral assegurado pelo cumprimento das metas do Bloco Universal.",
        badgeBg: "bg-emerald-50 dark:bg-emerald-950/50",
        badgeText: "text-emerald-700 dark:text-emerald-300",
        badgeBorder: "border-emerald-200 dark:border-emerald-800",
        barColor: "bg-emerald-500",
        icon: ShieldCheck,
      }
    : isRegular
    ? {
        label: "Desempenho Regular (60% a 89%)",
        desc: "Repasse proporcional com exigência de plano de aceleração das inspeções pendentes.",
        badgeBg: "bg-amber-50 dark:bg-amber-950/50",
        badgeText: "text-amber-700 dark:text-amber-300",
        badgeBorder: "border-amber-200 dark:border-amber-800",
        barColor: "bg-amber-500",
        icon: TrendingUp,
      }
    : {
        label: "Desempenho Crítico (< 60%)",
        desc: "Risco de glosa orçamentária e perda de incentivos financeiros estaduais.",
        badgeBg: "bg-rose-50 dark:bg-rose-950/50",
        badgeText: "text-rose-700 dark:text-rose-300",
        badgeBorder: "border-rose-200 dark:border-rose-800",
        barColor: "bg-rose-500",
        icon: AlertTriangle,
      };

  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs relative overflow-hidden">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Lado Esquerdo: Identificação e Status */}
        <div className="space-y-3 max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Bloco Universal de Indicadores Sanitários · Exercício {ano}
                </h2>
                <span className="text-xs font-mono text-slate-400">SES/MG</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Pactuação oficial da Vigilância em Saúde: soma ponderada dos 5 indicadores universais (IND-11 a IND-15).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${statusConfig.badgeBg} ${statusConfig.badgeText} ${statusConfig.badgeBorder}`}
            >
              <StatusIcon className="w-3.5 h-3.5" />
              <span>{statusConfig.label}</span>
            </span>

            <span className="text-xs text-slate-500 dark:text-slate-400">
              {totalAtingidos} de 5 metas atingidas no ano
            </span>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {statusConfig.desc}
          </p>
        </div>

        {/* Lado Direito: Métricas Numéricas e Pontuação Financeira */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="text-center sm:text-left pr-0 sm:pr-4 sm:border-r border-slate-200 dark:border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Pontuação Auferida
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {pontuacaoTotal.toFixed(1)}{" "}
              <span className="text-xs font-normal text-slate-500">/ 25.0 pts</span>
            </div>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold block mt-0.5">
              Peso financeiro: 25% total
            </span>
          </div>

          <div className="text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Aproveitamento Global
            </span>
            <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
              {percentualTotal.toFixed(1)}%
            </div>
            <span className="text-[11px] text-slate-400 block mt-0.5">
              Meta do bloco: ≥ 90.0%
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso com Marcadores de Semáforo */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
              Crítico (&lt; 60%)
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Regular (60-89%)
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
              Excelente (≥ 90%)
            </span>
          </div>
          <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
            {percentualTotal.toFixed(1)}% de 100%
          </span>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden p-0.5 relative">
          <div
            className={`h-full rounded-full transition-all duration-700 ${statusConfig.barColor}`}
            style={{ width: `${Math.min(Math.max(percentualTotal, 0), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
};
