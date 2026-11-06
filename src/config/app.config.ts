/**
 * Configuração Central do Sistema VigiMinas (Single Source of Truth - SSOT)
 * Todas as constantes institucionais, versões, normas regulatórias,
 * limites de upload e parâmetros de rede devem ser consumidos exclusivamente a partir deste arquivo.
 */

export interface AppConfig {
  nome: string;
  descricao: string;
  versao: string;
  anoExercicioPadrao: number;
  municipio: string;
  uf: string;
  prefeitura: string;
  secretaria: string;
  orgao: string;
  departamento: string;
  estadoExtenso: string;
  pais: string;
  endereco: {
    logradouro: string;
    numero: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    telefone: string;
    email: string;
    atendimento: string;
  };
  normas: {
    alvaraValidadeDiasPadrao: number;
    notificacaoPrazoDiasPadrao: number;
    rdcAnvisa: string;
    resolucaoSesMg: string;
    inAnvisa: string;
    leiOrganicaSaude: string;
    leiDefesaUsuario: string;
  };
  uploadLimits: {
    maxSizeBytes: number;
    maxSizeMb: number;
    acceptedExtensions: string[];
    acceptedMimeTypes: string[];
  };
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
  anoExercicioPadrao: 2026,
  municipio: "Braúnas",
  uf: "MG",
  prefeitura: "Prefeitura Municipal de Braúnas",
  secretaria: "Secretaria Municipal de Saúde",
  orgao: "Coordenação de Vigilância Sanitária",
  departamento: "Departamento de Vigilância em Saúde",
  estadoExtenso: "Estado de Minas Gerais",
  pais: "República Federativa do Brasil",
  endereco: {
    logradouro: "Rua São Vicente",
    numero: "150",
    bairro: "Centro",
    cidade: "Braúnas",
    uf: "MG",
    cep: "35169-000",
    telefone: "(33) 3296-1200",
    email: "vigilancia.sanitaria@braunas.mg.gov.br",
    atendimento: "Segunda a Sexta, das 08h às 17h",
  },
  normas: {
    alvaraValidadeDiasPadrao: 365,
    notificacaoPrazoDiasPadrao: 30,
    rdcAnvisa: "RDC ANVISA nº 153/2017",
    resolucaoSesMg: "Resolução SES/MG nº 7.730/2021",
    inAnvisa: "Instrução Normativa ANVISA nº 66/2020",
    leiOrganicaSaude: "Lei Federal nº 8.080/1990",
    leiDefesaUsuario: "Lei Federal nº 13.460/2017",
  },
  uploadLimits: {
    maxSizeBytes: 10 * 1024 * 1024, // 10 MB
    maxSizeMb: 10,
    acceptedExtensions: [".pdf", ".jpg", ".jpeg", ".png", ".webp"],
    acceptedMimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
  },
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
