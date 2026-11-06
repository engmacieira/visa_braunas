/**
 * Ficha de Detalhamento da Denúncia Sanitária e Gestão de Despacho
 * Rota: /ouvidoria/:id
 * Apresenta narrativa dos fatos, proteção de sigilo, evidências e ações fiscais.
 */

import React, { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  ExternalLink,
  Eye,
  FileSearch,
  FileText,
  Image as ImageIcon,
  MapPin,
  Send,
  Shield,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { useDenunciaDetalhe } from "../../hooks/useOuvidoria";
import { GravidadeBadge } from "../../components/ouvidoria/GravidadeBadge";
import { StatusDenunciaBadge } from "../../components/ouvidoria/StatusDenunciaBadge";
import { DenuncianteCard } from "../../components/ouvidoria/DenuncianteCard";
import { ModalDespachoFiscal } from "../../components/ouvidoria/ModalDespachoFiscal";
import { ModalArquivamento } from "../../components/ouvidoria/ModalArquivamento";

export const DenunciaDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: denuncia, isLoading, isError, refetch } = useDenunciaDetalhe(id);

  const [modalDespachoAberta, setModalDespachoAberta] = useState(false);
  const [modalArquivamentoAberta, setModalArquivamentoAberta] = useState(false);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Carregando processo de denúncia sanitária...</span>
      </div>
    );
  }

  if (isError || !denuncia) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 max-w-xl mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Denúncia não encontrada ou indisponível
        </h2>
        <p className="text-xs text-slate-500">
          Não foi possível localizar o registro desta denúncia sanitária.
        </p>
        <Link
          to={ROUTES.OUVIDORIA.LIST}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 rounded-xl border border-teal-200 hover:bg-teal-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para a Fila</span>
        </Link>
      </div>
    );
  }

  const estab = denuncia.estabelecimento;
  const isConcluida =
    denuncia.status === "arquivada" ||
    denuncia.status === "procedente" ||
    denuncia.status === "improcedente" ||
    denuncia.status === "concluida";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Barra de Navegação Superior */}
      <div className="flex items-center justify-between">
        <Link
          to={ROUTES.OUVIDORIA.LIST}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para Gestão de Denúncias</span>
        </Link>

        <div className="flex items-center gap-2">
          <GravidadeBadge gravidade={denuncia.gravidade} />
          <StatusDenunciaBadge status={denuncia.status} />
        </div>
      </div>

      {/* Cabeçalho do Processo de Ouvidoria */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">
              <span>Ouvidoria Sanitária</span>
              <span>•</span>
              <span className="capitalize">
                Canal: {denuncia.origem.replace(/_/g, " ")}
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              Protocolo: {denuncia.numero_protocolo}
            </h1>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Data de Recebimento
            </span>
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              {new Date(denuncia.data_recebimento).toLocaleString("pt-BR")}
            </span>
          </div>
        </div>

        {/* Despacho Atual da Coordenação (se houver) */}
        {denuncia.despacho_coordenacao && (
          <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-indigo-900 dark:text-indigo-300 block flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5" />
              Despacho & Encaminhamento da Coordenação:
            </span>
            <p className="text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
              {denuncia.despacho_coordenacao}
            </p>
          </div>
        )}

        {/* Conclusão da Apuração (se encerrada) */}
        {denuncia.conclusao_apuracao && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
            <span className="text-[10px] uppercase font-bold text-slate-700 dark:text-slate-300 block flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              Conclusão da Apuração:
            </span>
            <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
              {denuncia.conclusao_apuracao}
            </p>
            {denuncia.resposta_ao_denunciante && (
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Resposta Disponibilizada ao Cidadão:
                </span>
                <p className="text-slate-600 dark:text-slate-400 italic text-[11px] mt-0.5">
                  "{denuncia.resposta_ao_denunciante}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* Barra de Ações Rápidas */}
        {!isConcluida && (
          <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalDespachoAberta(true)}
              className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs inline-flex items-center gap-1.5 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Despachar para Fiscalização</span>
            </button>

            <button
              type="button"
              onClick={() => setModalArquivamentoAberta(true)}
              className="px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors inline-flex items-center gap-1.5"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Concluir / Arquivar</span>
            </button>
          </div>
        )}
      </div>

      {/* Relato Minucioso dos Fatos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <FileText className="w-4 h-4 text-teal-600" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
            Relato Minucioso dos Fatos Denunciados
          </h2>
        </div>

        <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
          {denuncia.relato_denuncia || "Nenhum texto de relato detalhado informado."}
        </p>
      </div>

      {/* Local / Estabelecimento Denunciado */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Local ou Estabelecimento Alvo da Denúncia
            </h2>
          </div>
          {estab && (
            <Link
              to={ROUTES.ESTABELECIMENTOS.DETALHE(estab.id)}
              target="_blank"
              className="text-xs font-semibold text-teal-600 dark:text-teal-400 hover:underline flex items-center gap-1"
            >
              <span>Ver Prontuário do Estabelecimento</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">
              Identificação Declarada pelo Denunciante
            </span>
            <p className="font-bold text-slate-900 dark:text-white text-sm">
              {denuncia.local_denunciado_identificacao}
            </p>
          </div>

          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold block">
              Bairro / Região
            </span>
            <p className="font-medium text-slate-800 dark:text-slate-200">
              {denuncia.bairro || "Não informado"}
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-600 dark:text-slate-300 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-start gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Endereço Indicado:</strong> {denuncia.logradouro || "Logradouro não informado"}
            {denuncia.numero ? `, Nº ${denuncia.numero}` : ""}{" "}
            {denuncia.ponto_referencia && `(Ref: ${denuncia.ponto_referencia})`}
          </span>
        </div>
      </div>

      {/* Autoria e Proteção de Sigilo */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block px-1">
          Identificação & Regras de Sigilo Legal
        </span>
        <DenuncianteCard
          denuncianteAnonimo={denuncia.denunciante_anonimo}
          nome={denuncia.denunciante_nome}
          telefone={denuncia.denunciante_telefone}
          email={denuncia.denunciante_email}
        />
      </div>

      {/* Evidências Fotográficas e Anexos */}
      {denuncia.url_anexos_evidencias && denuncia.url_anexos_evidencias.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
            <ImageIcon className="w-4 h-4 text-teal-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Anexos & Evidências Submetidas
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {denuncia.url_anexos_evidencias.map((anexo, idx) => (
              <a
                key={idx}
                href={anexo.url}
                target="_blank"
                rel="noreferrer"
                className="p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-between text-xs hover:border-teal-500 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                    {anexo.nome || `Evidência ${idx + 1}`}
                  </span>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Modais de Ação */}
      <ModalDespachoFiscal
        isOpen={modalDespachoAberta}
        onClose={() => setModalDespachoAberta(false)}
        denunciaId={denuncia.id}
        protocolo={denuncia.numero_protocolo}
        gravidadeAtual={denuncia.gravidade}
        onSucesso={() => refetch()}
      />

      <ModalArquivamento
        isOpen={modalArquivamentoAberta}
        onClose={() => setModalArquivamentoAberta(false)}
        denunciaId={denuncia.id}
        protocolo={denuncia.numero_protocolo}
        onSucesso={() => refetch()}
      />
    </div>
  );
};

export default DenunciaDetailPage;
