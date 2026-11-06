/**
 * Modal de Despacho Fiscal de Denúncias Sanitárias
 * Permite ao Coordenador encaminhar a denúncia, designar fiscal e abrir inspeção.
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  ClipboardCheck,
  Send,
  ShieldCheck,
  UserCheck,
  X,
} from "lucide-react";
import { useDespachoFiscalMutation } from "../../hooks/useOuvidoria";
import { useAuth } from "../../contexts/AuthContext";
import { DespacharDenunciaDTO, GravidadeDenuncia } from "../../types/ouvidoria";

const despachoSchema = z.object({
  despacho_coordenacao: z
    .string()
    .min(10, "Despacho da coordenação deve conter no mínimo 10 caracteres"),
  fiscal_designado_id: z.string().optional(),
  nova_gravidade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
  iniciar_apuracao: z.boolean(),
});

type DespachoFormData = z.infer<typeof despachoSchema>;

interface ModalDespachoFiscalProps {
  isOpen: boolean;
  onClose: () => void;
  denunciaId: string;
  protocolo: string;
  gravidadeAtual: GravidadeDenuncia;
  onSucesso?: () => void;
}

export const ModalDespachoFiscal: React.FC<ModalDespachoFiscalProps> = ({
  isOpen,
  onClose,
  denunciaId,
  protocolo,
  gravidadeAtual,
  onSucesso,
}) => {
  const { user } = useAuth();
  const despachoMutation = useDespachoFiscalMutation(denunciaId);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DespachoFormData>({
    resolver: zodResolver(despachoSchema),
    defaultValues: {
      despacho_coordenacao: "",
      fiscal_designado_id: user?.id || "",
      nova_gravidade: gravidadeAtual,
      iniciar_apuracao: true,
    },
  });

  if (!isOpen) return null;

  const onSubmit = async (data: DespachoFormData) => {
    try {
      const payload: DespacharDenunciaDTO = {
        despacho_coordenacao: data.despacho_coordenacao.trim(),
        fiscal_designado_id: data.fiscal_designado_id || null,
        nova_gravidade: data.nova_gravidade || null,
        iniciar_apuracao: data.iniciar_apuracao,
      };

      await despachoMutation.mutateAsync(payload);
      if (onSucesso) {
        onSucesso();
      }
      onClose();
    } catch {
      // Erro é capturado pelo hook
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Despacho e Encaminhamento Fiscal
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Protocolo: {protocolo}
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

        {/* Formulário */}
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {despachoMutation.isError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {despachoMutation.error instanceof Error
                  ? despachoMutation.error.message
                  : "Erro ao despachar a denúncia para fiscalização."}
              </span>
            </div>
          )}

          {/* Despacho da Coordenação */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Despacho / Determinação da Coordenação <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              {...register("despacho_coordenacao")}
              placeholder="Ex: Determino realização de vistoria in loco para apurar condições higiênico-sanitárias de manipulação e procedência dos produtos..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.despacho_coordenacao && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.despacho_coordenacao.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Fiscal Designado */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fiscal Sanitário Designado
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {user?.nome_completo || "Equipe de Fiscalização"}
                </span>
              </div>
              <input type="hidden" {...register("fiscal_designado_id")} />
            </div>

            {/* Reclassificação de Gravidade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Reclassificação de Gravidade
              </label>
              <select
                {...register("nova_gravidade")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="baixa">Baixa (Rotina secundária)</option>
                <option value="media">Média (Padrão de triagem)</option>
                <option value="alta">Alta (Risco significativo)</option>
                <option value="urgente">Urgente (Risco iminente à saúde)</option>
              </select>
            </div>
          </div>

          {/* Toggle de Início Imediato da Apuração */}
          <div className="p-3 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 rounded-xl flex items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                Iniciar Apuração Fiscal Imediata
              </span>
              <p className="text-[11px] text-teal-700 dark:text-teal-400">
                Altera o status da denúncia para "Em Apuração Fiscal" na fila de fiscalização.
              </p>
            </div>
            <input
              type="checkbox"
              {...register("iniciar_apuracao")}
              className="w-4 h-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
            />
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
              <Send className="w-4 h-4" />
              <span>{isSubmitting ? "Despachando..." : "Confirmar Despacho"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalDespachoFiscal;
