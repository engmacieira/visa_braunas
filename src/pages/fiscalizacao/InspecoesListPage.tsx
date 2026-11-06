/**
 * Página Principal do Módulo de Fiscalização & Inspeções Sanitárias
 * Listagem com filtros por abas, busca textual, métricas operacionais,
 * indicadores VAPT (Indicador 11) e acesso ao Painel de Prazos.
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  HardHat,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  useIndicador11Vapt,
  useInspecoesList,
  useNotificacoesPendentes,
} from "../../hooks/useFiscalizacao";
import {
  StatusInspecao,
  TipoMotivoInspecao,
} from "../../types/fiscalizacao";
import { StatusInspecaoBadge } from "../../components/fiscalizacao/StatusInspecaoBadge";
import { ResultadoInspecaoBadge } from "../../components/fiscalizacao/ResultadoInspecaoBadge";
import { AgendarInspecaoModal } from "../../components/fiscalizacao/AgendarInspecaoModal";

type TabFiltro = "todas" | "agendadas" | "em_andamento" | "concluidas" | "vapt";

export const InspecoesListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const estabelecimentoIdParam = searchParams.get("estabelecimento_id") || "";

  const [tabAtiva, setTabAtiva] = useState<TabFiltro>("todas");
  const [busca, setBusca] = useState("");
  const [motivoFiltro, setMotivoFiltro] = useState<TipoMotivoInspecao | "">("");
  const [modalNovaAberta, setModalNovaAberta] = useState(false);

  // Consultas via React Query v5
  const {
    data: inspecoes = [],
    isLoading,
    isRefetching,
    refetch,
  } = useInspecoesList({
    estabelecimento_id: estabelecimentoIdParam || undefined,
    motivo: tabAtiva === "vapt" ? "vapt_trabalhador" : motivoFiltro || undefined,
    status:
      tabAtiva === "agendadas"
        ? "agendada"
        : tabAtiva === "em_andamento"
        ? "em_andamento"
        : tabAtiva === "concluidas"
        ? "concluida"
        : undefined,
  });

  const { data: notificacoes = [] } = useNotificacoesPendentes(30);
  const { data: indicadorVapt = [] } = useIndicador11Vapt(new Date().getFullYear());

  // Métricas rápidas
  const totalNotificacoesVencidas = notificacoes.filter((n) => n.dias_restantes < 0).length;
  const totalAcoesVapt = indicadorVapt[0]?.total_acoes_vapt ?? 0;

  // Filtragem local complementar para busca rápida por texto (número do termo ou ID)
  const inspecoesFiltradas = useMemo(() => {
    return inspecoes.filter((item) => {
      const matchBusca =
        !busca ||
        item.numero_termo.toLowerCase().includes(busca.toLowerCase()) ||
        item.motivo.toLowerCase().includes(busca.toLowerCase()) ||
        (item.nome_local_trabalho &&
          item.nome_local_trabalho.toLowerCase().includes(busca.toLowerCase()));

      return matchBusca;
    });
  }, [inspecoes, busca]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
              Módulo de Campo & Fiscalização
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Inspeções Sanitárias & Vistorias Fiscais
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Gestão operacional de autos de inspeção, checklists de boas práticas, laudos periciais e monitoramento do Indicador 11 de Saúde do Trabalhador (VAPT).
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/fiscalizacao/prazos"
            className="px-3.5 py-2 text-xs font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl hover:bg-amber-100/60 shadow-2xs flex items-center gap-2 transition-colors"
          >
            <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>Painel de Prazos</span>
            {notificacoes.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-600 text-white">
                {notificacoes.length}
              </span>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setModalNovaAberta(true)}
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nova Inspeção</span>
          </button>
        </div>
      </div>

      {/* Cards de Resumo Operacional */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Ativas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Vistorias no Período
            </span>
            <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {inspecoes.length}
            </span>
            <span className="text-[11px] text-slate-400">registros</span>
          </div>
        </div>

        {/* Card 2: Prazos e Alertas */}
        <Link
          to="/fiscalizacao/prazos"
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs hover:border-amber-400 transition-colors block"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Notificações com Prazo
            </span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {notificacoes.length}
            </span>
            {totalNotificacoesVencidas > 0 && (
              <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                {totalNotificacoesVencidas} vencida(s)
              </span>
            )}
          </div>
        </Link>

        {/* Card 3: Indicador 11 VAPT */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Indicador 11 (VAPT)
            </span>
            <HardHat className="w-4 h-4 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">
              {totalAcoesVapt}
            </span>
            <span className="text-[11px] text-teal-600 dark:text-teal-400 font-medium">
              ações pactuadas
            </span>
          </div>
        </div>

        {/* Card 4: Concluídas com Sucesso */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Laudos Concluídos
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {inspecoes.filter((i) => i.status === "concluida").length}
            </span>
            <span className="text-[11px] text-slate-400">finalizadas</span>
          </div>
        </div>
      </div>

      {/* Abas e Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Abas de Navegação */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 pt-3 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setTabAtiva("todas")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "todas"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Todas as Inspeções
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("agendadas")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "agendadas"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Agendadas
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("em_andamento")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "em_andamento"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Em Andamento
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("concluidas")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "concluidas"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Concluídas
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("vapt")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tabAtiva === "vapt"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              <span>Ações VAPT (Ind. 11)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 mb-2 transition-colors"
            title="Atualizar lista"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefetching ? "animate-spin text-teal-600" : ""}`}
            />
          </button>
        </div>

        {/* Linha de Busca e Filtros */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por termo (ex: TERM-2026), local ou motivo..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {tabAtiva !== "vapt" && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={motivoFiltro}
                onChange={(e) => setMotivoFiltro(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Todos os Motivos</option>
                <option value="rotina_programada">Rotina Programada</option>
                <option value="requerimento_alvara">Requerimento de Alvará</option>
                <option value="denuncia">Atendimento a Denúncia</option>
                <option value="reinspecao">Reinspeção Fiscal</option>
                <option value="vapt_trabalhador">VAPT - Saúde do Trabalhador</option>
                <option value="investigacao_surto">Investigação de Surto</option>
              </select>
            </div>
          )}
        </div>

        {/* Tabela de Vistorias */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Consultando registros de fiscalização...</span>
          </div>
        ) : inspecoesFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <ShieldAlert className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma inspeção sanitária encontrada para os critérios selecionados.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Utilize o botão "Nova Inspeção" para abrir um novo termo oficial de fiscalização de campo.
            </p>
            <button
              type="button"
              onClick={() => setModalNovaAberta(true)}
              className="mt-2 px-4 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-xl hover:bg-teal-100/60 inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Abrir Novo Termo</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Termo / Protocolo</th>
                  <th className="py-3.5 px-4">Motivo / Tipo</th>
                  <th className="py-3.5 px-4">Data Vistoria</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Parecer / Resultado</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inspecoesFiltradas.map((item) => {
                  const isVapt = item.motivo === "vapt_trabalhador";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Termo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.numero_termo}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ID: {item.id.substring(0, 8)}...
                          </span>
                        </div>
                      </td>

                      {/* Motivo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            {isVapt && (
                              <HardHat className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                            )}
                            <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                              {item.motivo.replace(/_/g, " ")}
                            </span>
                          </div>
                          {isVapt && item.nome_local_trabalho && (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 px-1.5 py-0.5 rounded border border-teal-200 dark:border-teal-800 w-fit">
                              Local: {item.nome_local_trabalho}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col text-slate-600 dark:text-slate-300">
                          <span className="font-medium">
                            {new Date(item.data_inicio).toLocaleDateString("pt-BR")}
                          </span>
                          {item.hora_inspecao && (
                            <span className="text-[10px] text-slate-400">
                              Às {item.hora_inspecao}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusInspecaoBadge status={item.status} />
                      </td>

                      {/* Parecer / Resultado */}
                      <td className="py-3.5 px-4">
                        <ResultadoInspecaoBadge resultado={item.resultado} />
                        {item.resultado === "notificado_com_prazo" && item.data_limite_adequacao && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-600 font-medium">
                            <Clock className="w-3 h-3" />
                            <span>
                              Limite:{" "}
                              {new Date(item.data_limite_adequacao).toLocaleDateString(
                                "pt-BR"
                              )}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/inspecoes/${item.id}/laudo`}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                              item.status === "concluida"
                                ? "bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-100"
                                : "bg-teal-600 text-white border-teal-600 hover:bg-teal-700 shadow-2xs"
                            }`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>
                              {item.status === "concluida" ? "Ver Laudo" : "Lavrar Laudo"}
                            </span>
                          </Link>
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

      {/* Modal de Abertura / Agendamento */}
      <AgendarInspecaoModal
        isOpen={modalNovaAberta}
        onClose={() => setModalNovaAberta(false)}
        estabelecimentoIdPreDefinido={estabelecimentoIdParam || undefined}
        onSucesso={(inspecao) => {
          if (inspecao?.id) {
            navigate(`/inspecoes/${inspecao.id}/laudo`);
          }
        }}
      />
    </div>
  );
};

export default InspecoesListPage;
