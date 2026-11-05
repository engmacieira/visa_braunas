/**
 * Serviço de Integração Frontend VigiMinas
 * Substitui integralmente os métodos legados do Firestore por chamadas REST à API FastAPI
 */

import {
  AgendarInspecaoInputDTO,
  AlvaraSanitarioOutputDTO,
  AnalisarRequerimentoInputDTO,
  CadastrarEstabelecimentoInputDTO,
  CnaeDTO,
  ConcluirDenunciaInputDTO,
  ConcluirInspecaoInputDTO,
  DashboardMetasConsolidadoDTO,
  DenunciaOutputDTO,
  DenunciaPublicaOutputDTO,
  DespacharDenunciaInputDTO,
  EmitirAlvaraSanitarioInputDTO,
  EstabelecimentoOutputDTO,
  FilaTrabalhoDenunciaOutputDTO,
  InspecaoOutputDTO,
  LoginInputDTO,
  PaginatedAlvarasOutputDTO,
  PaginatedDenunciasOutputDTO,
  PaginatedRequerimentosOutputDTO,
  PaginatedResult,
  PainelAlertasVencimentoDTO,
  RegistrarDenunciaInputDTO,
  RelatorioIndicador11DetalhadoDTO,
  RelatorioOficialExercicioDTO,
  RelatorioRiscoCoberturaDTO,
  RequerimentoOutputDTO,
  SubmeterRequerimentoInputDTO,
  TokenResponseDTO,
  UsuarioOutputDTO,
} from "../types/apiContracts";
import { apiClient } from "./apiClient";

export const vigiminasApi = {
  // ===========================================================================
  // 1. AUTENTICAÇÃO E SESSÃO
  // ===========================================================================
  async login(credenciais: LoginInputDTO): Promise<TokenResponseDTO> {
    const data = await apiClient.post<TokenResponseDTO>("/auth/login", credenciais);
    if (data.access_token) {
      apiClient.setToken(data.access_token);
      localStorage.setItem("vigiminas_user", JSON.stringify(data.usuario));
    }
    return data;
  },

  logout(): void {
    apiClient.clearToken();
  },

  async obterPerfilAtual(): Promise<UsuarioOutputDTO> {
    return apiClient.get<UsuarioOutputDTO>("/auth/me");
  },

  // ===========================================================================
  // 2. ESTABELECIMENTOS E CNAES
  // ===========================================================================
  async listarEstabelecimentos(params?: {
    skip?: number;
    limit?: number;
    termo?: string;
    nivel_risco?: string;
  }): Promise<PaginatedResult<EstabelecimentoOutputDTO>> {
    return apiClient.get<PaginatedResult<EstabelecimentoOutputDTO>>("/estabelecimentos", params);
  },

  async obterEstabelecimento(id: string): Promise<EstabelecimentoOutputDTO> {
    return apiClient.get<EstabelecimentoOutputDTO>(`/estabelecimentos/${id}`);
  },

  async cadastrarEstabelecimento(input: CadastrarEstabelecimentoInputDTO): Promise<EstabelecimentoOutputDTO> {
    return apiClient.post<EstabelecimentoOutputDTO>("/estabelecimentos", input);
  },

  async listarCnaes(params?: {
    skip?: number;
    limit?: number;
    termo?: string;
    grau_risco?: string;
  }): Promise<PaginatedResult<CnaeDTO>> {
    return apiClient.get<PaginatedResult<CnaeDTO>>("/cnaes", params);
  },

  // ===========================================================================
  // 3. FISCALIZAÇÃO E INSPEÇÕES SANITÁRIAS
  // ===========================================================================
  async listarInspecoes(params?: {
    skip?: number;
    limit?: number;
    estabelecimento_id?: string;
    status?: string;
    motivo?: string;
  }): Promise<PaginatedResult<InspecaoOutputDTO>> {
    return apiClient.get<PaginatedResult<InspecaoOutputDTO>>("/inspecoes", params);
  },

  async obterInspecao(id: string): Promise<InspecaoOutputDTO> {
    return apiClient.get<InspecaoOutputDTO>(`/inspecoes/${id}`);
  },

  async agendarInspecao(input: AgendarInspecaoInputDTO): Promise<InspecaoOutputDTO> {
    return apiClient.post<InspecaoOutputDTO>("/inspecoes", input);
  },

  async concluirInspecao(id: string, input: ConcluirInspecaoInputDTO): Promise<InspecaoOutputDTO> {
    return apiClient.patch<InspecaoOutputDTO>(`/inspecoes/${id}/concluir`, input);
  },

  // ===========================================================================
  // 4. LICENCIAMENTO SANITÁRIO E ALVARÁS
  // ===========================================================================
  async submeterRequerimento(input: SubmeterRequerimentoInputDTO): Promise<RequerimentoOutputDTO> {
    return apiClient.post<RequerimentoOutputDTO>("/requerimentos", input);
  },

  async listarRequerimentos(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    estabelecimento_id?: string;
    apenas_fila?: boolean;
  }): Promise<PaginatedRequerimentosOutputDTO> {
    return apiClient.get<PaginatedRequerimentosOutputDTO>("/requerimentos", params);
  },

  async obterRequerimento(id: string): Promise<RequerimentoOutputDTO> {
    return apiClient.get<RequerimentoOutputDTO>(`/requerimentos/${id}`);
  },

  async analisarRequerimento(id: string, input: AnalisarRequerimentoInputDTO): Promise<RequerimentoOutputDTO> {
    return apiClient.patch<RequerimentoOutputDTO>(`/requerimentos/${id}/analisar`, input);
  },

  async emitirAlvara(input: EmitirAlvaraSanitarioInputDTO): Promise<AlvaraSanitarioOutputDTO> {
    return apiClient.post<AlvaraSanitarioOutputDTO>("/alvaras/emitir", input);
  },

  async listarAlvaras(params?: {
    skip?: number;
    limit?: number;
    estabelecimento_id?: string;
    exercicio?: number;
    status?: string;
  }): Promise<PaginatedAlvarasOutputDTO> {
    return apiClient.get<PaginatedAlvarasOutputDTO>("/alvaras", params);
  },

  async obterAlvara(id: string): Promise<AlvaraSanitarioOutputDTO> {
    return apiClient.get<AlvaraSanitarioOutputDTO>(`/alvaras/${id}`);
  },

  async validarAlvaraPublico(codigoAutenticidade: string): Promise<AlvaraSanitarioOutputDTO> {
    return apiClient.get<AlvaraSanitarioOutputDTO>(`/alvaras/validar/${codigoAutenticidade}`);
  },

  // ===========================================================================
  // 5. OUVIDORIA E DENÚNCIAS
  // ===========================================================================
  async registrarDenuncia(input: RegistrarDenunciaInputDTO): Promise<DenunciaOutputDTO> {
    return apiClient.post<DenunciaOutputDTO>("/denuncias", input);
  },

  async consultarDenunciaPublica(numeroProtocolo: string): Promise<DenunciaPublicaOutputDTO> {
    return apiClient.get<DenunciaPublicaOutputDTO>(`/denuncias/consultar/${numeroProtocolo}`);
  },

  async listarFilaTrabalhoDenuncias(params?: {
    skip?: number;
    limit?: number;
  }): Promise<FilaTrabalhoDenunciaOutputDTO[]> {
    return apiClient.get<FilaTrabalhoDenunciaOutputDTO[]>("/denuncias/fila-trabalho", params);
  },

  async listarDenuncias(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    gravidade?: string;
    fiscal_id?: string;
  }): Promise<PaginatedDenunciasOutputDTO> {
    return apiClient.get<PaginatedDenunciasOutputDTO>("/denuncias", params);
  },

  async obterDenuncia(id: string): Promise<DenunciaOutputDTO> {
    return apiClient.get<DenunciaOutputDTO>(`/denuncias/${id}`);
  },

  async despacharDenuncia(id: string, input: DespacharDenunciaInputDTO): Promise<DenunciaOutputDTO> {
    return apiClient.patch<DenunciaOutputDTO>(`/denuncias/${id}/despacho`, input);
  },

  async concluirDenuncia(id: string, input: ConcluirDenunciaInputDTO): Promise<DenunciaOutputDTO> {
    return apiClient.patch<DenunciaOutputDTO>(`/denuncias/${id}/concluir`, input);
  },

  // ===========================================================================
  // 6. INDICADORES SANITÁRIOS E RELATÓRIOS OFICIAIS (CQRS)
  // ===========================================================================
  async obterDashboardIndicadores(ano?: number): Promise<DashboardMetasConsolidadoDTO> {
    return apiClient.get<DashboardMetasConsolidadoDTO>("/indicadores/dashboard", { ano });
  },

  async obterRelatorioIndicador11(ano?: number): Promise<RelatorioIndicador11DetalhadoDTO> {
    return apiClient.get<RelatorioIndicador11DetalhadoDTO>("/indicadores/vapt-11", { ano });
  },

  async obterCoberturaPorRisco(grauRisco: string, params?: {
    ano?: number;
    apenas_pendentes?: boolean;
  }): Promise<RelatorioRiscoCoberturaDTO> {
    return apiClient.get<RelatorioRiscoCoberturaDTO>(`/indicadores/cobertura-risco/${grauRisco}`, params);
  },

  async obterPainelAlertas(limiteDias = 30): Promise<PainelAlertasVencimentoDTO> {
    return apiClient.get<PainelAlertasVencimentoDTO>("/indicadores/alertas", { limite_dias: limiteDias });
  },

  async gerarRelatorioOficial(ano?: number): Promise<RelatorioOficialExercicioDTO> {
    return apiClient.get<RelatorioOficialExercicioDTO>("/indicadores/relatorio-oficial", { ano });
  },
};
