/**
 * Fila de Licenciamento Sanitário e Requerimentos de Alvará
 * Rota: /licenciamento ou /licenciamento/requerimentos
 * Apresenta a fila de trabalho de processos de licenciamento, triagem e decisões fiscais.
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck,
  FileSearch,
  Filter,
  Hourglass,
  Plus,
  RefreshCw,
  Search,
  Shield,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { useAlvarasList, useRequerimentosList } from "../../hooks/useLicenciamento";
import { StatusRequerimento, TipoSolicitacaoAlvara } from "../../types/licenciamento";
import { StatusRequerimentoBadge } from "../../components/licenciamento/StatusRequerimentoBadge";

type TabFila =
  | "fila_trabalho"
  | "todos"
  | "pendentes"
  | "em_analise"
  | "aguardando_inspecao"
  | "deferidos"
  | "indeferidos";

export const RequerimentosListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabAtiva, setTabAtiva] = useState<TabFila>("fila_trabalho");
  const [busca, setBusca] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<TipoSolicitacaoAlvara | "">("");

  // Consulta da lista com filtros do TanStack Query v5
  const statusParam: StatusRequerimento | "" =
    tabAtiva === "pendentes"
      ? "pendente"
      : tabAtiva === "em_analise"
      ? "em_analise"
      : tabAtiva === "aguardando_inspecao"
      ? "aguardando_inspecao"
      : tabAtiva === "deferidos"
      ? "deferido"
      : tabAtiva === "indeferidos"
      ? "indeferido"
      : "";

  const {
    data: requerimentosData,
    isLoading,
    isRefetching,
    refetch,
  } = useRequerimentosList({
    apenas_fila: tabAtiva === "fila_trabalho" ? true : undefined,
    status: statusParam || undefined,
    limit: 100,
  });

  const { data: alvarasData } = useAlvarasList({ limit: 1 });

  const requerimentos =
    requerimentosData?.items ||
    (requerimentosData as { itens?: typeof requerimentosData extends { items: infer T } ? T : never } | undefined)?.itens ||
    [];

  // Filtragem local complementar por texto (protocolo, razão social declarada ou CNPJ)
  const requerimentosFiltrados = useMemo(() => {
    return requerimentos.filter((item) => {
      if (tipoFiltro && item.tipo_solicitacao !== tipoFiltro) {
        return false;
      }

      if (!busca.trim()) return true;

      const termo = busca.toLowerCase();
      const matchProtocolo = item.numero_protocolo.toLowerCase().includes(termo);
      const matchRazao = item.dados_declarados?.razao_social
        ?.toLowerCase()
        .includes(termo);
      const matchCnpj = item.dados_declarados?.cpf_cnpj
        ?.toLowerCase()
        .includes(termo);

      return matchProtocolo || matchRazao || matchCnpj;
    });
  }, [requerimentos, busca, tipoFiltro]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
              Certificação & Alvarás Sanitários
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Licenciamento Sanitário Municipal
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Fila de análise técnica de petições, conferência de vistorias e homologação para expedição oficial de Alvarás Sanitários.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl transition-colors shadow-2xs"
            title="Atualizar lista"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefetching ? "animate-spin text-teal-600" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total na Fila Ativa */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Fila de Trabalho Ativa
            </span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {requerimentosData?.total ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">processos</span>
          </div>
        </div>

        {/* Em Análise */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Análise Documental
            </span>
            <FileSearch className="w-4 h-4 text-sky-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-600 dark:text-sky-400">
              {requerimentos.filter((r) => r.status === "em_analise").length}
            </span>
            <span className="text-[11px] text-slate-400">em instrução</span>
          </div>
        </div>

        {/* Aguardando Vistoria */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Aguardando Vistoria
            </span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {requerimentos.filter((r) => r.status === "aguardando_inspecao").length}
            </span>
            <span className="text-[11px] text-slate-400">de campo</span>
          </div>
        </div>

        {/* Alvarás Emitidos */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Alvarás Emitidos
            </span>
            <Award className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {alvarasData?.total ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">expedidos</span>
          </div>
        </div>
      </div>

      {/* Caixa com Abas e Lista de Requerimentos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Abas */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 pt-3 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setTabAtiva("fila_trabalho")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tabAtiva === "fila_trabalho"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Hourglass className="w-3.5 h-3.5" />
              <span>Fila de Trabalho (Pendentes)</span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("todos")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "todos"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Todos os Processos
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("em_analise")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "em_analise"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Em Análise Documental
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("aguardando_inspecao")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "aguardando_inspecao"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Aguardando Vistoria
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("deferidos")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "deferidos"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Deferidos / Emitidos
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("indeferidos")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "indeferidos"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Indeferidos
            </button>
          </div>
        </div>

        {/* Barra de Filtros */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por protocolo (ex: REQ-2026), empresa ou CNPJ..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={tipoFiltro}
              onChange={(e) => setTipoFiltro(e.target.value as any)}
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos os Tipos</option>
              <option value="concessao_inicial">Concessão Inicial</option>
              <option value="renovacao">Renovação</option>
            </select>
          </div>
        </div>

        {/* Tabela de Requerimentos */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Consultando processos de licenciamento...</span>
          </div>
        ) : requerimentosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <FileCheck className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhum processo de requerimento encontrado para os critérios selecionados.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Novas petições submetidas via formulário eletrônico ou balcão de atendimento constarão nesta fila de trabalho.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Protocolo</th>
                  <th className="py-3.5 px-4">Tipo</th>
                  <th className="py-3.5 px-4">Estabelecimento / Requerente</th>
                  <th className="py-3.5 px-4">Data Submissão</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requerimentosFiltrados.map((item) => {
                  const razaoSocial =
                    item.dados_declarados?.razao_social || "Razão Social Declarada";
                  const cnpjCpf = item.dados_declarados?.cpf_cnpj || "---";

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Protocolo */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-mono font-bold text-slate-900 dark:text-white">
                            {item.numero_protocolo}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Origem: {item.origem_solicitacao}
                          </span>
                        </div>
                      </td>

                      {/* Tipo */}
                      <td className="py-3.5 px-4">
                        <span className="capitalize font-medium text-slate-700 dark:text-slate-300">
                          {item.tipo_solicitacao === "concessao_inicial"
                            ? "Concessão Inicial"
                            : "Renovação Anual"}
                        </span>
                      </td>

                      {/* Estabelecimento */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-slate-800 dark:text-slate-200">
                            {razaoSocial}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {cnpjCpf}
                          </span>
                        </div>
                      </td>

                      {/* Data */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(item.data_submissao).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusRequerimentoBadge status={item.status} />
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={ROUTES.LICENCIAMENTO.DETALHE(item.id)}
                          className="px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100/60 shadow-2xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <FileSearch className="w-3.5 h-3.5" />
                          <span>Analisar Processo</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RequerimentosListPage;
