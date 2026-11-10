/**
 * Listagem Principal de Estabelecimentos Sanitários (EstabelecimentosListPage)
 * Tabela densa e responsiva com debounce de busca, filtros combinados de Risco e Situação,
 * paginação e atalhos operacionais para visualização detalhada e edição.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Edit,
  Eye,
  Filter,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import RiscoBadge from "../../components/estabelecimentos/RiscoBadge";
import SituacaoAlvaraBadge from "../../components/estabelecimentos/SituacaoAlvaraBadge";
import { useEstabelecimentosList } from "../../hooks/useEstabelecimentos";
import {
  EstabelecimentoFilters,
  NivelRisco,
  SituacaoCadastral,
} from "../../types/estabelecimento";

const ITENS_POR_PAGINA = 15;

export const EstabelecimentosListPage: React.FC = () => {
  const [termoBusca, setTermoBusca] = useState("");
  const [debouncedBusca, setDebouncedBusca] = useState("");
  const [filtroRisco, setFiltroRisco] = useState<NivelRisco | "">("");
  const [filtroSituacao, setFiltroSituacao] = useState<SituacaoCadastral | "">("");
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [campoOrdenacao, setCampoOrdenacao] = useState<string>("razao_social");
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<"asc" | "desc">("asc");

  // Debounce de 350ms na busca textual
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBusca(termoBusca);
      setPaginaAtual(1); // Reseta para a primeira página ao alterar o termo
    }, 350);
    return () => clearTimeout(timer);
  }, [termoBusca]);

  const handleAlternarOrdenacao = (campo: string) => {
    if (campoOrdenacao === campo) {
      setDirecaoOrdenacao((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setCampoOrdenacao(campo);
      setDirecaoOrdenacao("asc");
    }
    setPaginaAtual(1);
  };

  const filtros: EstabelecimentoFilters = {
    busca: debouncedBusca,
    risco: filtroRisco,
    situacao: filtroSituacao,
    order_by: campoOrdenacao,
    order_direction: direcaoOrdenacao,
    skip: (paginaAtual - 1) * ITENS_POR_PAGINA,
    limit: ITENS_POR_PAGINA,
  };

  const { data, isLoading, isFetching, refetch } = useEstabelecimentosList(filtros);

  const estabelecimentos = data?.itens || (data as { items?: typeof data extends { itens: infer T } ? T : never } | undefined)?.items || [];
  const totalRegistros = data?.total || 0;
  const totalPaginas = Math.ceil(totalRegistros / ITENS_POR_PAGINA) || 1;

  const handleLimparFiltros = () => {
    setTermoBusca("");
    setDebouncedBusca("");
    setFiltroRisco("");
    setFiltroSituacao("");
    setCampoOrdenacao("razao_social");
    setDirecaoOrdenacao("asc");
    setPaginaAtual(1);
  };

  const temFiltrosAtivos =
    Boolean(termoBusca) ||
    Boolean(filtroRisco) ||
    Boolean(filtroSituacao) ||
    campoOrdenacao !== "razao_social" ||
    direcaoOrdenacao !== "asc";

  const renderSortableHeader = (campo: string, titulo: string, className = "py-3 px-4") => {
    const isAtivo = campoOrdenacao === campo;
    return (
      <th className={className} scope="col">
        <button
          type="button"
          onClick={() => handleAlternarOrdenacao(campo)}
          className={`inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] rounded transition-colors group focus:outline-none focus:ring-1 focus:ring-teal-500 py-0.5 ${
            isAtivo
              ? "text-teal-600 dark:text-teal-400 font-bold"
              : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          }`}
          title={`Ordenar por ${titulo} (${isAtivo && direcaoOrdenacao === "asc" ? "decrescente" : "crescente"})`}
          aria-sort={isAtivo ? (direcaoOrdenacao === "asc" ? "ascending" : "descending") : "none"}
        >
          <span>{titulo}</span>
          <span className="p-0.5 rounded">
            {isAtivo ? (
              direcaoOrdenacao === "asc" ? (
                <ArrowUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              ) : (
                <ArrowDown className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              )
            ) : (
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 opacity-60 group-hover:opacity-100 transition-opacity" />
            )}
          </span>
        </button>
      </th>
    );
  };

  return (
    <div className="space-y-5">
      {/* Cabeçalho da Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-50 dark:bg-teal-950/40 rounded-lg text-teal-600 dark:text-teal-400">
              <Building2 className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              Estabelecimentos Regulados
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Cadastro de estabelecimentos municipais sujeitos à fiscalização e licenciamento da VISA.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 transition-colors"
            title="Recarregar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>

          <Link
            to={ROUTES.ESTABELECIMENTOS.NOVO}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Estabelecimento</span>
          </Link>
        </div>
      </div>

      {/* Barra de Filtros e Busca Rápida com Debounce */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Busca Textual */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={termoBusca}
              onChange={(e) => setTermoBusca(e.target.value)}
              placeholder="Buscar por CNPJ/CPF, Inscrição Municipal, Razão Social ou Nome Fantasia..."
              className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            {termoBusca && (
              <button
                type="button"
                onClick={() => setTermoBusca("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por Risco Sanitário */}
          <div className="sm:col-span-3">
            <select
              value={filtroRisco}
              onChange={(e) => {
                setFiltroRisco(e.target.value as NivelRisco | "");
                setPaginaAtual(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todos os Níveis de Risco</option>
              <option value="Risco III">Risco III (Alto)</option>
              <option value="Risco II">Risco II (Médio)</option>
              <option value="Risco I">Risco I (Baixo)</option>
              <option value="Dispensado">Dispensado</option>
            </select>
          </div>

          {/* Filtro por Situação Cadastral */}
          <div className="sm:col-span-3">
            <select
              value={filtroSituacao}
              onChange={(e) => {
                setFiltroSituacao(e.target.value as SituacaoCadastral | "");
                setPaginaAtual(1);
              }}
              className="w-full py-2 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">Todas as Situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
              <option value="Suspenso">Suspenso</option>
            </select>
          </div>
        </div>

        {/* Indicador de Filtros Ativos */}
        {temFiltrosAtivos && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
            <span>
              Filtrando resultados ({totalRegistros} estabelecimento
              {totalRegistros === 1 ? "" : "s"} encontrado{totalRegistros === 1 ? "" : "s"})
            </span>
            <button
              type="button"
              onClick={handleLimparFiltros}
              className="text-teal-600 hover:text-teal-700 dark:text-teal-400 font-semibold"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela de Estabelecimentos */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
            <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            Carregando cadastro de estabelecimentos...
          </div>
        ) : estabelecimentos.length === 0 ? (
          <div className="p-16 text-center text-xs text-slate-500 dark:text-slate-400 space-y-2">
            <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 dark:text-slate-200">
              Nenhum estabelecimento encontrado.
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Verifique os filtros informados ou realize um novo cadastro clicando no botão acima.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  {renderSortableHeader("cnpj_cpf", "CNPJ / CPF")}
                  {renderSortableHeader("inscricao_municipal", "Inscrição Municipal")}
                  {renderSortableHeader("razao_social", "Razão Social / Nome Fantasia")}
                  <th className="py-3 px-4">Grau de Risco</th>
                  <th className="py-3 px-4">Situação do Alvará</th>
                  <th className="py-3 px-4">Situação Cadastral</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {estabelecimentos.map((estab) => (
                  <tr
                    key={estab.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                      {estab.cnpj_cpf}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                      {estab.inscricao_municipal ? (
                        estab.inscricao_municipal
                      ) : (
                        <span className="text-slate-400 font-sans italic text-[11px]" title="Inscrição Municipal não informada">
                          N/I
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 max-w-xs">
                      <Link
                        to={ROUTES.ESTABELECIMENTOS.DETALHE(estab.id)}
                        className="font-semibold text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 block truncate"
                        title={estab.razao_social}
                      >
                        {estab.razao_social}
                      </Link>
                      <span className="text-[11px] text-slate-400 block truncate">
                        {estab.nome_fantasia || "Sem nome fantasia registrado"}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <RiscoBadge risco={estab.nivel_risco} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <SituacaoAlvaraBadge situacao={estab.situacao_alvara} />
                      {estab.numero_alvara && (
                        <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                          Nº {estab.numero_alvara}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${
                          estab.situacao_estabelecimento === "Ativo"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {estab.situacao_estabelecimento}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        <Link
                          to={ROUTES.ESTABELECIMENTOS.DETALHE(estab.id)}
                          className="p-1.5 text-slate-600 hover:text-teal-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Visualizar Ficha Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>

                        <Link
                          to={ROUTES.ESTABELECIMENTOS.EDITAR(estab.id)}
                          className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>

                        <Link
                          to={`${ROUTES.INSPECOES.LIST}?estabelecimento_id=${estab.id}`}
                          className="p-1.5 text-slate-600 hover:text-purple-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Fiscalizações deste estabelecimento"
                        >
                          <ClipboardCheck className="w-4 h-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {totalPaginas > 1 && (
          <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <div>
              Mostrando{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {(paginaAtual - 1) * ITENS_POR_PAGINA + 1}
              </strong>{" "}
              a{" "}
              <strong className="text-slate-700 dark:text-slate-300">
                {Math.min(paginaAtual * ITENS_POR_PAGINA, totalRegistros)}
              </strong>{" "}
              de <strong className="tabular-nums">{totalRegistros}</strong> registros
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.max(1, p - 1))}
                disabled={paginaAtual === 1}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="px-2 font-medium">
                Página {paginaAtual} de {totalPaginas}
              </span>

              <button
                type="button"
                onClick={() => setPaginaAtual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaAtual === totalPaginas}
                className="p-1.5 rounded border border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EstabelecimentosListPage;
