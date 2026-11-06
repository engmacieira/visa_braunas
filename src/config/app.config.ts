/**
 * Configuração Central do Sistema VigiMinas (Single Source of Truth)
 * Todas as constantes institucionais, versões e parâmetros de rede
 * devem ser consumidos exclusivamente a partir deste arquivo.
 */

export interface AppConfig {
  nome: string;
  descricao: string;
  versao: string;
  municipio: string;
  uf: string;
  secretaria: string;
  orgao: string;
  storageKeys: {
    token: string;
    user: string;
  };
  apiBaseUrl: string;
  queryClient: {
    defaultStaleTime: number; // 5 minutos para dados estáticos
    defaultGcTime: number; // 10 minutos de cache
    refetchOnWindowFocus: boolean;
  };
  routes: {
    login: string;
    dashboard: string;
    estabelecimentos: string;
    inspecoes: string;
    licenciamento: string;
    ouvidoria: string;
    indicadores: string;
    usuarios: string;
  };
}

export const APP_CONFIG: AppConfig = {
  nome: "VigiMinas",
  descricao: "Sistema de Gestão da Vigilância Sanitária Municipal",
  versao: "2.0.0",
  municipio: "Braúnas",
  uf: "MG",
  secretaria: "Secretaria Municipal de Saúde",
  orgao: "Coordenação de Vigilância Sanitária",
  storageKeys: {
    token: "vigiminas_token",
    user: "vigiminas_user",
  },
  apiBaseUrl:
    (typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL) ||
    "http://localhost:8000/api/v1",
  queryClient: {
    defaultStaleTime: 5 * 60 * 1000, // 5 minutos
    defaultGcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false, // Desativado para estabilidade cadastral
  },
  routes: {
    login: "/login",
    dashboard: "/",
    estabelecimentos: "/estabelecimentos",
    inspecoes: "/inspecoes",
    licenciamento: "/licenciamento",
    ouvidoria: "/ouvidoria",
    indicadores: "/indicadores",
    usuarios: "/usuarios",
  },
} as const;
