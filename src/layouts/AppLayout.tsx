/**
 * Shell Principal e Layout do Sistema VigiMinas (AppLayout)
 * Estrutura com Sidebar retrátil, Header com informações do fiscal logado,
 * navegação filtrada por RBAC e rodapé com metadados institucionais dinâmicos.
 */

import React, { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  BarChart3,
  Building2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  FileCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Shield,
  Users,
  X,
} from "lucide-react";
import { APP_CONFIG } from "../config/app.config";
import { useAuth } from "../contexts/AuthContext";
import { PerfilUsuario } from "../types/auth";

interface NavMenuItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  allowedRoles?: PerfilUsuario[];
}

const MENU_ITEMS: NavMenuItem[] = [
  {
    label: "Painel Geral",
    path: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Estabelecimentos",
    path: "/estabelecimentos",
    icon: Building2,
  },
  {
    label: "Fiscalização & VAPT",
    path: "/inspecoes",
    icon: ClipboardCheck,
    allowedRoles: ["admin_master", "coordenador", "fiscal_tecnico"],
  },
  {
    label: "Painel de Prazos",
    path: "/fiscalizacao/prazos",
    icon: Clock,
    allowedRoles: ["admin_master", "coordenador", "fiscal_tecnico"],
  },
  {
    label: "Alvarás & Licenciamento",
    path: "/licenciamento",
    icon: FileCheck,
  },
  {
    label: "Ouvidoria & Denúncias",
    path: "/ouvidoria",
    icon: AlertCircle,
  },
  {
    label: "Metas & Indicadores",
    path: "/indicadores",
    icon: BarChart3,
    allowedRoles: ["admin_master", "coordenador", "fiscal_tecnico"],
  },
  {
    label: "Usuários & Servidores",
    path: "/usuarios",
    icon: Users,
    allowedRoles: ["admin_master", "coordenador"],
  },
];

const PERFIL_BADGES: Record<
  PerfilUsuario,
  { label: string; bgClass: string; textClass: string; borderClass: string }
> = {
  admin_master: {
    label: "Admin Master",
    bgClass: "bg-purple-50 dark:bg-purple-950/40",
    textClass: "text-purple-700 dark:text-purple-300",
    borderClass: "border-purple-200 dark:border-purple-800",
  },
  coordenador: {
    label: "Coordenador VISA",
    bgClass: "bg-blue-50 dark:bg-blue-950/40",
    textClass: "text-blue-700 dark:text-blue-300",
    borderClass: "border-blue-200 dark:border-blue-800",
  },
  fiscal_tecnico: {
    label: "Fiscal Sanitário",
    bgClass: "bg-teal-50 dark:bg-teal-950/40",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-200 dark:border-teal-800",
  },
  digitador: {
    label: "Digitador",
    bgClass: "bg-slate-100 dark:bg-slate-800",
    textClass: "text-slate-700 dark:text-slate-300",
    borderClass: "border-slate-200 dark:border-slate-700",
  },
};

export const AppLayout: React.FC = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Filtragem dinâmica dos itens de menu com base nas permissões RBAC do usuário
  const visibleMenuItems = MENU_ITEMS.filter((item) =>
    hasPermission(item.allowedRoles)
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const perfilMeta = user
    ? PERFIL_BADGES[user.perfil] || {
        label: user.perfil,
        bgClass: "bg-slate-100",
        textClass: "text-slate-700",
        borderClass: "border-slate-200",
      }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Lado Esquerdo: Mobile Hamburger + Identificação da Aplicação */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600"
              aria-label="Alternar navegação lateral"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>

            <Link
              to="/"
              className="flex items-center gap-2.5 text-slate-900 dark:text-white group focus-visible:outline-none"
            >
              <div className="w-9 h-9 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base leading-tight tracking-tight">
                  {APP_CONFIG.nome}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                  {APP_CONFIG.municipio} / {APP_CONFIG.uf}
                </span>
              </div>
            </Link>
          </div>

          {/* Lado Direito: Servidor Logado, Perfil e Logout */}
          <div className="flex items-center gap-4">
            {user && (
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">
                  {user.nome_completo}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[200px]">
                  {user.cargo}
                </span>
              </div>
            )}

            {perfilMeta && (
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${perfilMeta.bgClass} ${perfilMeta.textClass} ${perfilMeta.borderClass} shrink-0`}
              >
                {perfilMeta.label}
              </span>
            )}

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-rose-600 dark:hover:text-rose-400 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0"
              title="Encerrar Sessão"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Corpo com Sidebar e Conteúdo */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6">
        {/* Sidebar Desktop Fixa */}
        <aside className="hidden md:block w-64 shrink-0">
          <nav className="sticky top-24 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-xs space-y-1">
            <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Módulos Regulatórios
            </div>

            {visibleMenuItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/"}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-colors group ${
                      isActive
                        ? "bg-teal-50 dark:bg-teal-950/50 text-teal-800 dark:text-teal-300 font-semibold"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-2.5">
                        <Icon
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? "text-teal-600 dark:text-teal-400"
                              : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                          }`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight
                        className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity ${
                          isActive
                            ? "opacity-100 text-teal-600 dark:text-teal-400"
                            : "text-slate-300 dark:text-slate-600"
                        }`}
                      />
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Drawer Mobile */}
        {mobileMenuOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex"
            onClick={() => setMobileMenuOpen(false)}
          >
            <div
              className="w-72 bg-white dark:bg-slate-900 h-full p-4 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-teal-600" />
                    <span className="font-bold text-sm">{APP_CONFIG.nome}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-500 hover:text-slate-800 dark:hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-1">
                  {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <NavLink
                        key={item.path}
                        to={item.path}
                        end={item.path === "/"}
                        onClick={() => setMobileMenuOpen(false)}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            isActive
                              ? "bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 font-semibold"
                              : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          }`
                        }
                      >
                        <Icon className="w-4 h-4 text-slate-500" />
                        <span>{item.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 rounded-lg hover:bg-rose-100 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Encerrar Sessão</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Viewport Principal de Conteúdo */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Rodapé Dinâmico do Sistema */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 dark:text-slate-400">
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {APP_CONFIG.nome} v{APP_CONFIG.versao}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {APP_CONFIG.municipio}/{APP_CONFIG.uf}
            </span>
            <span aria-hidden="true">·</span>
            <span>{APP_CONFIG.secretaria}</span>
            <span aria-hidden="true">·</span>
            <span>{APP_CONFIG.orgao}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Prefeitura Municipal de {APP_CONFIG.municipio}. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;
