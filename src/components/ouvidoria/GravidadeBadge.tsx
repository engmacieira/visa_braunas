/**
 * Badge de Classificação de Risco e Gravidade Sanitária da Denúncia
 * Inclui animação visual com pulso para casos urgentes (risco iminente à saúde pública).
 */

import React from "react";
import { AlertCircle, AlertOctagon, AlertTriangle, ShieldCheck } from "lucide-react";
import { GravidadeDenuncia } from "../../types/ouvidoria";

interface GravidadeBadgeProps {
  gravidade: GravidadeDenuncia | string;
  className?: string;
  showIcon?: boolean;
}

export const GravidadeBadge: React.FC<GravidadeBadgeProps> = ({
  gravidade,
  className = "",
  showIcon = true,
}) => {
  const normalizada = (gravidade || "media").toLowerCase().trim();

  switch (normalizada) {
    case "urgente":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs animate-pulse border border-rose-700 ${className}`}
          title="Gravidade Urgente: Risco iminente à saúde pública (surtos, intoxicações graves, perecíveis em escolas)"
        >
          {showIcon && <AlertOctagon className="w-3.5 h-3.5" />}
          <span>Urgente</span>
        </span>
      );

    case "alta":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-orange-100 text-orange-900 dark:bg-orange-950/80 dark:text-orange-200 border border-orange-300 dark:border-orange-800 ${className}`}
          title="Gravidade Alta: Medicamentos clandestinos, carnes sem inspeção, estabelecimentos de alto risco"
        >
          {showIcon && <AlertTriangle className="w-3 h-3 text-orange-600" />}
          <span>Alta</span>
        </span>
      );

    case "media":
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 ${className}`}
          title="Gravidade Média: Irregularidades higiênicas em comércio de alimentos, falta de alvará"
        >
          {showIcon && <AlertCircle className="w-3 h-3 text-amber-600" />}
          <span>Média</span>
        </span>
      );

    case "baixa":
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium uppercase tracking-wider bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${className}`}
          title="Gravidade Baixa: Questões estruturais secundárias, informativas"
        >
          {showIcon && <ShieldCheck className="w-3 h-3 text-slate-500" />}
          <span>Baixa</span>
        </span>
      );
  }
};

export default GravidadeBadge;
