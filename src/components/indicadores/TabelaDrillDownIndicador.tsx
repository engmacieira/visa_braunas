/**
 * Tabela de Drill-Down dos Estabelecimentos Avaliados por Indicador
 * Permite a auditoria direta do universo de estabelecimentos vinculados ao indicador selecionado.
 */

import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  PlusCircle,
  Search,
  X,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { RiscoBadge } from "../estabelecimentos/RiscoBadge";
import { IndicadorUniversalDetalheItem, ItemEstabelecimentoCobertura } from "../../types/indicadores";

interface TabelaDrillDownIndicadorProps {
  indicador: IndicadorUniversalDetalheItem;
  estabelecimentos: ItemEstabelecimentoCobertura[];
  isLoading?: boolean;
  onClose: () => void;
}

export const TabelaDrillDownIndicador: React.FC<TabelaDrillDownIndicadorProps> = ({
  indicador,
  estabelecimentos,
  isLoading = false,
  onClose,
}) => {
  const [busca, setBusca] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "fiscalizados" | "pendentes">("todos");

  const estabelecimentosFiltrados = useMemo(() => {
    return estabelecimentos.filter((item) => {
      const matchBusca =
        item.razao_social.toLowerCase().includes(busca.toLowerCase()) ||
        (item.nome_fantasia && item.nome_fantasia.toLowerCase().includes(busca.toLowerCase())) ||
        item.cnpj_cpf.includes(busca);

      if (!matchBusca) return false;

      if (filtroStatus === "fiscalizados") {
        return item.fiscalizado_no_exercicio;
      }
      if (filtroStatus === "pendentes") {
        return !item.fiscalizado_no_exercicio;
      }

      return true;
    });
  }, [estabelecimentos, busca, filtroStatus]);

  const totalUniverso = estabelecimentos.length;
  const totalFiscalizados = estabelecimentos.filter((e) => e.fiscalizado_no_exercicio).length;
  const totalPendentes = totalUniverso - totalFiscalizados;
  const taxaCobertura = totalUniverso > 0 ? (totalFiscalizados / totalUniverso) * 100 : 100;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden transition-all">
      {/* Topo do Drill-Down */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/30">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              {indicador.codigo}
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Universo Avaliado: {indicador.titulo}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {indicador.descricao}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Métricas rápidas */}
          <div className="hidden sm:flex items-center gap-3 text-xs pr-4 border-r border-slate-200 dark:border-slate-700">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Universo</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {totalUniverso}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Fiscalizados</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {totalFiscalizados}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Pendentes</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 tabular-nums">
                {totalPendentes}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Cobertura</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                {taxaCobertura.toFixed(1)}%
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Fechar detalhamento"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por razão social, nome ou CNPJ..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-xs text-slate-400 font-medium mr-1">Filtrar:</span>
          {(["todos", "fiscalizados", "pendentes"] as const).map((filtro) => (
            <button
              key={filtro}
              type="button"
              onClick={() => setFiltroStatus(filtro)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                filtroStatus === filtro
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              {filtro === "todos"
                ? `Todos (${totalUniverso})`
                : filtro === "fiscalizados"
                ? `Inspecionados (${totalFiscalizados})`
                : `Pendentes (${totalPendentes})`}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo da Tabela */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">
          Carregando estabelecimentos vinculados...
        </div>
      ) : estabelecimentosFiltrados.length === 0 ? (
        <div className="p-8 text-center text-xs text-slate-400 space-y-1">
          <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
          <p className="font-semibold text-slate-600 dark:text-slate-300">
            Nenhum estabelecimento encontrado
          </p>
          <p>Tente ajustar os termos de busca ou o filtro de status selecionado.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 font-semibold">Estabelecimento</th>
                <th className="py-2.5 px-4 font-semibold">CNPJ / CPF</th>
                <th className="py-2.5 px-4 font-semibold">Risco</th>
                <th className="py-2.5 px-4 font-semibold">Alvará</th>
                <th className="py-2.5 px-4 font-semibold">Status no Exercício</th>
                <th className="py-2.5 px-4 font-semibold">Última Vistoria</th>
                <th className="py-2.5 px-4 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {estabelecimentosFiltrados.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  {/* Estabelecimento */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {item.razao_social}
                    </div>
                    {item.nome_fantasia && (
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.nome_fantasia}
                      </div>
                    )}
                  </td>

                  {/* CNPJ / CPF */}
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-600 dark:text-slate-300 tabular-nums">
                    {item.cnpj_cpf}
                  </td>

                  {/* Grau de Risco */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <RiscoBadge risco={item.grau_risco} />
                  </td>

                  {/* Alvará */}
                  <td className="py-3 px-4">
                    <span className="text-slate-700 dark:text-slate-300">
                      {item.situacao_alvara || "Não Possui"}
                    </span>
                    {item.numero_alvara && (
                      <span className="block text-[11px] font-mono text-slate-400">
                        Nº {item.numero_alvara}
                      </span>
                    )}
                  </td>

                  {/* Status no Exercício */}
                  <td className="py-3 px-4">
                    {item.fiscalizado_no_exercicio ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Inspecionado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-medium text-[11px]">
                        <Clock className="w-3.5 h-3.5" />
                        Pendente de Vistoria
                      </span>
                    )}
                  </td>

                  {/* Data da Última Vistoria */}
                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400 tabular-nums">
                    {item.data_ultima_inspecao || "Sem registro"}
                    {item.resultado_ultima_inspecao && (
                      <span className="block text-[10px] text-slate-400 capitalize">
                        {item.resultado_ultima_inspecao.replace(/_/g, " ")}
                      </span>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={ROUTES.ESTABELECIMENTOS.DETALHE(item.id)}
                        className="p-1 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 rounded transition-colors"
                        title="Ver Cadastro"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                      {!item.fiscalizado_no_exercicio && (
                        <Link
                          to={`${ROUTES.INSPECOES.LIST}?agendar=true&estabelecimento_id=${item.id}`}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 rounded border border-teal-200 dark:border-teal-800 transition-colors"
                        >
                          <PlusCircle className="w-3 h-3" />
                          <span>Agendar</span>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
