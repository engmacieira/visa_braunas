/**
 * Painel e Tabela de Alertas Operacionais de Vencimento
 * Monitora notificações sanitárias com prazos de adequação expirados/expirando
 * e alvarás sanitários próximos da renovação (30/60 dias).
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  Clock,
  ExternalLink,
  FileCheck2,
  FileWarning,
  ShieldAlert,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { ROUTES } from "../../config/routes.config";
import { AlertasVencimentoResponse } from "../../types/indicadores";

interface TabelaAlertasOperacionaisProps {
  alertas?: AlertasVencimentoResponse;
  isLoading?: boolean;
}

export const TabelaAlertasOperacionais: React.FC<TabelaAlertasOperacionaisProps> = ({
  alertas,
  isLoading,
}) => {
  const [abaAtiva, setAbaAtiva] = useState<"notificacoes" | "documentos">("notificacoes");

  const notificacoes = alertas?.notificacoes || [];
  const documentos = alertas?.documentos || [];
  const totalNotificacoesCriticas = alertas?.total_notificacoes_criticas || notificacoes.length;
  const totalDocumentosVencendo = alertas?.total_documentos_vencendo || documentos.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs space-y-5">
      {/* Cabeçalho do Painel de Alertas */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
            Alertas Operacionais & Controle de Prazos Legais
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Monitoramento de termos de notificação de campo e vigência de alvarás de {APP_CONFIG.municipio}/{APP_CONFIG.uf}
          </p>
        </div>

        {/* Abas Alternáveis */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAbaAtiva("notificacoes")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              abaAtiva === "notificacoes"
                ? "bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileWarning className="w-3.5 h-3.5" />
            <span>Notificações / Prazos</span>
            {totalNotificacoesCriticas > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 font-bold">
                {totalNotificacoesCriticas}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAbaAtiva("documentos")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              abaAtiva === "documentos"
                ? "bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Alvarás a Vencer</span>
            {totalDocumentosVencendo > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 font-bold">
                {totalDocumentosVencendo}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Cards de Resumo Clicáveis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          to={ROUTES.INSPECOES.PRAZOS}
          className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
                Prazos Fiscais Críticos
              </div>
              <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 tabular-nums">
                {totalNotificacoesCriticas} pendentes
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                Notificações com prazo vencido ou a expirar em 7 dias
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-rose-500 group-hover:translate-x-1 transition-transform" />
        </Link>

        <Link
          to={ROUTES.LICENCIAMENTO.LIST}
          className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                Alvarás a Renovar
              </div>
              <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 tabular-nums">
                {totalDocumentosVencendo} nos próximos 30/60 dias
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">
                Licenças com término de vigência regulatória
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-500 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* Conteúdo da Tabela Selecionada */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-2" />
          Carregando alertas do sistema...
        </div>
      ) : abaAtiva === "notificacoes" ? (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Termo</th>
                <th className="py-2.5 px-3">Estabelecimento / CNPJ</th>
                <th className="py-2.5 px-3">Fiscal</th>
                <th className="py-2.5 px-3">Limite Legal</th>
                <th className="py-2.5 px-3 text-center">Status / Restante</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {notificacoes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhuma notificação fiscal com prazo crítico pendente.
                  </td>
                </tr>
              ) : (
                notificacoes.map((item) => {
                  const isVencido = item.dias_restantes < 0;
                  const isCritico = item.dias_restantes >= 0 && item.dias_restantes <= 7;

                  return (
                    <tr
                      key={item.inspecao_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 dark:text-white">
                        {item.numero_termo || "NOT-2026"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[220px]">
                          {item.razao_social}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {item.cnpj_cpf}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {item.fiscal_responsavel || "Fiscal VISA"}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300 font-mono">
                        {item.data_limite_cumprimento}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isVencido
                              ? "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300"
                              : isCritico
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300"
                              : "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 border border-blue-200"
                          }`}
                        >
                          {isVencido
                            ? `Vencido há ${Math.abs(item.dias_restantes)}d`
                            : `${item.dias_restantes} dias restantes`}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to={ROUTES.INSPECOES.LIST}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                        >
                          <span>Reinspecionar</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 uppercase font-semibold text-[11px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Documento</th>
                <th className="py-2.5 px-3">Estabelecimento</th>
                <th className="py-2.5 px-3">Categoria</th>
                <th className="py-2.5 px-3">Data Vencimento</th>
                <th className="py-2.5 px-3 text-center">Dias para Expirar</th>
                <th className="py-2.5 px-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {documentos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Nenhum alvará ou documento sanitário vencendo nos próximos 30 dias.
                  </td>
                </tr>
              ) : (
                documentos.map((item) => (
                  <tr
                    key={item.documento_id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                      {item.nome_documento}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300 truncate max-w-[220px]">
                      {item.razao_social}
                    </td>
                    <td className="py-2.5 px-3 text-slate-500 capitalize">
                      {item.categoria}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-700 dark:text-slate-300">
                      {item.data_vencimento}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 border border-amber-200">
                        {item.dias_para_vencimento} dias
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        to={ROUTES.LICENCIAMENTO.LIST}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-600 hover:text-teal-700 hover:underline"
                      >
                        <span>Abrir Renovação</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default TabelaAlertasOperacionais;
