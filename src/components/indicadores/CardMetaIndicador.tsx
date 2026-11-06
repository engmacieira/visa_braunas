/**
 * Card de Apresentação de Meta Pactuada (CardMetaIndicador)
 * Exibe título, meta, realizado, percentual de atingimento, barra de progresso e badge de status.
 */

import React from "react";
import { AlertTriangle, CheckCircle2, Clock, Info, Target } from "lucide-react";
import { IndicadorMetaItem } from "../../types/indicadores";

interface CardMetaIndicadorProps {
  indicador: IndicadorMetaItem;
  onClick?: () => void;
}

export const CardMetaIndicador: React.FC<CardMetaIndicadorProps> = ({
  indicador,
  onClick,
}) => {
  const { codigo, titulo, descricao, unidade, progresso } = indicador;
  const { meta_pactuada, realizado, percentual_atingido, status } = progresso;

  // Determinação semântica do estado de atingimento
  const isAtingida = percentual_atingido >= 100 || status?.toLowerCase() === "atingida";
  const isAtencao =
    !isAtingida &&
    (percentual_atingido >= 50 || status?.toLowerCase() === "em andamento");
  const isAlerta = !isAtingida && !isAtencao;

  const statusConfig = isAtingida
    ? {
        label: "Meta Atingida",
        bgBadge: "bg-emerald-50 dark:bg-emerald-950/40",
        textBadge: "text-emerald-700 dark:text-emerald-300",
        borderBadge: "border-emerald-200 dark:border-emerald-800",
        barColor: "bg-emerald-500",
        icon: CheckCircle2,
      }
    : isAtencao
    ? {
        label: "Em Andamento",
        bgBadge: "bg-amber-50 dark:bg-amber-950/40",
        textBadge: "text-amber-700 dark:text-amber-300",
        borderBadge: "border-amber-200 dark:border-amber-800",
        barColor: "bg-amber-500",
        icon: Clock,
      }
    : {
        label: "Meta Crítica",
        bgBadge: "bg-rose-50 dark:bg-rose-950/40",
        textBadge: "text-rose-700 dark:text-rose-300",
        borderBadge: "border-rose-200 dark:border-rose-800",
        barColor: "bg-rose-500",
        icon: AlertTriangle,
      };

  const StatusIcon = statusConfig.icon;
  const percentualLimitado = Math.min(Math.max(percentual_atingido, 0), 100);

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-all ${
        onClick
          ? "cursor-pointer hover:border-teal-500/60 dark:hover:border-teal-500/60 hover:shadow-md"
          : ""
      }`}
    >
      {/* Topo do Card: Código e Badge de Status */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            {codigo}
          </span>
          <span className="text-[11px] text-slate-400 font-medium">SUS / Pacto</span>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bgBadge} ${statusConfig.textBadge} ${statusConfig.borderBadge}`}
        >
          <StatusIcon className="w-3 h-3 shrink-0" />
          <span>{statusConfig.label}</span>
        </span>
      </div>

      {/* Título e Descrição Técnica */}
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug">
          {titulo}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
          {descricao}
        </p>
      </div>

      {/* Valores: Realizado vs Meta Pactuada */}
      <div className="grid grid-cols-2 gap-3 py-3 px-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-3">
        <div>
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Realizado
          </span>
          <div className="text-lg font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
            {realizado.toLocaleString("pt-BR")}{" "}
            <span className="text-xs font-normal text-slate-500">{unidade}</span>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Meta Pactuada
          </span>
          <div className="text-lg font-bold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
            {meta_pactuada.toLocaleString("pt-BR")}{" "}
            <span className="text-xs font-normal text-slate-500">{unidade}</span>
          </div>
        </div>
      </div>

      {/* Barra de Progresso Visual */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Target className="w-3 h-3 text-slate-400" />
            Progresso Acumulado
          </span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {percentual_atingido.toFixed(1)}%
          </span>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
            style={{ width: `${percentualLimitado}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default CardMetaIndicador;
