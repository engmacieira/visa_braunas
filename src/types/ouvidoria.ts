/**
 * Tipagens e Contratos para o Módulo de Ouvidoria Sanitária e Denúncias
 * Alinhado estritamente com os esquemas Pydantic v2 e Enums do Backend FastAPI.
 */

export type GravidadeDenuncia = "baixa" | "media" | "alta" | "urgente";

export type StatusDenuncia =
  | "recebida"
  | "em_analise"
  | "em_apuracao_fiscal"
  | "procedente"
  | "improcedente"
  | "arquivada"
  // Aliases compatíveis com telas operacionais
  | "em_triagem"
  | "despachada_inspecao"
  | "arquivada_improcedente"
  | "concluida";

export type CanalDenuncia =
  | "formulario_web"
  | "presencial"
  | "telefone"
  | "ouvidoria_geral"
  | "oficio_ministerio"
  // Aliases
  | "email"
  | "oficio";

export interface DenunciaAnexo {
  url: string;
  tipo?: string;
  nome?: string;
}

export interface DenunciaListItem {
  id: string;
  numero_protocolo: string;
  data_recebimento: string;
  origem: CanalDenuncia;
  gravidade: GravidadeDenuncia;
  status: StatusDenuncia;
  estabelecimento_id?: string | null;
  local_denunciado_identificacao: string;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  ponto_referencia?: string | null;
  denunciante_anonimo: boolean;
  denunciante_nome?: string | null;
  denunciante_telefone?: string | null;
  denunciante_email?: string | null;
  url_anexos_evidencias: DenunciaAnexo[];
  fiscal_designado_id?: string | null;
  despacho_coordenacao?: string | null;
  conclusao_apuracao?: string | null;
  resposta_ao_denunciante?: string | null;
  data_encerramento?: string | null;
  finalizado_por?: string | null;
  criado_em: string;
}

export interface DenunciaDetalhe extends DenunciaListItem {
  relato_denuncia?: string | null;
  estabelecimento?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj_cpf: string;
    logradouro: string;
    numero: string;
    bairro: string;
  } | null;
}

export interface FilaTrabalhoDenuncia {
  id: string;
  numero_protocolo: string;
  data_recebimento: string;
  gravidade: string;
  status: string;
  local_denunciado_identificacao: string;
  bairro?: string | null;
  estabelecimento_cadastrado?: string | null;
  fiscal_designado?: string | null;
  dias_em_aberto: number;
}

export interface PaginatedDenuncias {
  total: number;
  skip: number;
  limit: number;
  items: DenunciaListItem[];
}

export interface DenunciaFilters {
  skip?: number;
  limit?: number;
  status?: StatusDenuncia | "";
  gravidade?: GravidadeDenuncia | "";
  fiscal_id?: string;
  estabelecimento_id?: string;
  busca?: string;
  apenas_abertas?: boolean;
}

export interface RegistrarDenunciaDTO {
  local_denunciado_identificacao: string;
  relato_denuncia: string;
  origem?: CanalDenuncia;
  gravidade?: GravidadeDenuncia;
  estabelecimento_id?: string | null;

  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  ponto_referencia?: string | null;

  denunciante_anonimo: boolean;
  denunciante_nome?: string | null;
  denunciante_telefone?: string | null;
  denunciante_email?: string | null;

  url_anexos_evidencias?: DenunciaAnexo[];
}

export interface DespacharDenunciaDTO {
  fiscal_designado_id?: string | null;
  despacho_coordenacao: string;
  nova_gravidade?: GravidadeDenuncia | null;
  iniciar_apuracao?: boolean;
}

export interface ConcluirDenunciaDTO {
  status: StatusDenuncia;
  conclusao_apuracao: string;
  resposta_ao_denunciante?: string | null;
}

export interface DenunciaPublicaConsulta {
  numero_protocolo: string;
  data_recebimento: string;
  status: StatusDenuncia;
  gravidade: GravidadeDenuncia;
  local_denunciado_identificacao: string;
  resposta_ao_denunciante?: string | null;
  data_encerramento?: string | null;
}
