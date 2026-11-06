/**
 * Módulo de Fiscalização & Inspeções Sanitárias (InspecoesPage)
 * Controle de termos de vistoria, notificações e ações VAPT (Indicador 11).
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { ClipboardCheck, FileText, Plus, Shield } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface InspecaoItem {
  id: string;
  numero_termo: string;
  motivo: string;
  status: string;
  data_inicio: string;
  data_fim?: string;
  resultado?: string;
  nome_local_trabalho?: string;
}

export const InspecoesPage: React.FC = () => {
  const { data: inspecoes = [], isLoading } = useQuery<InspecaoItem[]>({
    queryKey: ["inspecoes"],
    queryFn: async () => {
      const res = await apiClient.get<InspecaoItem[]>("/inspecoes");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-teal-600" />
            Fiscalização & Inspeções Sanitárias
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Registro de autos de infração, termos fiscais e vigilância em ambientes de trabalho (VAPT).
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          Carregando registros de inspeção...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Termo / Protocolo</th>
                  <th className="py-3 px-4">Motivo da Inspeção</th>
                  <th className="py-3 px-4">Data</th>
                  <th className="py-3 px-4">Resultado</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {inspecoes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma inspeção sanitária registrada até o momento.
                    </td>
                  </tr>
                ) : (
                  inspecoes.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200">
                        {item.numero_termo}
                      </td>
                      <td className="py-3 px-4 capitalize text-slate-700 dark:text-slate-300">
                        {item.motivo.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.data_inicio}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {item.resultado ? item.resultado.replace(/_/g, " ") : "Pendente"}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 uppercase">
                          {item.status}
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

export default InspecoesPage;
