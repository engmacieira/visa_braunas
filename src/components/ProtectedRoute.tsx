/**
 * Componente de Proteção de Rotas e Controle de Acesso Baseado em Perfis (RBAC)
 * Redireciona usuários não autenticados para a tela de Login
 * e exibe tela de 'Acesso Restrito' para servidores sem privilégios suficientes.
 */

import React from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { APP_CONFIG } from "../config/app.config";
import { useAuth } from "../contexts/AuthContext";
import { PerfilUsuario } from "../types/auth";

interface ProtectedRouteProps {
  allowedRoles?: PerfilUsuario[];
  children?: React.ReactNode;
}

const PERFIL_LABELS: Record<PerfilUsuario, string> = {
  admin_master: "Administrador Master",
  coordenador: "Coordenador de Vigilância",
  fiscal_tecnico: "Fiscal Técnico Sanitário",
  digitador: "Digitador Operacional",
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  allowedRoles,
  children,
}) => {
  const { isAuthenticated, isLoading, user, hasPermission } = useAuth();
  const location = useLocation();

  // Estado de Carregamento Inicial da Sessão
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-slate-100 p-4">
        <div className="w-10 h-10 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-base font-semibold tracking-wide">
          {APP_CONFIG.nome}
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Validando credenciais de acesso seguro...
        </p>
      </div>
    );
  }

  // Redirecionamento para Login se não autenticado
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Validação de Permissão por Perfil (RBAC)
  if (allowedRoles && allowedRoles.length > 0 && !hasPermission(allowedRoles)) {
    const rolesFormatadas = allowedRoles
      .map((r) => PERFIL_LABELS[r] || r)
      .join(", ");

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>

          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Acesso Restrito
          </h2>

          <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
            O seu perfil de acesso (
            <span className="font-medium text-slate-900 dark:text-slate-200">
              {PERFIL_LABELS[user.perfil] || user.perfil}
            </span>
            ) não possui autorização regulatória para visualizar esta página.
          </p>

          <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-xs text-slate-500 dark:text-slate-400 text-left">
            <span className="font-semibold block text-slate-700 dark:text-slate-300 mb-1">
              Perfis Habilitados:
            </span>
            {rolesFormatadas}
          </div>

          <div className="mt-6">
            <Link
              to="/"
              className="inline-flex items-center justify-center px-4 py-2 text-xs font-medium text-white bg-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg hover:bg-slate-800 transition-colors"
            >
              Voltar ao Painel Geral
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;
