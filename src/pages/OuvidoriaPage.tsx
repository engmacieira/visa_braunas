/**
 * Módulo de Ouvidoria & Denúncias Sanitárias (OuvidoriaPage)
 * Triagem de reclamações públicas, controle de sigilo e despacho fiscal.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle, AlertTriangle, MessageSquare } from "lucide-react";
import { apiClient } from "../services/apiClient";

interface DenunciaItem {
  id: string;
  numero_protocolo: string;
  origem: string;
  gravidade: string;
  status: string;
  local_denunciado_identificacao: string;
  denunciante_anonimo: boolean;
  criado_em: string;
}

export const OuvidoriaPage: React.FC = () => {
  const { data: denuncias = [], isLoading } = useQuery<DenunciaItem[]>({
    queryKey: ["denuncias"],
    queryFn: async () => {
      const res = await apiClient.get<DenunciaItem[]>("/ouvidoria/denuncias");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-teal-600" />
          Ouvidoria & Denúncias Sanitárias
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Captação multicanal, protocolo de averiguação fiscal e proteção de identidade do denunciante.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          Carregando fila de denúncias...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Protocolo</th>
                  <th className="py-3 px-4">Local Denunciado</th>
                  <th className="py-3 px-4">Gravidade</th>
                  <th className="py-3 px-4">Origem</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {denuncias.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 text-xs">
                      Nenhuma denúncia na fila de apuração da Ouvidoria.
                    </td>
                  </tr>
                ) : (
                  denuncias.map((den) => (
                    <tr key={den.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900 dark:text-white">
                        {den.numero_protocolo}
                      </td>
                      <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                        {den.local_denunciado_identificacao}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                            den.gravidade === "urgente" || den.gravidade === "alta"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {den.gravidade}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 capitalize">
                        {den.origem.replace(/_/g, " ")}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 uppercase">
                          {den.status}
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

export default OuvidoriaPage;
