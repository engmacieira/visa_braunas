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
import { EstabelecimentosListPage } from "./pages/estabelecimentos/EstabelecimentosListPage";
import { EstabelecimentoDetailPage } from "./pages/estabelecimentos/EstabelecimentoDetailPage";
import { EstabelecimentoFormPage } from "./pages/estabelecimentos/EstabelecimentoFormPage";
import { InspecoesListPage } from "./pages/fiscalizacao/InspecoesListPage";
import { LaudoInspecaoFormPage } from "./pages/fiscalizacao/LaudoInspecaoFormPage";
import { PainelPrazosPage } from "./pages/fiscalizacao/PainelPrazosPage";
import { DashboardIndicadoresPage } from "./pages/indicadores/DashboardIndicadoresPage";
import { RelatorioSusPage } from "./pages/indicadores/RelatorioSusPage";
import { LicenciamentoPage } from "./pages/LicenciamentoPage";
import { RequerimentoDetailPage } from "./pages/licenciamento/RequerimentoDetailPage";
import { AlvaraViewPage } from "./pages/licenciamento/AlvaraViewPage";
import { ValidarAlvaraPublicPage } from "./pages/public/ValidarAlvaraPublicPage";
import { DenunciaPublicaPage } from "./pages/public/DenunciaPublicaPage";
import { LoginPage } from "./pages/LoginPage";
import { DenunciasListPage } from "./pages/ouvidoria/DenunciasListPage";
import { DenunciaDetailPage } from "./pages/ouvidoria/DenunciaDetailPage";
import { RegistrarDenunciaInternaPage } from "./pages/ouvidoria/RegistrarDenunciaInternaPage";
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

            {/* Rota Pública de Validação de Autenticidade do Alvará (QR Code) */}
            <Route path="/validar-alvara/:codigo" element={<ValidarAlvaraPublicPage />} />
            <Route path="/validar-alvara" element={<ValidarAlvaraPublicPage />} />

            {/* Rota Pública do Canal Cidadão (Registro e Consulta de Denúncias Sanitárias) */}
            <Route path="/denuncia-cidada" element={<DenunciaPublicaPage />} />

            {/* Rotas Protegidas sob o Shell Operacional (AppLayout) */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route
                path="estabelecimentos"
                element={<EstabelecimentosListPage />}
              />
              <Route
                path="estabelecimentos/novo"
                element={<EstabelecimentoFormPage />}
              />
              <Route
                path="estabelecimentos/:id"
                element={<EstabelecimentoDetailPage />}
              />
              <Route
                path="estabelecimentos/:id/editar"
                element={<EstabelecimentoFormPage />}
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
                    <InspecoesListPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="inspecoes/:id/laudo"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin_master",
                      "coordenador",
                      "fiscal_tecnico",
                    ]}
                  >
                    <LaudoInspecaoFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="fiscalizacao/prazos"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin_master",
                      "coordenador",
                      "fiscal_tecnico",
                    ]}
                  >
                    <PainelPrazosPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="licenciamento"
                element={<LicenciamentoPage />}
              />
              <Route
                path="licenciamento/requerimentos"
                element={<LicenciamentoPage />}
              />
              <Route
                path="licenciamento/requerimentos/:id"
                element={<RequerimentoDetailPage />}
              />
              <Route
                path="licenciamento/alvaras/:id"
                element={<AlvaraViewPage />}
              />
              <Route path="ouvidoria" element={<DenunciasListPage />} />
              <Route
                path="ouvidoria/nova"
                element={<RegistrarDenunciaInternaPage />}
              />
              <Route
                path="ouvidoria/:id"
                element={<DenunciaDetailPage />}
              />
              <Route
                path="indicadores"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      "admin_master",
                      "coordenador",
                      "fiscal_tecnico",
                    ]}
                  >
                    <DashboardIndicadoresPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="relatorios/sus"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin_master", "coordenador"]}
                  >
                    <RelatorioSusPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="relatorios/sus/:ano"
                element={
                  <ProtectedRoute
                    allowedRoles={["admin_master", "coordenador"]}
                  >
                    <RelatorioSusPage />
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
