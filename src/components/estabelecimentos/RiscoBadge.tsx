/**
 * Componente Badge para Nível de Risco Sanitário Preponderante
 * Risco III (Alto/Vermelho) > Risco II (Médio/Âmbar) > Risco I (Baixo/Azul) > Dispensado (Verde)
 */

import React from "react";
import { ShieldAlert } from "lucide-react";
import { NivelRisco } from "../../types/estabelecimento";

interface RiscoBadgeProps {
  risco: NivelRisco | string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

const RISCO_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string }
> = {
  "Risco III": {
    label: "Risco III (Alto)",
    bg: "bg-rose-50 dark:bg-rose-950/40",
    text: "text-rose-700 dark:text-rose-300",
    border: "border-rose-200 dark:border-rose-800",
  },
  "Risco II": {
    label: "Risco II (Médio)",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-200 dark:border-amber-800",
  },
  "Risco I": {
    label: "Risco I (Baixo)",
    bg: "bg-blue-50 dark:bg-blue-950/40",
    text: "text-blue-700 dark:text-blue-300",
    border: "border-blue-200 dark:border-blue-800",
  },
  Dispensado: {
    label: "Dispensado",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-300",
    border: "border-emerald-200 dark:border-emerald-800",
  },
};

export const RiscoBadge: React.FC<RiscoBadgeProps> = ({
  risco,
  size = "sm",
  showIcon = true,
}) => {
  const config = RISCO_CONFIG[risco] || {
    label: risco,
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-700 dark:text-slate-300",
    border: "border-slate-200 dark:border-slate-700",
  };

  const sizeClasses =
    size === "sm"
      ? "text-[11px] px-2 py-0.5 gap-1"
      : "text-xs px-2.5 py-1 gap-1.5 font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-md border font-medium ${config.bg} ${config.text} ${config.border} ${sizeClasses} whitespace-nowrap`}
    >
      {showIcon && <ShieldAlert className="w-3 h-3 shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};

export default RiscoBadge;
