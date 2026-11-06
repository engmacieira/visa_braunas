/**
 * Módulo de Gestão de Servidores & Usuários (UsuariosPage)
 * Exclusivo para Coordenadores e Admin Master.
 */

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Shield, UserCheck, Users } from "lucide-react";
import { apiClient } from "../services/apiClient";
import { UsuarioSessao } from "../types/auth";

export const UsuariosPage: React.FC = () => {
  const { data: usuarios = [], isLoading } = useQuery<UsuarioSessao[]>({
    queryKey: ["usuarios"],
    queryFn: async () => {
      const res = await apiClient.get<UsuarioSessao[]>("/usuarios");
      return res.data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" />
          Servidores & Usuários do Sistema
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gestão de contas públicas, portarias de nomeação e controle de acesso RBAC.
        </p>
      </div>

      {isLoading ? (
        <div className="p-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
          <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
          Carregando usuários cadastrados...
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Nome Completo / E-mail</th>
                  <th className="py-3 px-4">Matrícula / Portaria</th>
                  <th className="py-3 px-4">Cargo</th>
                  <th className="py-3 px-4">Perfil RBAC</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {usuarios.map((usr) => (
                  <tr key={usr.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {usr.nome_completo}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {usr.email}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      <div>{usr.matricula || "—"}</div>
                      <div className="text-[10px] text-slate-400">{usr.portaria_nomeacao || "—"}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                      {usr.cargo}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 uppercase">
                        {usr.perfil.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        <UserCheck className="w-3.5 h-3.5" />
                        {usr.is_active ? "Ativo" : "Inativo"}
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

export default UsuariosPage;
