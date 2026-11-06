/**
 * Badge Semântico para Status de Tramitação da Denúncia
 */

import React from "react";
import {
  Archive,
  CheckCircle2,
  Clock,
  FileSearch,
  Hourglass,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import { StatusDenuncia } from "../../types/ouvidoria";

interface StatusDenunciaBadgeProps {
  status: StatusDenuncia | string;
  className?: string;
}

interface BadgeConfig {
  label: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const STATUS_CONFIGS: Record<string, BadgeConfig> = {
  recebida: {
    label: "Recebida",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: Hourglass,
  },
  em_analise: {
    label: "Em Triagem",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    icon: FileSearch,
  },
  em_triagem: {
    label: "Em Triagem",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    icon: FileSearch,
  },
  em_apuracao_fiscal: {
    label: "Em Apuração Fiscal",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    icon: Clock,
  },
  despachada_inspecao: {
    label: "Despachada para Fiscalização",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    icon: Clock,
  },
  procedente: {
    label: "Procedente",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  concluida: {
    label: "Concluída",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  improcedente: {
    label: "Improcedente",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: XCircle,
  },
  arquivada: {
    label: "Arquivada",
    bgClass: "bg-slate-100 dark:bg-slate-800/80",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: Archive,
  },
  arquivada_improcedente: {
    label: "Arquivada (Improcedente)",
    bgClass: "bg-slate-100 dark:bg-slate-800/80",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: Archive,
  },
};

export const StatusDenunciaBadge: React.FC<StatusDenunciaBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalizado = (status || "recebida").toLowerCase().trim();
  const config = STATUS_CONFIGS[normalizado] || {
    label: status,
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: ShieldAlert,
  };

  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${config.bgClass} ${config.textClass} ${config.borderClass} ${className}`}
    >
      <Icon className="w-3 h-3 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusDenunciaBadge;
