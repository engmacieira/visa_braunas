/**
 * Catálogo Centralizado e Tipado de Rotas do Sistema VigiMinas (Single Source of Truth)
 * Elimina caminhos literais espalhados no código (magic strings).
 */

export const ROUTES = {
  // Autenticação
  AUTH: {
    LOGIN: "/login",
  },

  // Acessos Públicos e Cidadãos
  PUBLIC: {
    VALIDAR_ALVARA: (codigo?: string) => (codigo ? `/validar-alvara/${codigo}` : "/validar-alvara"),
    VALIDAR_ALVARA_PATH: "validar-alvara/:codigo",
    VALIDAR_ALVARA_BASE_PATH: "validar-alvara",
    DENUNCIA_CIDADA: "/denuncia-cidada",
    DENUNCIA_CIDADA_PATH: "denuncia-cidada",
  },

  // Shell Administrativo Principal
  DASHBOARD: "/",
  DASHBOARD_ALIAS: "/dashboard",

  // Módulo de Estabelecimentos & CNAEs
  ESTABELECIMENTOS: {
    LIST: "/estabelecimentos",
    LIST_PATH: "estabelecimentos",
    NOVO: "/estabelecimentos/novo",
    NOVO_PATH: "estabelecimentos/novo",
    DETALHE: (id: string) => `/estabelecimentos/${id}`,
    DETALHE_PATH: "estabelecimentos/:id",
    EDITAR: (id: string) => `/estabelecimentos/${id}/editar`,
    EDITAR_PATH: "estabelecimentos/:id/editar",
  },

  // Módulo de Fiscalização, Laudos & Prazos
  INSPECOES: {
    LIST: "/inspecoes",
    LIST_PATH: "inspecoes",
    LAUDO: (id: string) => `/inspecoes/${id}/laudo`,
    LAUDO_PATH: "inspecoes/:id/laudo",
    PRAZOS: "/fiscalizacao/prazos",
    PRAZOS_PATH: "fiscalizacao/prazos",
  },

  // Módulo de Licenciamento & Alvarás
  LICENCIAMENTO: {
    LIST: "/licenciamento",
    LIST_PATH: "licenciamento",
    REQUERIMENTOS: "/licenciamento/requerimentos",
    REQUERIMENTOS_PATH: "licenciamento/requerimentos",
    REQUERIMENTO_DETALHE: (id: string) => `/licenciamento/requerimentos/${id}`,
    REQUERIMENTO_DETALHE_PATH: "licenciamento/requerimentos/:id",
    DETALHE: (id: string) => `/licenciamento/requerimentos/${id}`,
    ALVARA: (id: string) => `/licenciamento/alvaras/${id}`,
    ALVARA_PATH: "licenciamento/alvaras/:id",
    ALVARA_VIEW: (id: string) => `/licenciamento/alvaras/${id}`,
  },

  // Módulo de Ouvidoria & Denúncias
  OUVIDORIA: {
    LIST: "/ouvidoria",
    LIST_PATH: "ouvidoria",
    NOVA: "/ouvidoria/nova",
    NOVA_PATH: "ouvidoria/nova",
    DETALHE: (id: string) => `/ouvidoria/${id}`,
    DETALHE_PATH: "ouvidoria/:id",
  },

  // Módulo de Indicadores & Metas Regulatórias
  INDICADORES: {
    DASHBOARD: "/indicadores",
    DASHBOARD_PATH: "indicadores",
  },

  // Módulo de Relatórios Oficiais SUS
  RELATORIOS: {
    SUS: (ano?: number | string) => (ano ? `/relatorios/sus/${ano}` : "/relatorios/sus"),
    SUS_PATH: "relatorios/sus",
    SUS_ANO_PATH: "relatorios/sus/:ano",
  },

  // Gestão de Usuários & Servidores
  USUARIOS: {
    LIST: "/usuarios",
    LIST_PATH: "usuarios",
  },
} as const;

export default ROUTES;
