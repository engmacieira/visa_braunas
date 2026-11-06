/**
 * Painel Operacional de Ouvidoria Sanitária e Fila de Triagem de Denúncias
 * Rota: /ouvidoria
 * Matriz visual de priorização por gravidade, busca textual e ações rápidas.
 */

import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  FileSearch,
  Filter,
  Flame,
  Hourglass,
  Inbox,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  User,
} from "lucide-react";
import { useDenunciasList, useFilaTrabalhoDenuncias } from "../../hooks/useOuvidoria";
import { GravidadeDenuncia, StatusDenuncia } from "../../types/ouvidoria";
import { GravidadeBadge } from "../../components/ouvidoria/GravidadeBadge";
import { StatusDenunciaBadge } from "../../components/ouvidoria/StatusDenunciaBadge";

type TabOuvidoria =
  | "triagem"
  | "todas"
  | "urgentes"
  | "apuracao"
  | "concluidas";

export const DenunciasListPage: React.FC = () => {
  const navigate = useNavigate();
  const [tabAtiva, setTabAtiva] = useState<TabOuvidoria>("triagem");
  const [busca, setBusca] = useState("");
  const [filtroGravidade, setFiltroGravidade] = useState<GravidadeDenuncia | "">("");

  // Consulta da lista com filtros do TanStack Query v5
  const statusParam: StatusDenuncia | "" =
    tabAtiva === "triagem"
      ? "recebida"
      : tabAtiva === "apuracao"
      ? "em_apuracao_fiscal"
      : "";

  const gravidadeParam: GravidadeDenuncia | "" =
    tabAtiva === "urgentes"
      ? "urgente"
      : filtroGravidade || "";

  const {
    data: denunciasData,
    isLoading,
    isRefetching,
    refetch,
  } = useDenunciasList({
    status: statusParam || undefined,
    gravidade: gravidadeParam || undefined,
    limit: 100,
  });

  const { data: filaTrabalho = [] } = useFilaTrabalhoDenuncias(0, 100);

  const denuncias = denunciasData?.items || [];

  // Contadores para métricas
  const totalUrgentes = useMemo(() => {
    return denuncias.filter((d) => d.gravidade === "urgente" && d.status !== "arquivada" && d.status !== "procedente").length;
  }, [denuncias]);

  const totalEmApuracao = useMemo(() => {
    return denuncias.filter((d) => d.status === "em_apuracao_fiscal").length;
  }, [denuncias]);

  // Filtragem local por texto
  const denunciasFiltradas = useMemo(() => {
    if (!busca.trim()) return denuncias;

    const termo = busca.toLowerCase();
    return denuncias.filter(
      (d) =>
        d.numero_protocolo.toLowerCase().includes(termo) ||
        d.local_denunciado_identificacao.toLowerCase().includes(termo) ||
        (d.bairro && d.bairro.toLowerCase().includes(termo)) ||
        (d.logradouro && d.logradouro.toLowerCase().includes(termo))
    );
  }, [denuncias, busca]);

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 mb-1">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded border border-teal-200 dark:border-teal-800">
              Ouvidoria & Vigilância Ativa
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            Gestão de Denúncias Sanitárias
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Triagem operacional, priorização por risco à saúde pública, apuração de campo e garantia de sigilo legal ao cidadão.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/denuncia-cidada"
            target="_blank"
            className="px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <span>Canal do Cidadão</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-60" />
          </Link>

          <Link
            to="/ouvidoria/nova"
            className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Denúncia Interna</span>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas Operacionais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Fila de Triagem */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Pendentes de Triagem
            </span>
            <Hourglass className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {filaTrabalho.length}
            </span>
            <span className="text-[11px] text-slate-400">em aberto</span>
          </div>
        </div>

        {/* Card 2: Urgentes (com pulso) */}
        <div className="bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping inline-block" />
              Gravidade Urgente
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">
              {totalUrgentes}
            </span>
            <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
              risco iminente
            </span>
          </div>
        </div>

        {/* Card 3: Em Apuração Fiscal */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Em Apuração Fiscal
            </span>
            <Clock className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              {totalEmApuracao}
            </span>
            <span className="text-[11px] text-slate-400">vistorias em curso</span>
          </div>
        </div>

        {/* Card 4: Concluídas */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Total Registradas
            </span>
            <CheckCircle2 className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {denunciasData?.total ?? 0}
            </span>
            <span className="text-[11px] text-slate-400">manifestações</span>
          </div>
        </div>
      </div>

      {/* Caixa com Abas e Lista */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        {/* Abas */}
        <div className="border-b border-slate-200 dark:border-slate-800 px-6 pt-3 flex items-center justify-between gap-4 overflow-x-auto">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => setTabAtiva("triagem")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tabAtiva === "triagem"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              <Inbox className="w-3.5 h-3.5" />
              <span>Fila de Triagem (Recebidas)</span>
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("urgentes")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                tabAtiva === "urgentes"
                  ? "border-rose-600 text-rose-600"
                  : "border-transparent text-slate-500 hover:text-rose-600"
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              <span>Urgentes</span>
              {totalUrgentes > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-600 text-white">
                  {totalUrgentes}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("apuracao")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "apuracao"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Em Apuração Fiscal
            </button>

            <button
              type="button"
              onClick={() => setTabAtiva("todas")}
              className={`pb-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                tabAtiva === "todas"
                  ? "border-teal-600 text-teal-600 dark:text-teal-400"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
              }`}
            >
              Todas as Denúncias
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
              placeholder="Buscar por protocolo (ex: DEN-2026), local ou bairro..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {tabAtiva !== "urgentes" && (
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filtroGravidade}
                onChange={(e) => setFiltroGravidade(e.target.value as any)}
                className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">Todas as Gravidades</option>
                <option value="urgente">Urgente (Risco Iminente)</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>
          )}
        </div>

        {/* Tabela de Denúncias */}
        {isLoading ? (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span>Consultando registros de denúncias...</span>
          </div>
        ) : denunciasFiltradas.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
            <Shield className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Nenhuma denúncia sanitária encontrada para os critérios selecionados.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Utilize o botão "Registrar Denúncia Interna" para cadastrar atendimentos presenciais ou por telefone.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Protocolo</th>
                  <th className="py-3.5 px-4">Gravidade</th>
                  <th className="py-3.5 px-4">Local / Estabelecimento Denunciado</th>
                  <th className="py-3.5 px-4">Bairro / Endereço</th>
                  <th className="py-3.5 px-4">Data Recebimento</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {denunciasFiltradas.map((item) => {
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
                          <span className="text-[10px] text-slate-400 capitalize">
                            Canal: {item.origem.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>

                      {/* Gravidade com destaque */}
                      <td className="py-3.5 px-4">
                        <GravidadeBadge gravidade={item.gravidade} />
                      </td>

                      {/* Local Denunciado */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col max-w-xs">
                          <span className="font-bold text-slate-800 dark:text-slate-200 truncate">
                            {item.local_denunciado_identificacao}
                          </span>
                          {item.denunciante_anonimo ? (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              <span>• Denúncia Anônima</span>
                            </span>
                          ) : (
                            <span className="text-[10px] text-teal-600 dark:text-teal-400 flex items-center gap-1 font-medium">
                              <span>• Cidadão Identificado</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Bairro / Endereço */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {item.bairro || item.logradouro || "Não especificado"}
                      </td>

                      {/* Data Recebimento */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {new Date(item.data_recebimento).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <StatusDenunciaBadge status={item.status} />
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          to={`/ouvidoria/${item.id}`}
                          className="px-3 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100/60 shadow-2xs transition-colors inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Triar / Detalhes</span>
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

export default DenunciasListPage;
