/**
 * Tela de Lavratura e Emissão do Laudo Técnico de Inspeção Sanitária
 * Rota: /inspecoes/:id/laudo
 * Consolida dados cadastrais, checklist dinâmico JSONB, relatório fotográfico
 * de evidências, prazos para adequação e parecer conclusivo do fiscal.
 */

import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  FileCheck2,
  FileText,
  HardHat,
  Printer,
  Save,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { ROUTES } from "../../config/routes.config";
import { parseApiError } from "../../utils/apiErrorHandler";
import {
  useConcluirInspecaoMutation,
  useInspecaoDetalhe,
} from "../../hooks/useFiscalizacao";
import { useEstabelecimentoDetalhe } from "../../hooks/useEstabelecimentos";
import {
  ChecklistRespostas,
  FotoEvidencia,
  LaudoConclusaoFormValues,
  ResultadoInspecao,
} from "../../types/fiscalizacao";
import { StatusInspecaoBadge } from "../../components/fiscalizacao/StatusInspecaoBadge";
import { ResultadoInspecaoBadge } from "../../components/fiscalizacao/ResultadoInspecaoBadge";
import { ChecklistDinamico } from "../../components/fiscalizacao/ChecklistDinamico";
import { UploadEvidencias } from "../../components/fiscalizacao/UploadEvidencias";
import { RiscoBadge } from "../../components/estabelecimentos/RiscoBadge";

const laudoSchema = z
  .object({
    resultado: z.enum([
      "aprovado",
      "aprovado_com_exigencias",
      "notificado_com_prazo",
      "auto_infracao",
      "interditado_parcialmente",
      "interditado_totalmente",
      "indeferido",
    ]),
    data_fim: z.string().min(10, "Data de encerramento da vistoria é obrigatória"),
    relato_vistoria: z.string().min(15, "Relato minucioso da vistoria deve ter no mínimo 15 caracteres"),
    irregularidades_constatadas: z.string().optional(),
    exigencias_notificadas: z.string().optional(),
    prazo_adequacao_dias: z.number().min(0),
    data_limite_adequacao: z.string().optional(),
    nome_pessoa_acompanhou: z.string().optional(),
    cpf_pessoa_acompanhou: z.string().optional(),
    // VAPT
    nome_local_trabalho: z.string().optional(),
    principais_riscos_identificados: z.string().optional(),
    recomendacoes_orientacoes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.resultado === "notificado_com_prazo") {
      if (data.prazo_adequacao_dias <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["prazo_adequacao_dias"],
          message: "Para notificações com prazo, informe o período de adequação em dias (ex: 15 ou 30).",
        });
      }
      if (!data.exigencias_notificadas || data.exigencias_notificadas.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["exigencias_notificadas"],
          message: "Descreva expressamente as exigências e medidas corretivas notificadas.",
        });
      }
    }
  });

type LaudoFormData = z.infer<typeof laudoSchema>;

export const LaudoInspecaoFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: inspecao, isLoading, isError } = useInspecaoDetalhe(id);
  const { data: estabelecimento } = useEstabelecimentoDetalhe(
    inspecao?.estabelecimento_id
  );
  const concluirMutation = useConcluirInspecaoMutation(id || "");

  // Estados locais para estruturas JSONB
  const [checklistRespostas, setChecklistRespostas] = useState<ChecklistRespostas>({});
  const [fotosEvidencias, setFotosEvidencias] = useState<FotoEvidencia[]>([]);
  const [sucessoMensagem, setSucessoMensagem] = useState(false);

  const hoje = new Date().toISOString().split("T")[0];

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LaudoFormData>({
    resolver: zodResolver(laudoSchema),
    defaultValues: {
      resultado: "aprovado",
      data_fim: hoje,
      relato_vistoria: "",
      irregularidades_constatadas: "",
      exigencias_notificadas: "",
      prazo_adequacao_dias: 0,
      data_limite_adequacao: "",
      nome_pessoa_acompanhou: "",
      cpf_pessoa_acompanhou: "",
      nome_local_trabalho: "",
      principais_riscos_identificados: "",
      recomendacoes_orientacoes: "",
    },
  });

  const resultadoSelecionado = watch("resultado");
  const prazoDias = watch("prazo_adequacao_dias");

  // Preenche dados existentes quando carregar a inspeção
  useEffect(() => {
    if (inspecao) {
      reset({
        resultado: inspecao.resultado || "aprovado",
        data_fim: inspecao.data_fim || hoje,
        relato_vistoria: inspecao.relato_vistoria || "",
        irregularidades_constatadas: inspecao.irregularidades_constatadas || "",
        exigencias_notificadas: inspecao.exigencias_notificadas || "",
        prazo_adequacao_dias: inspecao.prazo_adequacao_dias || 0,
        data_limite_adequacao: inspecao.data_limite_adequacao || "",
        nome_pessoa_acompanhou: inspecao.nome_pessoa_acompanhou || "",
        cpf_pessoa_acompanhou: inspecao.cpf_pessoa_acompanhou || "",
        nome_local_trabalho: inspecao.nome_local_trabalho || "",
        principais_riscos_identificados:
          inspecao.principais_riscos_identificados || "",
        recomendacoes_orientacoes: inspecao.recomendacoes_orientacoes || "",
      });

      if (inspecao.checklist_respostas) {
        setChecklistRespostas(inspecao.checklist_respostas);
      }
      if (inspecao.relatorio_fotografico) {
        setFotosEvidencias(inspecao.relatorio_fotografico);
      }
    }
  }, [inspecao, reset, hoje]);

  // Atualiza data limite automaticamente caso prazo em dias seja digitado
  useEffect(() => {
    if (resultadoSelecionado === "notificado_com_prazo" && prazoDias > 0) {
      const dataCalculada = new Date();
      dataCalculada.setDate(dataCalculada.getDate() + Number(prazoDias));
      setValue("data_limite_adequacao", dataCalculada.toISOString().split("T")[0]);
    }
  }, [prazoDias, resultadoSelecionado, setValue]);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Carregando dados da inspeção sanitária...</span>
      </div>
    );
  }

  if (isError || !inspecao) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Inspeção não encontrada ou indisponível
        </h2>
        <p className="text-xs text-slate-500">
          Não foi possível localizar os registros deste termo fiscal.
        </p>
        <Link
          to={ROUTES.INSPECOES.LIST}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 rounded-xl border border-teal-200 hover:bg-teal-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Inspeções</span>
        </Link>
      </div>
    );
  }

  const isConcluida = inspecao.status === "concluida";
  const isVapt = inspecao.motivo === "vapt_trabalhador";

  const onSubmit = async (data: LaudoFormData) => {
    try {
      const payload: LaudoConclusaoFormValues = {
        ...data,
        prazo_adequacao_dias: Number(data.prazo_adequacao_dias || 0),
        checklist_respostas: checklistRespostas,
        relatorio_fotografico: fotosEvidencias,
      };

      await concluirMutation.mutateAsync(payload);
      setSucessoMensagem(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err: any) {
      // Erro exibido na tela
    }
  };

  const handleImprimirTermo = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between">
        <Link
          to={ROUTES.INSPECOES.LIST}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Vistorias</span>
        </Link>

        <div className="flex items-center gap-2">
          {isConcluida && (
            <button
              type="button"
              onClick={handleImprimirTermo}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Imprimir Termo Oficial</span>
            </button>
          )}

          <StatusInspecaoBadge status={inspecao.status} />
        </div>
      </div>

      {/* Banner de Sucesso */}
      {sucessoMensagem && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Laudo Concluído com Sucesso!</strong> O termo sanitário foi emitido e registrado no prontuário do estabelecimento.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSucessoMensagem(false)}
            className="text-emerald-600 hover:text-emerald-800 font-bold ml-4"
          >
            Fechar
          </button>
        </div>
      )}

      {/* Banner de Erro */}
      {concluirMutation.isError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            {concluirMutation.error instanceof Error
              ? concluirMutation.error.message
              : "Erro ao concluir a inspeção sanitária."}
          </span>
        </div>
      )}

      {/* Cabeçalho Institucional do Laudo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <span>{APP_CONFIG.municipio}</span>
              <span>•</span>
              <span>{APP_CONFIG.orgao}</span>
            </div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              <span>Termo Fiscal de Inspeção Sanitária</span>
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                Termo / Registro
              </span>
              <span className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                {inspecao.numero_termo}
              </span>
            </div>
            {inspecao.resultado && (
              <ResultadoInspecaoBadge resultado={inspecao.resultado} />
            )}
          </div>
        </div>

        {/* Grade de Metadados da Fiscalização */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Motivo da Ação
            </span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
              {inspecao.motivo.replace(/_/g, " ")}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Data de Início
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {new Date(inspecao.data_inicio).toLocaleDateString("pt-BR")}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Fiscal Responsável
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              Servidor Autoridade Sanitária
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Equipe / Acompanhantes
            </span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {inspecao.fiscais_acompanhantes || "Vistoria Individual"}
            </span>
          </div>
        </div>
      </div>

      {/* Cartão de Identificação do Estabelecimento */}
      {estabelecimento && (
        <div className="bg-slate-50/70 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Estabelecimento Vistoriado
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <RiscoBadge risco={estabelecimento.nivel_risco} />
              <Link
                to={ROUTES.ESTABELECIMENTOS.DETALHE(estabelecimento.id)}
                target="_blank"
                className="text-[11px] font-semibold text-teal-600 dark:text-teal-400 hover:underline"
              >
                Abrir Prontuário
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Razão Social</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {estabelecimento.razao_social}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Nome Fantasia</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {estabelecimento.nome_fantasia || "Não informado"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">CNPJ / CPF</span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
                {estabelecimento.cnpj_cpf}
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 pt-1 border-t border-slate-200/60 dark:border-slate-800">
            <strong>Endereço:</strong> {estabelecimento.logradouro}, {estabelecimento.numero}{" "}
            {estabelecimento.complemento && `(${estabelecimento.complemento})`} -{" "}
            {estabelecimento.bairro}, {estabelecimento.municipio}/{estabelecimento.uf} - CEP:{" "}
            {estabelecimento.cep}
          </div>
        </div>
      )}

      {/* BLOCO VAPT - SAÚDE DO TRABALHADOR (INDICADOR 11) */}
      {isVapt && (
        <div className="bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/80 rounded-2xl p-5 shadow-2xs space-y-3">
          <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
            <HardHat className="w-5 h-5 text-teal-600 dark:text-teal-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Vigilância em Ambientes e Processos de Trabalho (VAPT - Indicador 11)
            </h3>
          </div>
          <p className="text-[11px] text-teal-700/80 dark:text-teal-400">
            Ação fiscalizadora de verificação e controle dos fatores de risco à saúde e segurança do trabalhador.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
            <div className="p-3 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Setor / Posto de Trabalho Inspecionado
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {inspecao.nome_local_trabalho || "Ambiente geral da empresa"}
              </span>
            </div>

            <div className="p-3 bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800/60 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                Riscos Ocupacionais Identificados
              </span>
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {inspecao.principais_riscos_identificados || "Riscos ergonômicos e físicos avaliados"}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Formulário Principal */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bloco 1: Checklist Sanitário Dinâmico */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              1. Avaliação Sanitária de Conformidades (Checklist)
            </h2>
          </div>

          <ChecklistDinamico
            value={checklistRespostas}
            onChange={setChecklistRespostas}
            readOnly={isConcluida}
          />
        </div>

        {/* Bloco 2: Relatório Fotográfico de Evidências */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              2. Evidências Fotográficas da Inspeção
            </h2>
          </div>

          <UploadEvidencias
            value={fotosEvidencias}
            onChange={setFotosEvidencias}
            readOnly={isConcluida}
          />
        </div>

        {/* Bloco 3: Relato e Parecer Técnico */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileCheck2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              3. Parecer Conclusivo & Deliberação Fiscal
            </h2>
          </div>

          {/* Relato Minucioso da Vistoria */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Relato Minucioso da Vistoria Sanitária <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              disabled={isConcluida}
              {...register("relato_vistoria")}
              placeholder="Descreva as condições gerais do estabelecimento, procedimentos inspecionados, conduta dos funcionários e constatações fiscais..."
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
            />
            {errors.relato_vistoria && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.relato_vistoria.message}
              </p>
            )}
          </div>

          {/* Irregularidades Constatadas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Irregularidades Sanitárias Constatadas (se houver)
            </label>
            <textarea
              rows={3}
              disabled={isConcluida}
              {...register("irregularidades_constatadas")}
              placeholder="Aponte infrações à legislação sanitária federal, estadual ou código municipal de posturas..."
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
            />
          </div>

          {/* Resultado / Deliberação */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Parecer / Resultado da Vistoria <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={isConcluida}
                {...register("resultado")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
              >
                <option value="aprovado">Aprovado (Sem Exigências)</option>
                <option value="aprovado_com_exigencias">Aprovado com Exigências Menores</option>
                <option value="notificado_com_prazo">Notificado com Prazo de Adequação</option>
                <option value="auto_infracao">Lavrado Auto de Infração Sanitária</option>
                <option value="interditado_parcialmente">Interdição Cautelar Parcial</option>
                <option value="interditado_totalmente">Interdição Cautelar Total</option>
                <option value="indeferido">Indeferido (Licenciamento Recusado)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Data de Conclusão / Encerramento <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                disabled={isConcluida}
                {...register("data_fim")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
              />
            </div>
          </div>

          {/* Bloco Condicional de Notificação com Prazo */}
          {resultadoSelecionado === "notificado_com_prazo" && (
            <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                <Clock className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider">
                  Controle de Prazo para Adequação Sanitária
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Prazo Concedido (em dias corridos) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={isConcluida}
                    {...register("prazo_adequacao_dias", { valueAsNumber: true })}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  {errors.prazo_adequacao_dias && (
                    <p className="text-[11px] text-rose-600 mt-1">
                      {errors.prazo_adequacao_dias.message}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Data Limite para Cumprimento
                  </label>
                  <input
                    type="date"
                    disabled={isConcluida}
                    {...register("data_limite_adequacao")}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Exigências Expressamente Notificadas <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  disabled={isConcluida}
                  {...register("exigencias_notificadas")}
                  placeholder="Enumere as obrigações a serem sanadas pelo responsável legal antes da reinspeção..."
                  className="w-full p-2.5 text-xs bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                {errors.exigencias_notificadas && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.exigencias_notificadas.message}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Dados do Acompanhante no Local */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
              Representante / Acompanhante no Ato da Vistoria
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo da Pessoa que Acompanhou
                </label>
                <input
                  type="text"
                  disabled={isConcluida}
                  {...register("nome_pessoa_acompanhou")}
                  placeholder="Ex: Carlos Eduardo de Oliveira (Gerente de Loja)"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  CPF do Acompanhante
                </label>
                <input
                  type="text"
                  disabled={isConcluida}
                  {...register("cpf_pessoa_acompanhou")}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-80"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Barra de Ações Inferior */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <Link
            to={ROUTES.INSPECOES.LIST}
            className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Voltar para Listagem
          </Link>

          {!isConcluida && (
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>
                {isSubmitting ? "Emitindo Laudo..." : "Salvar & Concluir Laudo Sanitário"}
              </span>
            </button>
          )}

          {isConcluida && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-4 h-4" />
              <span>Laudo Sanitário Emitido e Concluído</span>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default LaudoInspecaoFormPage;
