/**
 * Canal Cidadão: Ouvidoria e Registro Público de Denúncias Sanitárias
 * Rota: /denuncia-cidada
 * Acesso livre para munícipes registrarem queixas (anônimas ou identificadas)
 * e consultarem o andamento por número de protocolo oficial.
 */

import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileCheck2,
  Lock,
  MapPin,
  Search,
  Send,
  Shield,
  ShieldAlert,
  ShieldCheck,
  User,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import {
  useConsultarProtocoloPublico,
  useRegistrarDenunciaMutation,
} from "../../hooks/useOuvidoria";
import { CanalDenuncia, GravidadeDenuncia, RegistrarDenunciaDTO } from "../../types/ouvidoria";
import { StatusDenunciaBadge } from "../../components/ouvidoria/StatusDenunciaBadge";

const denunciaCidadaSchema = z
  .object({
    local_denunciado_identificacao: z
      .string()
      .min(3, "Informe o nome do estabelecimento ou descrição do local"),
    logradouro: z.string().optional(),
    numero: z.string().optional(),
    bairro: z.string().min(2, "Informe o bairro ou comunidade rural"),
    ponto_referencia: z.string().optional(),
    relato_denuncia: z
      .string()
      .min(15, "Por favor, relate o fato ocorrido com no mínimo 15 caracteres"),

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
          message: "Informe seu nome completo para registro identificado.",
        });
      }
    }
  });

type DenunciaCidadaFormData = z.infer<typeof denunciaCidadaSchema>;

export const DenunciaPublicaPage: React.FC = () => {
  const [modoAba, setModoAba] = useState<"registrar" | "consultar">("registrar");
  const [protocoloGerado, setProtocoloGerado] = useState<string | null>(null);
  const [protocoloBusca, setProtocoloBusca] = useState("");
  const [protocoloAtivoConsulta, setProtocoloAtivoConsulta] = useState("");

  const registrarMutation = useRegistrarDenunciaMutation();
  const {
    data: consultaData,
    isLoading: isConsultando,
    isError: isErroConsulta,
  } = useConsultarProtocoloPublico(protocoloAtivoConsulta);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DenunciaCidadaFormData>({
    resolver: zodResolver(denunciaCidadaSchema),
    defaultValues: {
      local_denunciado_identificacao: "",
      logradouro: "",
      numero: "",
      bairro: "",
      ponto_referencia: "",
      relato_denuncia: "",
      denunciante_anonimo: true,
      denunciante_nome: "",
      denunciante_telefone: "",
      denunciante_email: "",
    },
  });

  const denuncianteAnonimo = watch("denunciante_anonimo");

  const onSubmit = async (data: DenunciaCidadaFormData) => {
    try {
      const payload: RegistrarDenunciaDTO = {
        local_denunciado_identificacao: data.local_denunciado_identificacao.trim(),
        relato_denuncia: data.relato_denuncia.trim(),
        origem: "formulario_web",
        gravidade: "media",
        logradouro: data.logradouro?.trim() || null,
        numero: data.numero?.trim() || null,
        bairro: data.bairro.trim(),
        ponto_referencia: data.ponto_referencia?.trim() || null,
        denunciante_anonimo: data.denunciante_anonimo,
        denunciante_nome: data.denunciante_anonimo ? null : data.denunciante_nome?.trim() || null,
        denunciante_telefone: data.denunciante_anonimo ? null : data.denunciante_telefone?.trim() || null,
        denunciante_email: data.denunciante_anonimo ? null : data.denunciante_email?.trim() || null,
      };

      const resultado = await registrarMutation.mutateAsync(payload);
      setProtocoloGerado(resultado.numero_protocolo);
      reset();
    } catch {
      // Erro exibido na tela
    }
  };

  const handleConsultar = (e: React.FormEvent) => {
    e.preventDefault();
    if (protocoloBusca.trim()) {
      setProtocoloAtivoConsulta(protocoloBusca.trim().toUpperCase());
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between antialiased selection:bg-teal-500 selection:text-white">
      {/* Topo Institucional */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-4xl mx-auto px-4 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Canal Oficial de Ouvidoria Sanitária
              </span>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                {APP_CONFIG.prefeitura} / {APP_CONFIG.uf}
              </h1>
            </div>
          </div>

          {/* Abas Superiores */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setModoAba("registrar");
                setProtocoloGerado(null);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                modoAba === "registrar"
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Registrar Denúncia
            </button>
            <button
              type="button"
              onClick={() => setModoAba("consultar")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                modoAba === "consultar"
                  ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-2xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Consultar Protocolo
            </button>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {modoAba === "registrar" ? (
          <>
            {protocoloGerado ? (
              /* Tela de Sucesso ao Registrar */
              <div className="bg-white dark:bg-slate-900 border-2 border-emerald-300 dark:border-emerald-800 rounded-3xl p-6 sm:p-8 text-center space-y-6 shadow-sm animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div className="space-y-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Manifestação Registrada com Sucesso
                  </span>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    Protocolo Sanitário Emitido
                  </h2>
                  <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    Sua manifestação foi encaminhada para a equipe de triagem da Vigilância Sanitária de {APP_CONFIG.municipio}/MG.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 max-w-sm mx-auto space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Número Oficial de Protocolo
                  </span>
                  <p className="text-xl font-mono font-black text-teal-700 dark:text-teal-400">
                    {protocoloGerado}
                  </p>
                </div>

                <div className="p-4 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/80 rounded-2xl text-left text-xs text-teal-900 dark:text-teal-200 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-teal-600" />
                    Guarde o seu número de protocolo:
                  </p>
                  <p className="text-[11px] leading-relaxed text-teal-800 dark:text-teal-300">
                    Com este código você poderá acompanhar o andamento da fiscalização e ler a resposta oficial da autoridade de saúde a qualquer momento.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProtocoloGerado(null);
                    reset();
                  }}
                  className="px-5 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200"
                >
                  Registrar Outra Denúncia
                </button>
              </div>
            ) : (
              /* Formulário de Registro de Denúncia */
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-teal-600" />
                    <span>Relatar Irregularidade Sanitária</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Ajude a proteger a saúde pública de {APP_CONFIG.municipio}. Denúncias de alimentos impróprios, falta de higiene, comércio clandestino ou vetores.
                  </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {registrarMutation.isError && (
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Não foi possível enviar a denúncia. Verifique os campos e tente novamente.
                      </span>
                    </div>
                  )}

                  {/* Opção de Anonimato */}
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300">
                        <Lock className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          Denúncia Anônima (Sigilo Garantido)
                        </span>
                        <p className="text-[11px] text-slate-500">
                          Sua identidade não será solicitada nem compartilhada.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        {...register("denunciante_anonimo")}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600" />
                    </label>
                  </div>

                  {/* Se NÃO for anônimo, exibe campos de contato */}
                  {!denuncianteAnonimo && (
                    <div className="p-4 bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-800/60 rounded-2xl space-y-3 animate-in fade-in duration-150">
                      <span className="text-xs font-bold text-teal-900 dark:text-teal-200 block">
                        Seus Dados de Contato (Confidenciais)
                      </span>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Seu Nome Completo <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register("denunciante_nome")}
                          placeholder="Digite seu nome..."
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        {errors.denunciante_nome && (
                          <p className="text-[11px] text-rose-600 mt-1">
                            {errors.denunciante_nome.message}
                          </p>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            Telefone / WhatsApp (Opcional)
                          </label>
                          <input
                            type="text"
                            {...register("denunciante_telefone")}
                            placeholder="(33) 99999-9999"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                            E-mail para Notificações (Opcional)
                          </label>
                          <input
                            type="email"
                            {...register("denunciante_email")}
                            placeholder="seuemail@exemplo.com"
                            className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Local Denunciado */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Qual é o Estabelecimento ou Local Denunciado? <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        {...register("local_denunciado_identificacao")}
                        placeholder="Ex: Mercado Central, Lanchonete do Bairro, Terreno baldio com acúmulo de lixo..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      {errors.local_denunciado_identificacao && (
                        <p className="text-[11px] text-rose-600 mt-1">
                          {errors.local_denunciado_identificacao.message}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Bairro / Comunidade <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          {...register("bairro")}
                          placeholder="Ex: Centro, Bela Vista, Zona Rural..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        {errors.bairro && (
                          <p className="text-[11px] text-rose-600 mt-1">
                            {errors.bairro.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                          Ponto de Referência
                        </label>
                        <input
                          type="text"
                          {...register("ponto_referencia")}
                          placeholder="Ex: Próximo à praça da igreja, ao lado do posto de saúde..."
                          className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                        Endereço Completo (Rua e Número, se souber)
                      </label>
                      <input
                        type="text"
                        {...register("logradouro")}
                        placeholder="Rua / Avenida..."
                        className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Relato dos Fatos */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Descreva o Fato Ocorrido com o Máximo de Detalhes <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      rows={4}
                      {...register("relato_denuncia")}
                      placeholder="Descreva o problema observado: alimentos vencidos, falta de higiene, insetos, odores fortes, medicamentos sem procedência, horário em que ocorreu..."
                      className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    {errors.relato_denuncia && (
                      <p className="text-[11px] text-rose-600 mt-1">
                        {errors.relato_denuncia.message}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    <Send className="w-4 h-4" />
                    <span>{isSubmitting ? "Enviando Denúncia..." : "Enviar Denúncia Sanitária"}</span>
                  </button>
                </form>
              </div>
            )}
          </>
        ) : (
          /* Consulta Pública por Protocolo */
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Search className="w-5 h-5 text-teal-600" />
                <span>Consultar Andamento da Denúncia</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Digite o número de protocolo recebido ao registrar a manifestação para verificar a resposta oficial.
              </p>
            </div>

            <form onSubmit={handleConsultar} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: DEN-2026-0001"
                value={protocoloBusca}
                onChange={(e) => setProtocoloBusca(e.target.value.toUpperCase())}
                className="flex-1 px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-teal-500 uppercase"
              />
              <button
                type="submit"
                className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors"
              >
                Buscar
              </button>
            </form>

            {isConsultando && (
              <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
                <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
                <span>Consultando protocolo nos registros oficiais...</span>
              </div>
            )}

            {!isConsultando && isErroConsulta && protocoloAtivoConsulta && (
              <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-800 dark:text-rose-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Protocolo <strong>{protocoloAtivoConsulta}</strong> não localizado. Verifique se o código foi digitado corretamente.
                </span>
              </div>
            )}

            {!isConsultando && consultaData && (
              <div className="p-5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">
                      Protocolo Oficial
                    </span>
                    <span className="text-base font-mono font-bold text-teal-700 dark:text-teal-400">
                      {consultaData.numero_protocolo}
                    </span>
                  </div>

                  <StatusDenunciaBadge status={consultaData.status} />
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Local Apurado
                  </span>
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    {consultaData.local_denunciado_identificacao}
                  </p>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Data de Recebimento
                  </span>
                  <p className="text-slate-700 dark:text-slate-300">
                    {new Date(consultaData.data_recebimento).toLocaleDateString("pt-BR")}
                  </p>
                </div>

                {/* Resposta Oficial ao Denunciante */}
                <div className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-1 text-xs">
                  <span className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-bold block flex items-center gap-1.5">
                    <FileCheck2 className="w-3.5 h-3.5" />
                    Resposta da Autoridade Sanitária Municipal:
                  </span>
                  <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                    {consultaData.resposta_ao_denunciante ||
                      "A denúncia está em processo de apuração pela equipe fiscal de campo. Assim que concluída, a deliberação será disponibilizada neste espaço."}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Rodapé Institucional */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-2xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {APP_CONFIG.prefeitura} • {APP_CONFIG.secretaria}
          </p>
          <p className="text-[11px] text-slate-400">
            {APP_CONFIG.orgao} • Canal de Atendimento ao Cidadão
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DenunciaPublicaPage;
