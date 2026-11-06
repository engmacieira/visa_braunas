/**
 * Módulo de Licenciamento & Alvarás Sanitários (LicenciamentoPage)
 * Controle de requerimentos, espelhos cadastrais declarados e emissão oficial.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle, FileCheck, QrCode } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface RequerimentoItem {
  id: string;
  numero_protocolo: string;
  tipo_solicitacao: string;
  status: string;
  data_submissao: string;
}

export const LicenciamentoPage: React.FC = () => {
  const { data: requerimentos = [], isLoading } = useQuery<RequerimentoItem[]>({
    queryKey: ["requerimentos"],
    queryFn: async () => {
      const res = await apiClient.get<RequerimentoItem[]>("/licenciamento/requerimentos");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-teal-600" />
          Licenciamento & Alvarás Sanitários
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Acompanhamento de requerimentos de concessão inicial, renovação e validação de autenticidade (QR Code).
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          Carregando requerimentos de alvará...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Tipo de Solicitação</th>
                  <th className="py-3 px-4">Data de Submissão</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {requerimentos.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      Nenhum requerimento de alvará sanitário em andamento.
                    </td>
                  </tr>
                ) : (
                  requerimentos.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        {req.numero_protocolo}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700 dark:text-slate-300">
                        {req.tipo_solicitacao.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {new Date(req.data_submissao).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                          {req.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default LicenciamentoPage;
