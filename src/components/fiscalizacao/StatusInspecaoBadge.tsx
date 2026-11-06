/**
 * Componente Badge para Status da Inspeção Fiscal
 * agendada | em_andamento | concluida | cancelada
 */

import React from "react";
import { Calendar, CheckCircle2, Clock, XCircle } from "lucide-react";
import { StatusInspecao } from "../../types/fiscalizacao";

interface StatusInspecaoBadgeProps {
  status: StatusInspecao | string;
  size?: "sm" | "md";
}

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  agendada: {
    label: "Agendada",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
    icon: Calendar,
  },
  em_andamento: {
    label: "Em Andamento",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: Clock,
  },
  concluida: {
    label: "Concluída",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  cancelada: {
    label: "Cancelada",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-200 dark:border-slate-700",
    icon: XCircle,
  },
};

export const StatusInspecaoBadge: React.FC<StatusInspecaoBadgeProps> = ({
  status,
  size = "sm",
}) => {
  const config = STATUS_CONFIG[status] || {
    label: status,
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

export default StatusInspecaoBadge;
