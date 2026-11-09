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
import { ErrorBoundary, GlobalLoadingIndicator } from "./components/common";
import { APP_CONFIG } from "./config/app.config";
import { ROUTES } from "./config/routes.config";
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
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            {/* Indicador Global de Carregamento HTTP (Axios / TanStack Query) */}
            <GlobalLoadingIndicator />

            <Routes>
              {/* Rota Pública de Autenticação */}
              <Route path={ROUTES.AUTH.LOGIN} element={<LoginPage />} />

              {/* Rota Pública de Validação de Autenticidade do Alvará (QR Code) */}
              <Route path={ROUTES.PUBLIC.VALIDAR_ALVARA_PATH} element={<ValidarAlvaraPublicPage />} />
              <Route path={ROUTES.PUBLIC.VALIDAR_ALVARA_BASE_PATH} element={<ValidarAlvaraPublicPage />} />

              {/* Rota Pública do Canal Cidadão (Registro e Consulta de Denúncias Sanitárias) */}
              <Route path={ROUTES.PUBLIC.DENUNCIA_CIDADA_PATH} element={<DenunciaPublicaPage />} />

              {/* Rotas Protegidas sob o Shell Operacional (AppLayout) */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<DashboardPage />} />
                <Route path={ROUTES.DASHBOARD_ALIAS.replace(/^\//, "")} element={<DashboardPage />} />
                <Route
                  path={ROUTES.ESTABELECIMENTOS.LIST_PATH}
                  element={<EstabelecimentosListPage />}
                />
                <Route
                  path={ROUTES.ESTABELECIMENTOS.NOVO_PATH}
                  element={<EstabelecimentoFormPage />}
                />
                <Route
                  path={ROUTES.ESTABELECIMENTOS.DETALHE_PATH}
                  element={<EstabelecimentoDetailPage />}
                />
                <Route
                  path={ROUTES.ESTABELECIMENTOS.EDITAR_PATH}
                  element={<EstabelecimentoFormPage />}
                />
                <Route
                  path={ROUTES.INSPECOES.LIST_PATH}
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
                  path={ROUTES.INSPECOES.LAUDO_PATH}
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
                  path={ROUTES.INSPECOES.PRAZOS_PATH}
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
                  path={ROUTES.LICENCIAMENTO.LIST_PATH}
                  element={<LicenciamentoPage />}
                />
                <Route
                  path={ROUTES.LICENCIAMENTO.REQUERIMENTOS_PATH}
                  element={<LicenciamentoPage />}
                />
                <Route
                  path={ROUTES.LICENCIAMENTO.REQUERIMENTO_DETALHE_PATH}
                  element={<RequerimentoDetailPage />}
                />
                <Route
                  path={ROUTES.LICENCIAMENTO.ALVARA_PATH}
                  element={<AlvaraViewPage />}
                />
                <Route path={ROUTES.OUVIDORIA.LIST_PATH} element={<DenunciasListPage />} />
                <Route
                  path={ROUTES.OUVIDORIA.NOVA_PATH}
                  element={<RegistrarDenunciaInternaPage />}
                />
                <Route
                  path={ROUTES.OUVIDORIA.DETALHE_PATH}
                  element={<DenunciaDetailPage />}
                />
                <Route
                  path={ROUTES.INDICADORES.DASHBOARD_PATH}
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
                  path={ROUTES.RELATORIOS.SUS_PATH}
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin_master", "coordenador"]}
                    >
                      <RelatorioSusPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path={ROUTES.RELATORIOS.SUS_ANO_PATH}
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin_master", "coordenador"]}
                    >
                      <RelatorioSusPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path={ROUTES.USUARIOS.LIST_PATH}
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
              <Route path="*" element={<Navigate to={ROUTES.DASHBOARD} replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
