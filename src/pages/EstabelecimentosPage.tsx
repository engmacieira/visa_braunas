/**
 * Módulo de Estabelecimentos Sanitários (EstabelecimentosPage)
 * Listagem, consulta de CNAEs e dados cadastrais regulatórios.
 */

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Search, ShieldAlert, Tag } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface EstabelecimentoItem {
  id: string;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia: string;
  nivel_risco: string;
  situacao_estabelecimento: string;
  telefone_celular?: string;
  municipio: string;
  uf: string;
  numero_alvara?: string;
  situacao_alvara?: string;
}

export const EstabelecimentosPage: React.FC = () => {
  const [termoBusca, setTermoBusca] = useState("");

  const { data: estabelecimentos = [], isLoading, error } = useQuery<EstabelecimentoItem[]>({
    queryKey: ["estabelecimentos", termoBusca],
    queryFn: async () => {
      const params = termoBusca ? { search: termoBusca } : {};
      const res = await apiClient.get<EstabelecimentoItem[]>("/estabelecimentos", { params });
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-teal-600" />
            Estabelecimentos Sanitários
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Gestão do cadastro econômico, enquadramento de risco sanitário e alvarás vigentes.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={termoBusca}
            onChange={(e) => setTermoBusca(e.target.value)}
            placeholder="Buscar por CNPJ ou Razão Social..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          Carregando estabelecimentos cadastrados...
        </div>
      ) : error ? (
        <div className="p-6 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs">
          Não foi possível carregar a listagem de estabelecimentos da API.
        </div>
      ) : estabelecimentos.length === 0 ? (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500 dark:text-slate-400 text-xs">
          Nenhum estabelecimento encontrado para os critérios pesquisados.
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">CNPJ / CPF</th>
                  <th className="py-3 px-4">Razão Social / Nome Fantasia</th>
                  <th className="py-3 px-4">Grau de Risco</th>
                  <th className="py-3 px-4">Alvará</th>
                  <th className="py-3 px-4">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {estabelecimentos.map((estab) => (
                  <tr key={estab.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-mono font-medium text-slate-700 dark:text-slate-300">
                      {estab.cnpj_cpf}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {estab.razao_social}
                      </div>
                      <div className="text-[11px] text-slate-400">{estab.nome_fantasia}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700 dark:text-slate-300">
                        <Tag className="w-3 h-3 text-teal-600" />
                        {estab.nivel_risco}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {estab.numero_alvara ? (
                        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                          {estab.numero_alvara} ({estab.situacao_alvara || "Válido"})
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Pendente</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        {estab.situacao_estabelecimento}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EstabelecimentosPage;
