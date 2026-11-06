/**
 * Card de Exibição Protegida dos Dados do Denunciante
 * Respeita a legislação de Ouvidoria Pública (Lei Federal 13.460/2017) e LGPD.
 * Oculta e mascara a identidade quando a denúncia for anônima.
 */

import React from "react";
import { Lock, Mail, Phone, ShieldCheck, User, UserX } from "lucide-react";

interface DenuncianteCardProps {
  denuncianteAnonimo: boolean;
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  className?: string;
}

export const DenuncianteCard: React.FC<DenuncianteCardProps> = ({
  denuncianteAnonimo,
  nome,
  telefone,
  email,
  className = "",
}) => {
  if (denuncianteAnonimo) {
    return (
      <div
        className={`p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2 ${className}`}
      >
        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
          <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Autoria da Denúncia
            </span>
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <span>Identidade sob Sigilo Legal • Denúncia Anônima</span>
            </p>
          </div>
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed pl-10">
          O manifestante optou pelo anonimato no registro. Em conformidade com a Lei Federal 13.460/2017 e a Lei Geral de Proteção de Dados (LGPD), nenhum dado pessoal de contato é divulgado no processo de fiscalização.
        </p>
      </div>
    );
  }

  return (
    <div
      className={`p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 rounded-xl space-y-3 ${className}`}
    >
      <div className="flex items-center justify-between border-b border-teal-200/60 dark:border-teal-800/60 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-300">
            <User className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-teal-700 dark:text-teal-400 block tracking-wider">
              Cidadão Denunciante (Identificado)
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white">
              {nome || "Munícipe Identificado"}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-semibold text-teal-800 dark:text-teal-300 bg-teal-100/70 dark:bg-teal-900/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3" />
          <span>Dados Protegidos</span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pl-1">
        {telefone ? (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <Phone className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Telefone: {telefone}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">Telefone não fornecido</span>
        )}

        {email ? (
          <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 truncate">
            <Mail className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
            <span className="truncate">E-mail: {email}</span>
          </div>
        ) : (
          <span className="text-slate-400 text-[11px]">E-mail não fornecido</span>
        )}
      </div>
    </div>
  );
};

export default DenuncianteCard;
