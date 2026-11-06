/**
 * Formulário Multi-Seção de Cadastro e Edição de Estabelecimentos (EstabelecimentoFormPage)
 * Integração com React Hook Form + Zod, cálculo dinâmico de risco sanitário preponderante,
 * validações em tempo real e injeção do componente de busca assíncrona de CNAEs.
 */

import React, { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  Droplets,
  MapPin,
  Phone,
  Save,
  Shield,
  User,
} from "lucide-react";
import { z } from "zod";
import CnaeSelectAsync, {
  SelectedCNAE,
} from "../../components/estabelecimentos/CnaeSelectAsync";
import RiscoBadge from "../../components/estabelecimentos/RiscoBadge";
import {
  useEstabelecimentoDetalhe,
  useSalvarEstabelecimentoMutation,
} from "../../hooks/useEstabelecimentos";
import {
  CompetenciaFiscalizacao,
  EstabelecimentoFormValues,
  NivelRisco,
  TipoPessoa,
} from "../../types/estabelecimento";

// Esquema Zod espelhando estritamente as regras de negócio do Backend
const estabelecimentoSchema = z.object({
  tipo_cadastro: z.enum(["PF", "PJ"]),
  cnpj_cpf: z
    .string()
    .min(11, "O documento deve ter no mínimo 11 dígitos")
    .max(18, "O documento deve ter no máximo 18 caracteres"),
  razao_social: z
    .string()
    .min(2, "A Razão Social deve conter pelo menos 2 caracteres")
    .max(200, "Máximo de 200 caracteres"),
  nome_fantasia: z.string().max(200).optional(),
  inscricao_municipal: z.string().max(50).optional(),
  natureza_juridica: z.string().max(100).optional(),

  // Localização
  cep: z
    .string()
    .min(8, "CEP deve conter 8 dígitos")
    .max(10, "CEP inválido"),
  logradouro: z.string().min(2, "Logradouro é obrigatório"),
  numero: z.string().min(1, "Número é obrigatório"),
  complemento: z.string().max(100).optional(),
  bairro: z.string().min(2, "Bairro é obrigatório"),
  municipio: z.string().min(1, "Município é obrigatório"),
  uf: z.string().min(2, "UF é obrigatória"),
  ponto_referencia: z.string().optional(),
  acesso_compartilhado_residencia: z.boolean(),

  // Contatos
  telefone_fixo: z.string().max(20).optional(),
  telefone_celular: z.string().min(8, "Telefone celular é obrigatório"),
  email: z.string().email("E-mail com formato inválido"),

  // Parâmetros Sanitários
  competencia_fiscalizacao: z.enum(["Municipal", "Estadual", "Pactuado"]),
  horario_funcionamento: z.string().optional(),
  fonte_abastecimento_agua: z.string().optional(),
  possui_reservatorio_proprio: z.boolean(),
  capacidade_reservatorio_litros: z.number().min(0),

  // Representante Legal
  representante_legal: z.object({
    nome_completo: z
      .string()
      .min(3, "Nome do representante deve conter pelo menos 3 caracteres"),
    cpf: z
      .string()
      .min(11, "CPF deve conter pelo menos 11 dígitos"),
    rg_numero: z.string().optional(),
    rg_orgao_emissor: z.string().optional(),
    telefone: z.string().min(8, "Telefone do representante é obrigatório"),
    email: z.string().email("E-mail do representante inválido"),
    endereco_residencial: z
      .string()
      .min(5, "Endereço residencial do representante é obrigatório"),
  }),

  // CNAEs (Pelo menos um CNAE obrigatório com exatamente 1 principal)
  cnaes: z
    .array(
      z.object({
        cnae_codigo: z.string().min(1, "Código do CNAE é obrigatório"),
        descricao: z.string().optional(),
        grau_risco_padrao: z
          .enum(["Risco I", "Risco II", "Risco III", "Dispensado"])
          .optional(),
        exige_rt: z.boolean().optional(),
        eh_principal: z.boolean(),
        data_inicio_atividade: z.string().optional(),
      })
    )
    .min(1, "É obrigatório vincular pelo menos 1 atividade CNAE")
    .refine(
      (cnaes) => cnaes.filter((c) => c.eh_principal).length === 1,
      "Exatamente uma atividade CNAE deve ser marcada como principal"
    ),
});

export type EstabelecimentoFormSchema = z.infer<typeof estabelecimentoSchema>;

export const EstabelecimentoFormPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const [formError, setFormError] = useState<string | null>(null);

  const { data: estabExistente, isLoading: carregandoDados } =
    useEstabelecimentoDetalhe(id);

  const salvarMutation = useSalvarEstabelecimentoMutation(id);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EstabelecimentoFormSchema>({
    resolver: zodResolver(estabelecimentoSchema),
    defaultValues: {
      tipo_cadastro: "PJ",
      cnpj_cpf: "",
      razao_social: "",
      nome_fantasia: "",
      inscricao_municipal: "",
      natureza_juridica: "",
      cep: "35189000",
      logradouro: "",
      numero: "",
      complemento: "",
      bairro: "Centro",
      municipio: "Braúnas",
      uf: "MG",
      ponto_referencia: "",
      acesso_compartilhado_residencia: false,
      telefone_fixo: "",
      telefone_celular: "",
      email: "",
      competencia_fiscalizacao: "Municipal",
      horario_funcionamento: "Segunda a Sexta, 08:00 às 18:00",
      fonte_abastecimento_agua: "Rede Pública (COPASA)",
      possui_reservatorio_proprio: false,
      capacidade_reservatorio_litros: 0,
      representante_legal: {
        nome_completo: "",
        cpf: "",
        rg_numero: "",
        rg_orgao_emissor: "SSP/MG",
        telefone: "",
        email: "",
        endereco_residencial: "",
      },
      cnaes: [],
    },
  });

  // Preenche dados para edição
  useEffect(() => {
    if (estabExistente) {
      reset({
        tipo_cadastro: estabExistente.tipo_cadastro,
        cnpj_cpf: estabExistente.cnpj_cpf,
        razao_social: estabExistente.razao_social,
        nome_fantasia: estabExistente.nome_fantasia || "",
        inscricao_municipal: estabExistente.inscricao_municipal || "",
        natureza_juridica: estabExistente.natureza_juridica || "",
        cep: estabExistente.cep,
        logradouro: estabExistente.logradouro,
        numero: estabExistente.numero,
        complemento: estabExistente.complemento || "",
        bairro: estabExistente.bairro,
        municipio: estabExistente.municipio,
        uf: estabExistente.uf,
        ponto_referencia: estabExistente.ponto_referencia || "",
        acesso_compartilhado_residencia:
          estabExistente.acesso_compartilhado_residencia,
        telefone_fixo: estabExistente.telefone_fixo || "",
        telefone_celular: estabExistente.telefone_celular,
        email: estabExistente.email,
        competencia_fiscalizacao: estabExistente.competencia_fiscalizacao,
        horario_funcionamento: estabExistente.horario_funcionamento || "",
        fonte_abastecimento_agua:
          estabExistente.fonte_abastecimento_agua || "Rede Pública (COPASA)",
        possui_reservatorio_proprio:
          estabExistente.possui_reservatorio_proprio,
        capacidade_reservatorio_litros:
          estabExistente.capacidade_reservatorio_litros,
        representante_legal: estabExistente.representante_legal
          ? {
              nome_completo: estabExistente.representante_legal.nome_completo,
              cpf: estabExistente.representante_legal.cpf,
              rg_numero: estabExistente.representante_legal.rg_numero || "",
              rg_orgao_emissor:
                estabExistente.representante_legal.rg_orgao_emissor || "SSP/MG",
              telefone: estabExistente.representante_legal.telefone,
              email: estabExistente.representante_legal.email,
              endereco_residencial:
                estabExistente.representante_legal.endereco_residencial,
            }
          : {
              nome_completo: "",
              cpf: "",
              rg_numero: "",
              rg_orgao_emissor: "SSP/MG",
              telefone: "",
              email: "",
              endereco_residencial: "",
            },
        cnaes: estabExistente.cnaes.map((c) => ({
          cnae_codigo: c.cnae_codigo,
          descricao: c.cnae?.descricao,
          grau_risco_padrao: c.cnae?.grau_risco_padrao,
          exige_rt: c.cnae?.exige_rt,
          eh_principal: c.eh_principal,
          data_inicio_atividade: c.data_inicio_atividade || "",
        })),
      });
    }
  }, [estabExistente, reset]);

  const watchedCnaes = watch("cnaes") || [];

  // Cálculo reativo do risco sanitário preponderante no formulário
  const riscoPreponderante = useMemo<NivelRisco>(() => {
    if (watchedCnaes.length === 0) return "Dispensado";
    const riscos = watchedCnaes.map((c) => c.grau_risco_padrao);
    if (riscos.includes("Risco III")) return "Risco III";
    if (riscos.includes("Risco II")) return "Risco II";
    if (riscos.includes("Risco I")) return "Risco I";
    return "Dispensado";
  }, [watchedCnaes]);

  const onSubmit = async (values: EstabelecimentoFormSchema) => {
    setFormError(null);
    try {
      const salvo = await salvarMutation.mutateAsync(values as EstabelecimentoFormValues);
      navigate(`/estabelecimentos/${salvo.id}`);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "response" in err) {
        const ax = err as {
          response?: { data?: { detail?: string | Array<{ msg: string }> } };
        };
        const detail = ax.response?.data?.detail;
        if (typeof detail === "string") {
          setFormError(detail);
          return;
        }
        if (Array.isArray(detail)) {
          setFormError(detail.map((d) => d.msg).join(", "));
          return;
        }
      }
      setFormError("Erro ao salvar cadastro do estabelecimento.");
    }
  };

  if (isEditing && carregandoDados) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        Carregando dados do estabelecimento para edição...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Topo com Título e Risco Calculado */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/estabelecimentos")}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
            title="Voltar"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {isEditing ? "Editar Estabelecimento" : "Novo Estabelecimento Regulado"}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preencha os dados cadastrais, endereço em Braúnas/MG e atividades econômicas.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700">
          <span className="text-[11px] font-medium text-slate-500">
            Risco Estimado:
          </span>
          <RiscoBadge risco={riscoPreponderante} size="sm" />
        </div>
      </div>

      {formError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block">Erro na Validação:</span>
            <span>{formError}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Seção 1: Identificação Jurídica */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Building2 className="w-4 h-4 text-teal-600" />
            1. Identificação Jurídica
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Tipo de Cadastro *
              </label>
              <select
                {...register("tipo_cadastro")}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="PJ">Pessoa Jurídica (PJ)</option>
                <option value="PF">Pessoa Física (PF)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                CNPJ ou CPF (apenas números ou com máscara) *
              </label>
              <input
                type="text"
                {...register("cnpj_cpf")}
                placeholder="Ex: 18.303.187/0001-44 ou 111.222.333-44"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
              {errors.cnpj_cpf && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.cnpj_cpf.message}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Razão Social / Nome Civil *
              </label>
              <input
                type="text"
                {...register("razao_social")}
                placeholder="Nome empresarial registrado"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.razao_social && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.razao_social.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Nome Fantasia
              </label>
              <input
                type="text"
                {...register("nome_fantasia")}
                placeholder="Nome comercial divulgado"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Inscrição Municipal
              </label>
              <input
                type="text"
                {...register("inscricao_municipal")}
                placeholder="Ex: 102030"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Competência de Fiscalização
              </label>
              <select
                {...register("competencia_fiscalizacao")}
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              >
                <option value="Municipal">Municipal</option>
                <option value="Estadual">Estadual</option>
                <option value="Pactuado">Pactuado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Seção 2: Localização e Contato */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <MapPin className="w-4 h-4 text-teal-600" />
            2. Endereço e Contatos em Braúnas/MG
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                CEP *
              </label>
              <input
                type="text"
                {...register("cep")}
                placeholder="35189000 ou 35189-000"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
              {errors.cep && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.cep.message}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Logradouro (Rua, Avenida, Praça) *
              </label>
              <input
                type="text"
                {...register("logradouro")}
                placeholder="Ex: Avenida Juscelino Kubitschek"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.logradouro && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.logradouro.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Número *
              </label>
              <input
                type="text"
                {...register("numero")}
                placeholder="Ex: 100 ou S/N"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.numero && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.numero.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Complemento
              </label>
              <input
                type="text"
                {...register("complemento")}
                placeholder="Ex: Sala 2, Galpão A"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Bairro *
              </label>
              <input
                type="text"
                {...register("bairro")}
                placeholder="Centro, Novo Horizonte, etc."
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.bairro && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.bairro.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Município
              </label>
              <input
                type="text"
                {...register("municipio")}
                readOnly
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                UF
              </label>
              <input
                type="text"
                {...register("uf")}
                readOnly
                className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-500 cursor-not-allowed"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Telefone Celular / WhatsApp *
              </label>
              <input
                type="text"
                {...register("telefone_celular")}
                placeholder="(33) 98888-0000"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
              {errors.telefone_celular && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.telefone_celular.message}
                </span>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                E-mail Institucional *
              </label>
              <input
                type="email"
                {...register("email")}
                placeholder="contato@empresa.com.br"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.email && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.email.message}
                </span>
              )}
            </div>

            <div className="sm:col-span-4 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="acesso_compartilhado_check"
                {...register("acesso_compartilhado_residencia")}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <label
                htmlFor="acesso_compartilhado_check"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                O estabelecimento possui acesso compartilhado ou funciona em residência
              </label>
            </div>
          </div>
        </div>

        {/* Seção 3: Atividades Econômicas (CNAEs) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
          <Controller
            control={control}
            name="cnaes"
            render={({ field }) => (
              <CnaeSelectAsync
                selectedCnaes={field.value as SelectedCNAE[]}
                onChange={field.onChange}
                error={errors.cnaes?.message}
              />
            )}
          />
        </div>

        {/* Seção 4: Representante Legal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <User className="w-4 h-4 text-teal-600" />
            4. Representante Legal
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Nome Completo do Representante *
              </label>
              <input
                type="text"
                {...register("representante_legal.nome_completo")}
                placeholder="Ex: José Carlos Ferreira"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
              {errors.representante_legal?.nome_completo && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.representante_legal.nome_completo.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                CPF do Representante *
              </label>
              <input
                type="text"
                {...register("representante_legal.cpf")}
                placeholder="111.222.333-44"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
              {errors.representante_legal?.cpf && (
                <span className="text-[11px] text-rose-600 mt-1 block">
                  {errors.representante_legal.cpf.message}
                </span>
              )}
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Telefone do Representante *
              </label>
              <input
                type="text"
                {...register("representante_legal.telefone")}
                placeholder="(33) 98801-1122"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                E-mail do Representante *
              </label>
              <input
                type="email"
                {...register("representante_legal.email")}
                placeholder="representante@email.com"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Endereço Residencial do Representante *
              </label>
              <input
                type="text"
                {...register("representante_legal.endereco_residencial")}
                placeholder="Rua, Número, Bairro, Município/UF"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>
          </div>
        </div>

        {/* Seção 5: Saneamento e Infraestrutura */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <Droplets className="w-4 h-4 text-teal-600" />
            5. Saneamento e Abastecimento de Água
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Fonte de Abastecimento
              </label>
              <input
                type="text"
                {...register("fonte_abastecimento_agua")}
                placeholder="Rede Pública (COPASA)"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="reservatorio_proprio_check"
                {...register("possui_reservatorio_proprio")}
                className="rounded text-teal-600 focus:ring-teal-500 h-4 w-4"
              />
              <label
                htmlFor="reservatorio_proprio_check"
                className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer"
              >
                Possui reservatório próprio
              </label>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-slate-300 font-medium mb-1">
                Capacidade do Reservatório (Litros)
              </label>
              <input
                type="number"
                {...register("capacidade_reservatorio_litros")}
                placeholder="Ex: 5000"
                className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-mono"
              />
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Link
            to="/estabelecimentos"
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            Cancelar
          </Link>

          <button
            type="submit"
            disabled={isSubmitting || salvarMutation.isPending}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting || salvarMutation.isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Gravando no Banco...</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Estabelecimento</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EstabelecimentoFormPage;
