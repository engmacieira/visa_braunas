/**
 * Tipagens e Contratos de Autenticação e Sessão do VigiMinas
 */

export type PerfilUsuario =
  | "admin_master"
  | "coordenador"
  | "fiscal_tecnico"
  | "digitador";

export interface UsuarioSessao {
  id: string;
  email: string;
  perfil: PerfilUsuario;
  nome_completo: string;
  cpf: string;
  matricula?: string | null;
  cargo: string;
  portaria_nomeacao?: string | null;
  telefone_contato?: string | null;
  url_assinatura_rubrica?: string | null;
  ultimo_login?: string | null;
  is_active: boolean;
  criado_em?: string;
  atualizado_em?: string;
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  usuario_id: string;
  perfil: PerfilUsuario;
  nome_completo: string;
}

export interface ApiErrorDetail {
  detail?: string | Array<{ msg: string; loc?: string[] }>;
  message?: string;
}
