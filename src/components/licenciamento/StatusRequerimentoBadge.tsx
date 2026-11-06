/**
 * Badge Semântico para Status de Requerimento de Licenciamento Sanitário
 */

import React from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  FileSearch,
  Hourglass,
  XCircle,
} from "lucide-react";
import { StatusRequerimento } from "../../types/licenciamento";

interface StatusRequerimentoBadgeProps {
  status: StatusRequerimento | string;
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
  pendente: {
    label: "Pendente",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: Hourglass,
  },
  solicitado: {
    label: "Solicitado",
    bgClass: "bg-amber-50 dark:bg-amber-950/40",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-200 dark:border-amber-800",
    icon: Hourglass,
  },
  em_analise: {
    label: "Em Análise",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    icon: FileSearch,
  },
  em_analise_documental: {
    label: "Análise Documental",
    bgClass: "bg-sky-50 dark:bg-sky-950/40",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-200 dark:border-sky-800",
    icon: FileSearch,
  },
  aguardando_inspecao: {
    label: "Aguardando Vistoria",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    icon: Clock,
  },
  vistoria_pendente: {
    label: "Vistoria Pendente",
    bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-200 dark:border-indigo-800",
    icon: Clock,
  },
  aguardando_adequacao: {
    label: "Exigências / Adequação",
    bgClass: "bg-orange-50 dark:bg-orange-950/40",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-200 dark:border-orange-800",
    icon: AlertCircle,
  },
  deferido: {
    label: "Deferido / Aprovado",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  aprovado: {
    label: "Aprovado",
    bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-200 dark:border-emerald-800",
    icon: CheckCircle2,
  },
  indeferido: {
    label: "Indeferido",
    bgClass: "bg-rose-50 dark:bg-rose-950/40",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-200 dark:border-rose-800",
    icon: XCircle,
  },
  cancelado: {
    label: "Cancelado",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-600 dark:text-slate-400",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: XCircle,
  },
};

export const StatusRequerimentoBadge: React.FC<StatusRequerimentoBadgeProps> = ({
  status,
  className = "",
}) => {
  const normalizado = (status || "pendente").toLowerCase().trim();
  const config = STATUS_CONFIGS[normalizado] || {
    label: status,
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-200 dark:border-slate-700",
    icon: Hourglass,
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

export default StatusRequerimentoBadge;
