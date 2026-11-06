/**
 * Formulário Administrativo Interno de Registro de Denúncia Sanitária
 * Rota: /ouvidoria/nova
 * Usado por servidores municipais para registrar manifestações recebidas
 * por telefone, atendimento presencial de balcão ou ofícios de órgãos de controle.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Lock,
  Plus,
  Save,
  Search,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import { useRegistrarDenunciaMutation } from "../../hooks/useOuvidoria";
import { useEstabelecimentosList } from "../../hooks/useEstabelecimentos";
import { CanalDenuncia, GravidadeDenuncia, RegistrarDenunciaDTO } from "../../types/ouvidoria";

const registrarDenunciaSchema = z
  .object({
    local_denunciado_identificacao: z
      .string()
      .min(3, "Identificação do local denunciado é obrigatória (mínimo 3 caracteres)"),
    relato_denuncia: z
      .string()
      .min(10, "Relato minucioso deve conter no mínimo 10 caracteres"),
    origem: z.enum([
      "formulario_web",
      "presencial",
      "telefone",
      "ouvidoria_geral",
      "oficio_ministerio",
    ]),
    gravidade: z.enum(["baixa", "media", "alta", "urgente"]),
    estabelecimento_id: z.string().optional(),

    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().optional(),
    ponto_referencia: z.string().optional(),

    denunciante_anonimo: z.boolean(),
    denunciante_nome: z.string().optional(),
    denunciante_telefone: z.string().optional(),
    denunciante_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.denunciante_anonimo) {
      if (!data.denunciante_nome || data.denunciante_nome.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["denunciante_nome"],
          message: "Informe o nome do denunciante quando a manifestação não for anônima.",
        });
      }
    }
  });

type RegistrarFormData = z.infer<typeof registrarDenunciaSchema>;

export const RegistrarDenunciaInternaPage: React.FC = () => {
  const navigate = useNavigate();
  const registrarMutation = useRegistrarDenunciaMutation();
  const [buscaEstabelecimento, setBuscaEstabelecimento] = useState("");

  const { data: estabelecimentosData } = useEstabelecimentosList({
    busca: buscaEstabelecimento || undefined,
    limit: 20,
    situacao: "Ativo",
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistrarFormData>({
    resolver: zodResolver(registrarDenunciaSchema),
    defaultValues: {
      origem: "presencial",
      gravidade: "media",
      local_denunciado_identificacao: "",
      relato_denuncia: "",
      denunciante_anonimo: true,
      denunciante_nome: "",
      denunciante_telefone: "",
      denunciante_email: "",
      logradouro: "",
      numero: "",
      bairro: "",
      ponto_referencia: "",
    },
  });

  const denuncianteAnonimo = watch("denunciante_anonimo");

  const onSubmit = async (data: RegistrarFormData) => {
    try {
      const payload: RegistrarDenunciaDTO = {
        local_denunciado_identificacao: data.local_denunciado_identificacao.trim(),
        relato_denuncia: data.relato_denuncia.trim(),
        origem: data.origem as CanalDenuncia,
        gravidade: data.gravidade as GravidadeDenuncia,
        estabelecimento_id: data.estabelecimento_id || null,
        logradouro: data.logradouro?.trim() || null,
        numero: data.numero?.trim() || null,
        bairro: data.bairro?.trim() || null,
        ponto_referencia: data.ponto_referencia?.trim() || null,
        denunciante_anonimo: data.denunciante_anonimo,
        denunciante_nome: data.denunciante_anonimo ? null : data.denunciante_nome?.trim() || null,
        denunciante_telefone: data.denunciante_anonimo ? null : data.denunciante_telefone?.trim() || null,
        denunciante_email: data.denunciante_anonimo ? null : data.denunciante_email?.trim() || null,
      };

      const criada = await registrarMutation.mutateAsync(payload);
      navigate(`/ouvidoria/${criada.id}`);
    } catch {
      // Erro é tratado pelo react-query
    }
  };

  const handleSelecionarEstabelecimento = (estId: string) => {
    setValue("estabelecimento_id", estId);
    const est = estabelecimentosData?.itens.find((e) => e.id === estId);
    if (est) {
      setValue("local_denunciado_identificacao", est.razao_social);
      setValue("logradouro", est.logradouro);
      setValue("numero", est.numero);
      setValue("bairro", est.bairro);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Topo */}
      <div className="flex items-center justify-between">
        <Link
          to="/ouvidoria"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Lista de Denúncias</span>
        </Link>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-2">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-teal-600" />
          <span>Registro Interno de Manifestação / Denúncia</span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Cadastro oficial de queixas recebidas pelo balcão da vigilância sanitária, linhas telefônicas ou ofícios de controle externo.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {registrarMutation.isError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              {registrarMutation.error instanceof Error
                ? registrarMutation.error.message
                : "Erro ao protocolar a denúncia."}
            </span>
          </div>
        )}

        {/* Bloco 1: Parâmetros da Manifestação */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            1. Dados de Entrada & Classificação de Risco
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Canal de Recebimento <span className="text-rose-500">*</span>
              </label>
              <select
                {...register("origem")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="presencial">Atendimento Presencial (Balcão VISA)</option>
                <option value="telefone">Atendimento Telefônico / Linha Direta</option>
                <option value="oficio_ministerio">Ofício (Ministério Público / Órgãos)</option>
                <option value="ouvidoria_geral">Ouvidoria Geral do Município</option>
                <option value="formulario_web">Formulário Eletrônico Web</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Gravidade / Prioridade Preliminar <span className="text-rose-500">*</span>
              </label>
              <select
                {...register("gravidade")}
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 font-bold"
              >
                <option value="baixa">Baixa (Rotina secundária)</option>
                <option value="media">Média (Padrão de triagem)</option>
                <option value="alta">Alta (Risco sanitário significativo)</option>
                <option value="urgente">Urgente (Risco iminente à saúde pública)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bloco 2: Local e Fatos Denunciados */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-2">
            2. Local & Narrativa dos Fatos
          </h2>

          {/* Vínculo Opcional com Estabelecimento do Catálogo */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Vincular a Estabelecimento Cadastrado (Opcional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Pesquisar estabelecimento por Razão Social ou CNPJ..."
                  value={buscaEstabelecimento}
                  onChange={(e) => setBuscaEstabelecimento(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {estabelecimentosData && estabelecimentosData.itens.length > 0 && buscaEstabelecimento && (
              <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 text-xs bg-white dark:bg-slate-900">
                {estabelecimentosData.itens.map((est) => (
                  <button
                    key={est.id}
                    type="button"
                    onClick={() => handleSelecionarEstabelecimento(est.id)}
                    className="w-full text-left p-2.5 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <p className="font-bold text-slate-900 dark:text-white">{est.razao_social}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        CNPJ/CPF: {est.cnpj_cpf} • {est.bairro}
                      </p>
                    </div>
                    <span className="text-[10px] text-teal-600 font-semibold">Selecionar</span>
                  </button>
                ))}
              </div>
            )}
            <input type="hidden" {...register("estabelecimento_id")} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Identificação do Local Denunciado (Nome da Empresa ou Descrição) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              {...register("local_denunciado_identificacao")}
              placeholder="Ex: Padaria Estrela da Manhã, Feira Livre Municipal, Residência com criação irregular..."
              className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.local_denunciado_identificacao && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.local_denunciado_identificacao.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Logradouro (Rua / Av.)
              </label>
              <input
                type="text"
                {...register("logradouro")}
                placeholder="Rua..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Número
              </label>
              <input
                type="text"
                {...register("numero")}
                placeholder="Nº ou S/N"
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Bairro
              </label>
              <input
                type="text"
                {...register("bairro")}
                placeholder="Bairro..."
                className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Relato Minucioso dos Fatos Denunciados <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              {...register("relato_denuncia")}
              placeholder="Descreva minuciosamente a irregularidade sanitária constatada, datas, condições dos produtos e riscos observados..."
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {errors.relato_denuncia && (
              <p className="text-[11px] text-rose-600 mt-1">
                {errors.relato_denuncia.message}
              </p>
            )}
          </div>
        </div>

        {/* Bloco 3: Autoria & Sigilo Legal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              3. Dados do Denunciante & Sigilo Legal
            </h2>
            <div className="flex items-center gap-2">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  {...register("denunciante_anonimo")}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-teal-600" />
                <span className="ml-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Denúncia Anônima
                </span>
              </label>
            </div>
          </div>

          {denuncianteAnonimo ? (
            <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs text-slate-600 dark:text-slate-400 flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <span>
                A identidade do manifestante está protegida por sigilo legal. Nenhum dado pessoal será exigido ou registrado.
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-in fade-in duration-150">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nome Completo do Cidadão <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  {...register("denunciante_nome")}
                  placeholder="Nome do denunciante..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                {errors.denunciante_nome && (
                  <p className="text-[11px] text-rose-600 mt-1">
                    {errors.denunciante_nome.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Telefone de Contato
                </label>
                <input
                  type="text"
                  {...register("denunciante_telefone")}
                  placeholder="(33) 99999-9999"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Cidadão
                </label>
                <input
                  type="email"
                  {...register("denunciante_email")}
                  placeholder="cidadao@exemplo.com"
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botão de Envio */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            to="/ouvidoria"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
          >
            Cancelar
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            <span>{isSubmitting ? "Registrando..." : "Protocolar Denúncia Oficial"}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default RegistrarDenunciaInternaPage;
