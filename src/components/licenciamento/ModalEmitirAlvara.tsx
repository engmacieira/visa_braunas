/**
 * Modal de Expedição e Emissão Oficial de Alvará Sanitário
 * Permite revisão final das condicionantes, vigência e geração com QR Code.
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  FileCheck2,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEmitirAlvaraMutation } from "../../hooks/useLicenciamento";
import { AlvaraSanitarioDetalhe, EmitirAlvaraDTO } from "../../types/licenciamento";

const emitirAlvaraSchema = z.object({
  validade_meses: z.number().min(1, "Mínimo 1 mês").max(60, "Máximo 60 meses"),
  condicionantes_restricoes: z.string().max(2000, "Máximo 2000 caracteres").optional(),
});

type EmitirAlvaraFormData = z.infer<typeof emitirAlvaraSchema>;

interface ModalEmitirAlvaraProps {
  isOpen: boolean;
  onClose: () => void;
  estabelecimentoId: string;
  requerimentoId?: string;
  inspecaoId?: string;
  razaoSocial?: string;
  cnpjCpf?: string;
  onSucesso?: (alvara: AlvaraSanitarioDetalhe) => void;
}

export const ModalEmitirAlvara: React.FC<ModalEmitirAlvaraProps> = ({
  isOpen,
  onClose,
  estabelecimentoId,
  requerimentoId,
  inspecaoId,
  razaoSocial,
  cnpjCpf,
  onSucesso,
}) => {
  const emitirMutation = useEmitirAlvaraMutation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EmitirAlvaraFormData>({
    resolver: zodResolver(emitirAlvaraSchema),
    defaultValues: {
      validade_meses: 12,
      condicionantes_restricoes: "",
    },
  });

  const validadeMeses = watch("validade_meses") || 12;

  // Cálculo da data prevista de vencimento
  const hoje = new Date();
  const dataVencimentoPrevista = new Date();
  dataVencimentoPrevista.setMonth(dataVencimentoPrevista.getMonth() + Number(validadeMeses));

  if (!isOpen) return null;

  const onSubmit = async (data: EmitirAlvaraFormData) => {
    try {
      const payload: EmitirAlvaraDTO = {
        estabelecimento_id: estabelecimentoId,
        requerimento_id: requerimentoId || undefined,
        inspecao_conclusiva_id: inspecaoId || undefined,
        validade_meses: Number(data.validade_meses),
        condicionantes_restricoes: data.condicionantes_restricoes?.trim() || undefined,
      };

      const alvaraCriado = await emitirMutation.mutateAsync(payload);
      if (onSucesso) {
        onSucesso(alvaraCriado);
      }
      onClose();
    } catch {
      // Erro é tratado e exibido via mutate state
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Expedição Oficial de Alvará Sanitário
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Geração de numeração sequencial e código de autenticidade com QR Code
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {emitirMutation.isError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {emitirMutation.error instanceof Error
                  ? emitirMutation.error.message
                  : "Erro ao emitir o alvará sanitário. Verifique os dados e tente novamente."}
              </span>
            </div>
          )}

          {/* Dados do Estabelecimento Destinatário */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Beneficiário / Estabelecimento
            </span>
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {razaoSocial || "Estabelecimento Selecionado"}
            </p>
            {cnpjCpf && (
              <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                CNPJ/CPF: {cnpjCpf}
              </p>
            )}
          </div>

          {/* Prazo de Validade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vigência (Meses) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="60"
                {...register("validade_meses", { valueAsNumber: true })}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.validade_meses && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.validade_meses.message}
                </p>
              )}
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Prevista de Vencimento
              </span>
              <div className="px-3 py-2 text-xs bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-700 dark:text-slate-300 flex items-center gap-1.5 font-medium">
                <Calendar className="w-3.5 h-3.5 text-teal-600" />
                <span>{dataVencimentoPrevista.toLocaleDateString("pt-BR")}</span>
              </div>
            </div>
          </div>

          {/* Condicionantes e Restrições */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Condicionantes, Restrições ou Observações Técnicas (Opcional)
            </label>
            <textarea
              rows={3}
              {...register("condicionantes_restricoes")}
              placeholder="Ex: Válido exclusivamente para comercialização sem fracionamento. Manter rotina semestral de limpeza de caixas d'água."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.condicionantes_restricoes && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.condicionantes_restricoes.message}
              </p>
            )}
          </div>

          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-start gap-2.5 text-xs text-teal-800 dark:text-teal-200">
            <ShieldCheck className="w-4 h-4 text-teal-600 mt-0.5 shrink-0" />
            <p className="text-[11px] leading-relaxed">
              Ao emitir, o sistema registrará a numeração sequencial anual, gerará o token de autenticidade pública e atualizará a situação cadastral do estabelecimento para <strong>Válido</strong>.
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{isSubmitting ? "Emitindo..." : "Confirmar e Emitir Alvará"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalEmitirAlvara;
