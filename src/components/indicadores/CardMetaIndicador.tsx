/**
 * Card de Apresentação de Meta Pactuada (CardMetaIndicador)
 * Exibe título, metas oficiais SES/MG para Braúnas/MG, numerador/denominador,
 * percentual de cobertura, peso financeiro (5%), barra de progresso e badge semafórico.
 */

import React from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  Coins,
  Shield,
  Target,
} from "lucide-react";
import {
  IndicadorMetaItem,
  IndicadorUniversalDetalheItem,
} from "../../types/indicadores";

interface CardMetaIndicadorProps {
  indicador: IndicadorUniversalDetalheItem | IndicadorMetaItem;
  isSelected?: boolean;
  onClick?: () => void;
}

export const CardMetaIndicador: React.FC<CardMetaIndicadorProps> = ({
  indicador,
  isSelected = false,
  onClick,
}) => {
  const { codigo, titulo, descricao, unidade, progresso } = indicador;
  const { meta_pactuada, realizado, percentual_atingido, status } = progresso;

  // Propriedades enriquecidas do IndicadorUniversalDetalheItem (quando disponíveis)
  const detalhe = "numero" in indicador ? (indicador as IndicadorUniversalDetalheItem) : null;
  const numerador = detalhe ? detalhe.numerador : realizado;
  const denominador = detalhe ? detalhe.denominador : meta_pactuada;
  const pontuacao = detalhe ? detalhe.pontuacao_alcancada : (percentual_atingido >= 100 ? 5.0 : (percentual_atingido / 100) * 5.0);
  const peso = detalhe?.peso_financeiro_percentual ?? 5.0;
  const rotuloRisco = detalhe?.grau_risco_rotulo;
  const atingiuMeta = detalhe?.atingiu_meta ?? (percentual_atingido >= 100);

  // Determinação semântica do estado de atingimento
  const isAtingida = atingiuMeta || percentual_atingido >= 100 || status?.toLowerCase() === "atingida";
  const isAtencao =
    !isAtingida &&
    (percentual_atingido >= 50 || status?.toLowerCase() === "em andamento");

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
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={`bg-white dark:bg-slate-900 border rounded-xl p-5 shadow-xs transition-all relative group flex flex-col justify-between ${
        isSelected
          ? "border-teal-500 ring-2 ring-teal-500/20 shadow-md"
          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div>
        {/* Topo do Card: Código, Rótulo e Badge de Status */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
              {codigo}
            </span>
            {rotuloRisco && (
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                · {rotuloRisco}
              </span>
            )}
          </div>

          <span
            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusConfig.bgBadge} ${statusConfig.textBadge} ${statusConfig.borderBadge}`}
          >
            <StatusIcon className="w-3 h-3 shrink-0" />
            <span>{statusConfig.label}</span>
          </span>
        </div>

        {/* Título e Descrição Técnica Oficial */}
        <div className="mb-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
            {titulo}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {descricao}
          </p>
        </div>

        {/* Bloco de Métricas: Realizado vs Meta Oficial e Pontuação Financeira */}
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 mb-3 border border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-2 gap-3 mb-2 pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Realizado / Apurado
              </span>
              <div className="text-base font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                {numerador.toLocaleString("pt-BR")}{" "}
                <span className="text-xs font-normal text-slate-500">{unidade}</span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Meta Oficial Pactuada
              </span>
              <div className="text-base font-bold text-slate-700 dark:text-slate-300 tabular-nums mt-0.5">
                {detalhe?.meta_percentual !== undefined && unidade === "%"
                  ? `≥ ${detalhe.meta_percentual}%`
                  : `${denominador.toLocaleString("pt-BR")} ${unidade}`}
              </div>
            </div>
          </div>

          {/* Submetadados: Pontuação do Repasse Financeiro (Peso 5%) */}
          <div className="flex items-center justify-between text-[11px] pt-0.5">
            <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1 font-medium">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Repasse financeiro:
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 tabular-nums">
              {pontuacao.toFixed(1)} / {peso.toFixed(1)} pts ({peso}% do bloco)
            </span>
          </div>
        </div>
      </div>

      {/* Rodapé: Barra de Progresso e Ação de Drill-Down */}
      <div className="space-y-2 mt-auto">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium flex items-center gap-1">
            <Target className="w-3 h-3 text-slate-400" />
            Cumprimento da Meta
          </span>
          <span className="font-bold text-slate-900 dark:text-white tabular-nums">
            {percentual_atingido.toFixed(1)}%
          </span>
        </div>

        <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
          <div
            className={`h-full rounded-full transition-all duration-500 ${statusConfig.barColor}`}
            style={{ width: `${percentualLimitado}%` }}
          />
        </div>

        {onClick && (
          <div className="pt-1 flex items-center justify-end text-[11px] font-semibold text-teal-600 dark:text-teal-400 group-hover:underline">
            <span>{isSelected ? "Ocultar estabelecimentos" : "Ver estabelecimentos"}</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        )}
      </div>
    </div>
  );
};

export default CardMetaIndicador;
