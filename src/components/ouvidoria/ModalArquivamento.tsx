/**
 * Modal de Conclusão e Arquivamento Fundamentado de Denúncias Sanitárias
 * Exige justificativa formal técnica e permite redigir resposta pública ao cidadão.
 */

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  FileText,
  X,
  XCircle,
} from "lucide-react";
import { useConcluirDenunciaMutation } from "../../hooks/useOuvidoria";
import { ConcluirDenunciaDTO, StatusDenuncia } from "../../types/ouvidoria";

const arquivamentoSchema = z.object({
  status: z.enum(["arquivada", "improcedente", "procedente"]),
  conclusao_apuracao: z
    .string()
    .min(10, "A conclusão/justificativa fundamentada deve conter no mínimo 10 caracteres"),
  resposta_ao_denunciante: z.string().optional(),
});

type ArquivamentoFormData = z.infer<typeof arquivamentoSchema>;

interface ModalArquivamentoProps {
  isOpen: boolean;
  onClose: () => void;
  denunciaId: string;
  protocolo: string;
  onSucesso?: () => void;
}

export const ModalArquivamento: React.FC<ModalArquivamentoProps> = ({
  isOpen,
  onClose,
  denunciaId,
  protocolo,
  onSucesso,
}) => {
  const concluirMutation = useConcluirDenunciaMutation(denunciaId);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ArquivamentoFormData>({
    resolver: zodResolver(arquivamentoSchema),
    defaultValues: {
      status: "arquivada",
      conclusao_apuracao: "",
      resposta_ao_denunciante: "",
    },
  });

  if (!isOpen) return null;

  const statusSelecionado = watch("status");

  const onSubmit = async (data: ArquivamentoFormData) => {
    try {
      const payload: ConcluirDenunciaDTO = {
        status: data.status as StatusDenuncia,
        conclusao_apuracao: data.conclusao_apuracao.trim(),
        resposta_ao_denunciante: data.resposta_ao_denunciante?.trim() || null,
      };

      await concluirMutation.mutateAsync(payload);
      if (onSucesso) {
        onSucesso();
      }
      onClose();
    } catch {
      // Erro é tratado pelo React Query
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <Archive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Encerramento / Arquivamento de Denúncia
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
          {concluirMutation.isError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {concluirMutation.error instanceof Error
                  ? concluirMutation.error.message
                  : "Erro ao concluir/arquivar a denúncia."}
              </span>
            </div>
          )}

          {/* Seleção do Desfecho */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Desfecho do Processo de Ouvidoria <span className="text-rose-500">*</span>
            </label>
            <select
              {...register("status")}
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="arquivada">Arquivada (Motivos Administrativos / Prazo Decorrido)</option>
              <option value="improcedente">Improcedente (Fatos Não Constatados em Vistoria)</option>
              <option value="procedente">Procedente (Irregularidade Constatada e Notificada)</option>
            </select>
          </div>

          {/* Conclusão Técnica e Justificativa */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Conclusão da Apuração / Justificativa Fundamentada <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              {...register("conclusao_apuracao")}
              placeholder="Descreva fundamentadamente os motivos fáticos e legais da conclusão da apuração..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.conclusao_apuracao && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.conclusao_apuracao.message}
              </p>
            )}
          </div>

          {/* Resposta Pública ao Cidadão */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Resposta Oficial ao Cidadão (Visível na Consulta por Protocolo)
            </label>
            <textarea
              rows={3}
              {...register("resposta_ao_denunciante")}
              placeholder="Ex: A Vigilância Sanitária realizou inspeção no local e constatou que o estabelecimento sanou as irregularidades..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Este texto ficará disponível para leitura pelo cidadão ao consultar o protocolo da denúncia.
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
              className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Archive className="w-4 h-4" />
              <span>{isSubmitting ? "Salvando..." : "Confirmar Encerramento"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalArquivamento;
