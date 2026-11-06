/**
 * Ponto de Entrada da Aplicação VigiMinas (App.tsx)
 * Provedores centrais:
 * 1. TanStack Query (QueryClientProvider v5) com cache inteligente
 * 2. Provedor de Autenticação JWT e RBAC (AuthProvider)
 * 3. Roteamento Declarativo Seguro (BrowserRouter, Routes, ProtectedRoute, AppLayout)
 */

import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { APP_CONFIG } from "./config/app.config";
import { AuthProvider } from "./contexts/AuthContext";
import { AppLayout } from "./layouts/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { EstabelecimentosPage } from "./pages/EstabelecimentosPage";
import { IndicadoresPage } from "./pages/IndicadoresPage";
import { InspecoesPage } from "./pages/InspecoesPage";
import { LicenciamentoPage } from "./pages/LicenciamentoPage";
import { LoginPage } from "./pages/LoginPage";
import { OuvidoriaPage } from "./pages/OuvidoriaPage";
import { UsuariosPage } from "./pages/UsuariosPage";

// Instância do QueryClient com configurações sensatas da Single Source of Truth
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: APP_CONFIG.queryClient.defaultStaleTime,
      gcTime: APP_CONFIG.queryClient.defaultGcTime,
      refetchOnWindowFocus: APP_CONFIG.queryClient.refetchOnWindowFocus,
      retry: 1,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Rota Pública de Autenticação */}
            <Route path="/login" element={<LoginPage />} />

            {/* Rotas Protegidas sob o Shell Operacional (AppLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route
                path="estabelecimentos"
                element={<EstabelecimentosPage />}
              />
              <Route
                path="inspecoes"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin_master",
                      "coordenador",
                      "fiscal_tecnico",
                    ]}
                  >
                    <InspecoesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenciamento"
                element={<LicenciamentoPage />}
              />
              <Route path="ouvidoria" element={<OuvidoriaPage />} />
              <Route
                path="indicadores"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin_master", "coordenador"]}
                  >
                    <IndicadoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="usuarios"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin_master", "coordenador"]}
                  >
                    <UsuariosPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Rota de Fallback para redirecionar caminhos não reconhecidos */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}
