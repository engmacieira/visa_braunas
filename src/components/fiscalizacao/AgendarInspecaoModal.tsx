/**
 * Modal de Agendamento e Abertura de Termo de Inspeção Sanitária
 * Validação condicional Zod (regras VAPT - Indicador 11).
 */

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  Building2,
  Calendar,
  Clock,
  HardHat,
  Search,
  UserCheck,
  X,
} from "lucide-react";
import { AgendarInspecaoFormValues, TipoMotivoInspecao } from "../../types/fiscalizacao";
import { useAgendarInspecaoMutation } from "../../hooks/useFiscalizacao";
import { useEstabelecimentosList } from "../../hooks/useEstabelecimentos";
import { useAuth } from "../../contexts/AuthContext";

const MOTIVOS_LABELS: Record<TipoMotivoInspecao, string> = {
  rotina_programada: "Rotina Programada",
  requerimento_alvara: "Requerimento de Alvará",
  denuncia: "Atendimento a Denúncia",
  reinspecao: "Reinspeção Fiscal (Retorno)",
  vapt_trabalhador: "VAPT - Saúde do Trabalhador (Indicador 11)",
  investigacao_surto: "Investigação de Surto / DTA",
};

const agendarInspecaoSchema = z
  .object({
    numero_termo: z.string().min(3, "Número do termo deve ter no mínimo 3 caracteres"),
    estabelecimento_id: z.string().uuid("Selecione um estabelecimento válido"),
    fiscal_responsavel_id: z.string().uuid("Fiscal responsável é obrigatório"),
    motivo: z.enum([
      "rotina_programada",
      "requerimento_alvara",
      "denuncia",
      "reinspecao",
      "vapt_trabalhador",
      "investigacao_surto",
    ]),
    data_inicio: z.string().min(10, "Data de início/abertura é obrigatória"),
    data_agendamento: z.string().optional(),
    hora_inspecao: z.string().optional(),
    fiscais_acompanhantes: z.string().optional(),
    requerimento_id: z.string().optional(),
    denuncia_id: z.string().optional(),
    // VAPT
    nome_local_trabalho: z.string().optional(),
    principais_riscos_identificados: z.string().optional(),
    recomendacoes_orientacoes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.motivo === "vapt_trabalhador") {
      if (!data.nome_local_trabalho || data.nome_local_trabalho.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nome_local_trabalho"],
          message:
            "Para ações VAPT (Saúde do Trabalhador), o nome do posto/local é obrigatório.",
        });
      }
      if (
        !data.principais_riscos_identificados ||
        data.principais_riscos_identificados.trim().length === 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["principais_riscos_identificados"],
          message:
            "Para ações VAPT, informe os principais riscos ocupacionais identificados.",
        });
      }
    }
  });

type AgendarFormData = z.infer<typeof agendarInspecaoSchema>;

interface AgendarInspecaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  estabelecimentoIdPreDefinido?: string;
  motivoPreDefinido?: TipoMotivoInspecao;
  onSucesso?: (inspecaoCriada: any) => void;
}

export const AgendarInspecaoModal: React.FC<AgendarInspecaoModalProps> = ({
  isOpen,
  onClose,
  estabelecimentoIdPreDefinido,
  motivoPreDefinido,
  onSucesso,
}) => {
  const { user } = useAuth();
  const [buscaEstabelecimento, setBuscaEstabelecimento] = useState("");
  const agendarMutation = useAgendarInspecaoMutation();

  const { data: estabelecimentosData } = useEstabelecimentosList({
    busca: buscaEstabelecimento || undefined,
    limit: 20,
    situacao: "Ativo",
  });

  const hoje = new Date().toISOString().split("T")[0];
  const termoGeradoPadrao = `TERM-${new Date().getFullYear()}-${Math.floor(
    1000 + Math.random() * 9000
  )}`;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AgendarFormData>({
    resolver: zodResolver(agendarInspecaoSchema),
    defaultValues: {
      numero_termo: termoGeradoPadrao,
      estabelecimento_id: estabelecimentoIdPreDefinido || "",
      fiscal_responsavel_id: user?.id || "",
      motivo: motivoPreDefinido || "rotina_programada",
      data_inicio: hoje,
      data_agendamento: hoje,
      hora_inspecao: "09:00",
      fiscais_acompanhantes: "",
      nome_local_trabalho: "",
      principais_riscos_identificados: "",
      recomendacoes_orientacoes: "",
    },
  });

  const motivoSelecionado = watch("motivo");
  const estabelecimentoSelecionadoId = watch("estabelecimento_id");

  useEffect(() => {
    if (isOpen) {
      reset({
        numero_termo: `TERM-${new Date().getFullYear()}-${Math.floor(
          1000 + Math.random() * 9000
        )}`,
        estabelecimento_id: estabelecimentoIdPreDefinido || "",
        fiscal_responsavel_id: user?.id || "",
        motivo: motivoPreDefinido || "rotina_programada",
        data_inicio: hoje,
        data_agendamento: hoje,
        hora_inspecao: "09:00",
        fiscais_acompanhantes: "",
        nome_local_trabalho: "",
        principais_riscos_identificados: "",
        recomendacoes_orientacoes: "",
      });
    }
  }, [isOpen, estabelecimentoIdPreDefinido, motivoPreDefinido, user?.id, reset, hoje]);

  if (!isOpen) return null;

  const onSubmit = async (data: AgendarFormData) => {
    try {
      const criada = await agendarMutation.mutateAsync(
        data as AgendarInspecaoFormValues
      );
      if (onSucesso) {
        onSucesso(criada);
      }
      onClose();
    } catch (err: any) {
      // Erro é capturado pelo hook ou tratado na UI
    }
  };

  const estabelecimentoObj = estabelecimentosData?.itens.find(
    (e) => e.id === estabelecimentoSelecionadoId
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Nova Ação Fiscalizatória / Vistoria</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Abertura de termo oficial de inspeção ou agendamento de ação de campo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corpo com scroll */}
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex-1 overflow-y-auto p-6 space-y-5"
        >
          {agendarMutation.isError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                {agendarMutation.error instanceof Error
                  ? agendarMutation.error.message
                  : "Erro ao abrir termo de vistoria sanitária."}
              </span>
            </div>
          )}

          {/* Dados do Termo e Motivo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número do Termo <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                {...register("numero_termo")}
                placeholder="Ex: TERM-2026-0042"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.numero_termo && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.numero_termo.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Motivo da Fiscalização <span className="text-rose-500">*</span>
              </label>
              <select
                {...register("motivo")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {Object.entries(MOTIVOS_LABELS).map(([valor, rotulo]) => (
                  <option key={valor} value={valor}>
                    {rotulo}
                  </option>
                ))}
              </select>
              {errors.motivo && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.motivo.message}
                </p>
              )}
            </div>
          </div>

          {/* Seleção do Estabelecimento */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Estabelecimento Alvo <span className="text-rose-500">*</span>
            </label>
            {estabelecimentoIdPreDefinido && estabelecimentoObj ? (
              <div className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center gap-3">
                <Building2 className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {estabelecimentoObj.razao_social}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    CNPJ/CPF: {estabelecimentoObj.cnpj_cpf} • {estabelecimentoObj.bairro}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrar por Razão Social, Nome Fantasia ou CNPJ..."
                    value={buscaEstabelecimento}
                    onChange={(e) => setBuscaEstabelecimento(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                </div>
                <select
                  {...register("estabelecimento_id")}
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">Selecione o estabelecimento...</option>
                  {estabelecimentosData?.itens.map((est) => (
                    <option key={est.id} value={est.id}>
                      {est.razao_social} ({est.cnpj_cpf}) - {est.bairro} [{est.nivel_risco}]
                    </option>
                  ))}
                </select>
              </div>
            )}
            {errors.estabelecimento_id && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.estabelecimento_id.message}
              </p>
            )}
          </div>

          {/* Datas e Horários */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data de Abertura / Realização <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                {...register("data_inicio")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              {errors.data_inicio && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.data_inicio.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data Agendada (Previsão)
              </label>
              <input
                type="date"
                {...register("data_agendamento")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Horário da Vistoria
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="time"
                  {...register("hora_inspecao")}
                  className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Fiscais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fiscal Responsável <span className="text-rose-500">*</span>
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg">
                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
                <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate">
                  {user?.nome_completo || "Fiscal Responsável"}
                </span>
              </div>
              <input type="hidden" {...register("fiscal_responsavel_id")} />
              {errors.fiscal_responsavel_id && (
                <p className="text-[11px] text-rose-600 mt-1">
                  {errors.fiscal_responsavel_id.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fiscais Acompanhantes / Equipe
              </label>
              <input
                type="text"
                {...register("fiscais_acompanhantes")}
                placeholder="Ex: João da Silva (Fiscal Sanitário II)"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* BLOCO CONDICIONAL VAPT (INDICADOR 11) */}
          {motivoSelecionado === "vapt_trabalhador" && (
            <div className="p-4 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 rounded-xl space-y-3 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                <HardHat className="w-4 h-4 shrink-0 text-teal-600 dark:text-teal-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider">
                  Módulo VAPT - Vigilância em Ambientes e Processos de Trabalho (Indicador 11)
                </h3>
              </div>
              <p className="text-[11px] text-teal-700/80 dark:text-teal-400">
                Ação com foco na saúde, segurança e ergonomia do trabalhador no ambiente ocupacional.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Setor / Posto de Trabalho Vistoriado <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("nome_local_trabalho")}
                  placeholder="Ex: Linha de envase, cozinha industrial, estoque de químicos..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.nome_local_trabalho && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.nome_local_trabalho.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Principais Riscos Ocupacionais Identificados <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  {...register("principais_riscos_identificados")}
                  placeholder="Ex: Risco ergonômico por levantamento de peso repetitivo, risco físico de ruído elevado sem protetor auricular..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.principais_riscos_identificados && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.principais_riscos_identificados.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Recomendações e Orientações Técnicas ao Empregador
                </label>
                <textarea
                  rows={2}
                  {...register("recomendacoes_orientacoes")}
                  placeholder="Orientações preliminares de adequação ergonômica ou fornecimento de EPIs..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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
              {isSubmitting ? (
                <span>Salvando Termo...</span>
              ) : (
                <span>Abrir / Agendar Termo</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AgendarInspecaoModal;
