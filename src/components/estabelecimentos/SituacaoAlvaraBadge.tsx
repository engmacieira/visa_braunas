/**
 * Componente Badge para Situação do Alvará Sanitário
 * Válido | Vencido | Em Análise | Não Possui (Irregular) | Cassado
 */

import React from "react";
import { CheckCircle2, AlertTriangle, Clock, XCircle, Ban } from "lucide-react";
import { SituacaoAlvara } from "../../types/estabelecimento";

interface SituacaoAlvaraBadgeProps {
  situacao: SituacaoAlvara | string;
  size?: "sm" | "md";
}

const SITUACAO_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  Válido: {
    label: "Alvará Válido",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  "Em Análise": {
    label: "Em Análise",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: Clock,
  },
  Vencido: {
    label: "Alvará Vencido",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  "Não Possui (Irregular)": {
    label: "Sem Alvará (Irregular)",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  Cassado: {
    label: "Alvará Cassado",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-800 dark:text-slate-200",
    border: "border-slate-300 dark:border-slate-700",
    icon: Ban,
  },
};

export const SituacaoAlvaraBadge: React.FC<SituacaoAlvaraBadgeProps> = ({
  situacao,
  size = "sm",
}) => {
  const config = SITUACAO_CONFIG[situacao] || {
    label: situacao,
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: Clock,
  };

  const Icon = config.icon;
  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1 font-medium"
      : "text-xs px-2.5 py-1 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-md border ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default SituacaoAlvaraBadge;
