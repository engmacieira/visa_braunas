/**
 * Painel Operacional de Prazos e Notificações Sanitárias Pendentes
 * Rota: /fiscalizacao/prazos
 * Monitora contagem regressiva de prazos legais concedidos a estabelecimentos,
 * com categorização por gravidade e atalho para abertura de Reinspeção Fiscal.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  RefreshCw,
  RotateCcw,
  Search,
  UserCheck,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { useNotificacoesPendentes } from "../../hooks/useFiscalizacao";
import { NotificacaoPrazoAlerta } from "../../types/fiscalizacao";
import { AgendarInspecaoModal } from "../../components/fiscalizacao/AgendarInspecaoModal";

type FiltroPrazo = "todos" | "vencidos" | "alerta_7_dias" | "regulares";

export const PainelPrazosPage: React.FC = () => {
  const [filtroPrazo, setFiltroPrazo] = useState<FiltroPrazo>("todos");
  const [busca, setBusca] = useState("");
  const [reinspecaoAlvo, setReinspecaoAlvo] = useState<{
    estabelecimentoId: string;
    termo: string;
  } | null>(null);

  const {
    data: notificacoes = [],
    isLoading,
    isRefetching,
    refetch,
  } = useNotificacoesPendentes(60);

  // Classificação por severidade
  const { vencidas, alertas7dias, regulares } = useMemo(() => {
    const v: NotificacaoPrazoAlerta[] = [];
    const a: NotificacaoPrazoAlerta[] = [];
    const r: NotificacaoPrazoAlerta[] = [];

    notificacoes.forEach((item) => {
      if (item.dias_restantes < 0) {
        v.push(item);
      } else if (item.dias_restantes <= 7) {
        a.push(item);
      } else {
        r.push(item);
      }
    });

    return { vencidas: v, alertas7dias: a, regulares: r };
  }, [notificacoes]);

  // Lista filtrada
  const notificacoesExibidas = useMemo(() => {
    let base = notificacoes;
    if (filtroPrazo === "vencidos") base = vencidas;
    else if (filtroPrazo === "alerta_7_dias") base = alertas7dias;
    else if (filtroPrazo === "regulares") base = regulares;

    if (!busca) return base;

    const termo = busca.toLowerCase();
    return base.filter(
      (n) =>
        n.numero_termo.toLowerCase().includes(termo) ||
        n.razao_social.toLowerCase().includes(termo) ||
        (n.nome_fantasia && n.nome_fantasia.toLowerCase().includes(termo)) ||
        n.fiscal_responsavel.toLowerCase().includes(termo)
    );
  }, [notificacoes, vencidas, alertas7dias, regulares, filtroPrazo, busca]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to={ROUTES.INSPECOES.LIST}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-teal-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Voltar para Inspeções</span>
            </Link>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span>Painel de Prazos & Notificações Sanitárias</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Monitoramento de contagem regressiva para regularização de estabelecimentos notificados em autos fiscais.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={isRefetching}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 shadow-2xs self-start sm:self-center"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isRefetching ? "animate-spin text-teal-600" : ""}`}
          />
          <span>Atualizar Prazos</span>
        </button>
      </div>

      {/* Cards de Métricas de Prazos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Todas */}
        <button
          type="button"
          onClick={() => setFiltroPrazo("todos")}
          className={`text-left p-4 rounded-xl border transition-all ${
            filtroPrazo === "todos"
              ? "bg-slate-900 text-white border-slate-900 shadow-xs dark:bg-slate-800"
              : "bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-slate-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold opacity-80">
              Total Notificadas
            </span>
            <FileText className="w-4 h-4 opacity-70" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold">{notificacoes.length}</span>
            <span className="text-[11px] opacity-70">processos</span>
          </div>
        </button>

        {/* Vencidas */}
        <button
          type="button"
          onClick={() => setFiltroPrazo("vencidos")}
          className={`text-left p-4 rounded-xl border transition-all ${
            filtroPrazo === "vencidos"
              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
              : "bg-rose-50/70 dark:bg-rose-950/20 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-900/40 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Prazos Vencidos</span>
            <AlertCircle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-700 dark:text-rose-400">
              {vencidas.length}
            </span>
            <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">
              urgente
            </span>
          </div>
        </button>

        {/* Alerta <= 7 dias */}
        <button
          type="button"
          onClick={() => setFiltroPrazo("alerta_7_dias")}
          className={`text-left p-4 rounded-xl border transition-all ${
            filtroPrazo === "alerta_7_dias"
              ? "bg-amber-600 text-white border-amber-600 shadow-xs"
              : "bg-amber-50/70 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-900/40 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Vencem em até 7 dias</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
              {alertas7dias.length}
            </span>
            <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              atenção
            </span>
          </div>
        </button>

        {/* Regulares > 7 dias */}
        <button
          type="button"
          onClick={() => setFiltroPrazo("regulares")}
          className={`text-left p-4 rounded-xl border transition-all ${
            filtroPrazo === "regulares"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
              : "bg-emerald-50/70 dark:bg-emerald-950/20 text-emerald-900 dark:text-emerald-200 border-emerald-200 dark:border-emerald-900/40 hover:border-emerald-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">No Prazo (&gt; 7 dias)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {regulares.length}
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
              acompanhando
            </span>
          </div>
        </button>
      </div>

      {/* Caixa de Busca e Tabela */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por termo fiscal, razão social ou fiscal..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="text-xs text-slate-500 font-medium">
            Exibindo <strong>{notificacoesExibidas.length}</strong> de{" "}
            {notificacoes.length} notificações
          </div>
        </div>

        {/* Tabela de Notificações */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Consultando prazos de notificações sanitárias...</span>
          </div>
        ) : notificacoesExibidas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Nenhuma notificação sanitária pendente para este filtro.
            </p>
            <p className="text-[11px] text-slate-400">
              Todos os prazos legais estão devidamente sanados ou sem pendências registradas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Contagem / Alerta</th>
                  <th className="py-3.5 px-4">Termo Fiscal</th>
                  <th className="py-3.5 px-4">Estabelecimento Notificado</th>
                  <th className="py-3.5 px-4">Data Limite</th>
                  <th className="py-3.5 px-4">Fiscal Responsável</th>
                  <th className="py-3.5 px-4 text-right">Ações Operacionais</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {notificacoesExibidas.map((item) => {
                  const isVencida = item.dias_restantes < 0;
                  const isAlerta = item.dias_restantes >= 0 && item.dias_restantes <= 7;

                  return (
                    <tr
                      key={item.inspecao_id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Contagem / Alerta */}
                      <td className="py-3.5 px-4">
                        {isVencida ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                            <span>
                              VENCIDO HÁ {Math.abs(item.dias_restantes)} DIA(S)
                            </span>
                          </div>
                        ) : isAlerta ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                            <span>
                              {item.dias_restantes === 0
                                ? "VENCE HOJE"
                                : `RESTA(M) ${item.dias_restantes} DIA(S)`}
                            </span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{item.dias_restantes} dias restantes</span>
                          </div>
                        )}
                      </td>

                      {/* Termo Fiscal */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        {item.numero_termo}
                      </td>

                      {/* Estabelecimento */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <Link
                            to={ROUTES.ESTABELECIMENTOS.DETALHE(item.estabelecimento_id)}
                            className="font-bold text-slate-800 dark:text-slate-200 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                          >
                            {item.razao_social}
                          </Link>
                          {item.nome_fantasia && (
                            <span className="text-[10px] text-slate-400">
                              {item.nome_fantasia}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data Limite */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(item.data_limite_adequacao).toLocaleDateString(
                              "pt-BR"
                            )}
                          </span>
                        </div>
                      </td>

                      {/* Fiscal */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                          <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                          <span>{item.fiscal_responsavel}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={ROUTES.INSPECOES.LAUDO(item.inspecao_id)}
                            className="p-1.5 text-slate-500 hover:text-teal-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Visualizar laudo e termo original"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            onClick={() =>
                              setReinspecaoAlvo({
                                estabelecimentoId: item.estabelecimento_id,
                                termo: item.numero_termo,
                              })
                            }
                            className="px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100/60 shadow-2xs transition-colors inline-flex items-center gap-1.5"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Agendar Reinspeção</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Abertura de Reinspeção */}
      {reinspecaoAlvo && (
        <AgendarInspecaoModal
          isOpen={Boolean(reinspecaoAlvo)}
          onClose={() => setReinspecaoAlvo(null)}
          estabelecimentoIdPreDefinido={reinspecaoAlvo.estabelecimentoId}
          motivoPreDefinido="reinspecao"
        />
      )}
    </div>
  );
};

export default PainelPrazosPage;
