/**
 * Componente Badge para Parecer e Resultado do Laudo Conclusivo
 * Aprovado | Aprovado c/ Exigências | Notificado c/ Prazo | Auto de Infração | Interdição | Indeferido
 */

import React from "react";
import {
  AlertOctagon,
  AlertTriangle,
  Ban,
  CheckCircle2,
  FileWarning,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { ResultadoInspecao } from "../../types/fiscalizacao";

interface ResultadoInspecaoBadgeProps {
  resultado?: ResultadoInspecao | string | null;
  size?: "sm" | "md";
}

const RESULTADO_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
> = {
  aprovado: {
    label: "Aprovado",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  aprovado_com_exigencias: {
    label: "Aprovado c/ Exigências",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-300",
    border: "border-teal-200 dark:border-teal-800",
    icon: ShieldCheck,
  },
  notificado_com_prazo: {
    label: "Notificado com Prazo",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
    icon: AlertTriangle,
  },
  auto_infracao: {
    label: "Auto de Infração",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
    icon: FileWarning,
  },
  interditado_parcialmente: {
    label: "Interdição Parcial",
    bg: "bg-purple-50 dark:bg-purple-950/40",
    text: "text-purple-700 dark:text-purple-300",
    border: "border-purple-200 dark:border-purple-800",
    icon: AlertOctagon,
  },
  interditado_totalmente: {
    label: "Interdição Total",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-300",
    border: "border-red-200 dark:border-red-800",
    icon: Ban,
  },
  indeferido: {
    label: "Indeferido",
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
    icon: XCircle,
  },
};

export const ResultadoInspecaoBadge: React.FC<ResultadoInspecaoBadgeProps> = ({
  resultado,
  size = "sm",
}) => {
  if (!resultado) {
    return (
      <span className="text-[11px] text-slate-400 italic">Pendente de Laudo</span>
    );
  }

  const config = RESULTADO_CONFIG[resultado] || {
    label: resultado.replace(/_/g, " "),
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: CheckCircle2,
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

export default ResultadoInspecaoBadge;
