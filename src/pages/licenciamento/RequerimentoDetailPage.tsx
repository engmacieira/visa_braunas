/**
 * Detalhamento e Análise Técnica de Requerimento de Licenciamento
 * Rota: /licenciamento/requerimentos/:id
 * Permite avaliação documental, verificação de dados declarados e expedição do alvará.
 */

import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Droplets,
  ExternalLink,
  FileCheck2,
  FileSearch,
  FileText,
  Mail,
  MapPin,
  Phone,
  Send,
  Shield,
  User,
  UserCheck,
  X,
  XCircle,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import {
  useAnalisarRequerimentoMutation,
  useRequerimentoDetalhe,
} from "../../hooks/useLicenciamento";
import { StatusRequerimentoBadge } from "../../components/licenciamento/StatusRequerimentoBadge";
import { ModalEmitirAlvara } from "../../components/licenciamento/ModalEmitirAlvara";
import { RiscoBadge } from "../../components/estabelecimentos/RiscoBadge";

export const RequerimentoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: req, isLoading, isError, refetch } = useRequerimentoDetalhe(id);
  const analisarMutation = useAnalisarRequerimentoMutation(id || "");

  // Estados locais para modais de ação
  const [modalEmitirAberta, setModalEmitirAberta] = useState(false);
  const [modalIndeferirAberta, setModalIndeferirAberta] = useState(false);
  const [modalAdequacaoAberta, setModalAdequacaoAberta] = useState(false);
  const [parecerTexto, setParecerTexto] = useState("");

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Carregando processo de licenciamento sanitário...</span>
      </div>
    );
  }

  if (isError || !req) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Requerimento não encontrado ou indisponível
        </h2>
        <p className="text-xs text-slate-500">
          Não foi possível localizar os registros deste processo de licenciamento.
        </p>
        <Link
          to={ROUTES.LICENCIAMENTO.LIST}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 rounded-xl border border-teal-200 hover:bg-teal-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para a Fila</span>
        </Link>
      </div>
    );
  }

  const dados = req.dados_declarados;
  const estab = req.estabelecimento;

  const handleTramitar = async (acao: any, motivo?: string) => {
    try {
      await analisarMutation.mutateAsync({
        acao,
        parecer_ou_motivo: motivo || parecerTexto || undefined,
      });
      setParecerTexto("");
      setModalIndeferirAberta(false);
      setModalAdequacaoAberta(false);
      refetch();
    } catch {
      // Erro é tratado pelo React Query
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between">
        <Link
          to={ROUTES.LICENCIAMENTO.LIST}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Fila de Licenciamento</span>
        </Link>

        <StatusRequerimentoBadge status={req.status} />
      </div>

      {/* Banner de Feedback de Erro */}
      {analisarMutation.isError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-2 text-xs text-rose-800 dark:text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>
            {analisarMutation.error instanceof Error
              ? analisarMutation.error.message
              : "Erro ao tramitar o requerimento sanitário."}
          </span>
        </div>
      )}

      {/* Cabeçalho do Processo */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              <span>Processo de Licenciamento Sanitário</span>
              <span>•</span>
              <span className="capitalize">
                {req.tipo_solicitacao === "concessao_inicial"
                  ? "Concessão Inicial"
                  : "Renovação Anual"}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Protocolo: {req.numero_protocolo}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Data de Submissão
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {new Date(req.data_submissao).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Parecer Fiscal Atual / Motivo */}
        {req.parecer_fiscal && (
          <div className="p-3.5 bg-sky-50/70 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-sky-800 dark:text-sky-300 block">
              Parecer Técnico do Fiscal:
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
              {req.parecer_fiscal}
            </p>
          </div>
        )}

        {req.motivo_indeferimento && (
          <div className="p-3.5 bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-rose-800 dark:text-rose-300 block">
              Motivo do Indeferimento:
            </span>
            <p className="text-rose-900 dark:text-rose-200 leading-relaxed">
              {req.motivo_indeferimento}
            </p>
          </div>
        )}

        {/* Barra de Ações Rápidas de Tramitação */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {req.status === "pendente" && (
            <button
              type="button"
              disabled={analisarMutation.isPending}
              onClick={() => handleTramitar("iniciar_analise", "Iniciada conferência documental formal.")}
              className="px-3.5 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg hover:bg-sky-100/60 shadow-2xs inline-flex items-center gap-1.5"
            >
              <FileSearch className="w-3.5 h-3.5" />
              <span>Iniciar Análise Documental</span>
            </button>
          )}

          {(req.status === "pendente" || req.status === "em_analise") && (
            <button
              type="button"
              disabled={analisarMutation.isPending}
              onClick={() => handleTramitar("encaminhar_inspecao", "Documentação preliminar aprovada. Encaminhado para vistoria de campo.")}
              className="px-3.5 py-1.5 text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100/60 shadow-2xs inline-flex items-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Encaminhar para Vistoria</span>
            </button>
          )}

          {req.status !== "deferido" && req.status !== "cancelado" && (
            <>
              <button
                type="button"
                onClick={() => setModalAdequacaoAberta(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-100/60 shadow-2xs inline-flex items-center gap-1.5"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Solicitar Adequações</span>
              </button>

              <button
                type="button"
                onClick={() => setModalEmitirAberta(true)}
                className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Deferir & Emitir Alvará</span>
              </button>

              <button
                type="button"
                onClick={() => setModalIndeferirAberta(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100/60 shadow-2xs inline-flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Indeferir Pedido</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Identificação do Estabelecimento Vinculado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Estabelecimento Requerente
            </h2>
          </div>
          {estab && (
            <div className="flex items-center gap-2">
              <RiscoBadge risco={estab.nivel_risco} />
              <Link
                to={ROUTES.ESTABELECIMENTOS.DETALHE(estab.id)}
                target="_blank"
                className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Prontuário</span>
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Razão Social</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {dados?.razao_social || estab?.razao_social || "Não informada"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">Nome Fantasia</span>
            <span className="font-medium text-slate-800 dark:text-slate-200">
              {dados?.nome_fantasia || estab?.nome_fantasia || "Não informado"}
            </span>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">CNPJ / CPF</span>
            <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
              {dados?.cpf_cnpj || estab?.cnpj_cpf || "---"}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800">
          <strong>Endereço Declarado:</strong> {dados?.logradouro || estab?.logradouro || "Logradouro"},{" "}
          {dados?.numero || estab?.numero || "S/N"}{" "}
          {dados?.complemento && `(${dados.complemento})`} -{" "}
          {dados?.bairro || estab?.bairro || "Bairro"} • CEP: {dados?.cep || estab?.cep || "---"}
        </div>
      </div>

      {/* Dados Declarados na Petição Eletrônica */}
      {dados && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <FileText className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Informações Sanitárias Declaradas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                Atividade Principal (CNAE)
              </span>
              <p className="font-bold text-slate-900 dark:text-white">
                {dados.cnae_principal_selecionado || dados.cnae_principal_codigo_manual || "Não especificado"}
              </p>
              {dados.cnae_principal_descricao && (
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  {dados.cnae_principal_descricao}
                </p>
              )}
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                Abastecimento de Água
              </span>
              <p className="font-medium text-slate-800 dark:text-slate-200">
                {dados.fonte_abastecimento_agua || "Rede Pública / Concessionária"}
              </p>
              <p className="text-[11px] text-slate-500">
                Reservatório: {dados.possui_caixa_agua_propria === "sim" ? `Sim (${dados.capacidade_caixa_agua_litros || 0} L)` : "Não possui"}
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                Responsável Técnico Declarado
              </span>
              <p className="font-bold text-slate-800 dark:text-slate-200">
                {dados.rt_nome || "Não informado ou não exigido"}
              </p>
              {dados.rt_conselho_classe && (
                <p className="text-[11px] text-slate-500">
                  {dados.rt_conselho_classe}: {dados.rt_numero_conselho}/{dados.rt_conselho_uf}
                </p>
              )}
            </div>
          </div>

          {/* Documentos Anexos */}
          {dados.link_drive_documentos && (
            <div className="p-3.5 bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-xl flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-teal-900 dark:text-teal-200 block">
                  Pasta Digital de Documentos Comprobatórios
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-300">
                  Acesse os laudos, alvará do corpo de bombeiros e documentos anexados pelo solicitante.
                </span>
              </div>
              <a
                href={dados.link_drive_documentos}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg inline-flex items-center gap-1.5 shadow-2xs"
              >
                <span>Abrir Pasta de Documentos</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>
      )}

      {/* Modal para Solicitar Adequação */}
      {modalAdequacaoAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Solicitar Adequações / Notificar Exigências
            </h3>
            <p className="text-xs text-slate-500">
              Descreva as pendências documentais ou correções que o requerente deve sanar:
            </p>
            <textarea
              rows={4}
              value={parecerTexto}
              onChange={(e) => setParecerTexto(e.target.value)}
              placeholder="Ex: Anexar certificado atualizado de higienização do reservatório de água..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalAdequacaoAberta(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!parecerTexto.trim() || analisarMutation.isPending}
                onClick={() => handleTramitar("solicitar_adequacao")}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-60"
              >
                Confirmar Notificação
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para Indeferir Pedido */}
      {modalIndeferirAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
              Indeferir Requerimento de Licenciamento
            </h3>
            <p className="text-xs text-slate-500">
              Justifique formalmente o motivo técnico ou legal do indeferimento do alvará:
            </p>
            <textarea
              rows={4}
              value={parecerTexto}
              onChange={(e) => setParecerTexto(e.target.value)}
              placeholder="Ex: Incompatibilidade de atividade no endereço ou reprovação em vistoria fiscal sem adequação no prazo legal..."
              className="w-full p-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalIndeferirAberta(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!parecerTexto.trim() || analisarMutation.isPending}
                onClick={() => handleTramitar("indeferir")}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg disabled:opacity-60"
              >
                Confirmar Indeferimento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Emissão Oficial de Alvará */}
      {modalEmitirAberta && (
        <ModalEmitirAlvara
          isOpen={modalEmitirAberta}
          onClose={() => setModalEmitirAberta(false)}
          estabelecimentoId={req.estabelecimento_id}
          requerimentoId={req.id}
          razaoSocial={dados?.razao_social || estab?.razao_social}
          cnpjCpf={dados?.cpf_cnpj || estab?.cnpj_cpf}
          onSucesso={(alvara) => {
            navigate(ROUTES.LICENCIAMENTO.ALVARA_VIEW(alvara.id));
          }}
        />
      )}
    </div>
  );
};

export default RequerimentoDetailPage;
