/**
 * Tipagens e Contratos DTO para o Módulo de Estabelecimentos e CNAEs
 * Alinhado estritamente com os esquemas Pydantic v2 do Backend FastAPI.
 */

export type NivelRisco = "Risco I" | "Risco II" | "Risco III" | "Dispensado";

export type SituacaoCadastral = "Ativo" | "Inativo" | "Suspenso";

export type SituacaoAlvara =
  | "Válido"
  | "Vencido"
  | "Em Análise"
  | "Não Possui (Irregular)"
  | "Cassado";

export type TipoPessoa = "PF" | "PJ";

export type CompetenciaFiscalizacao = "Municipal" | "Estadual" | "Pactuado";

export interface CNAEItem {
  id: string;
  codigo: string;
  descricao: string;
  grau_risco_padrao: NivelRisco;
  competencia_padrao: CompetenciaFiscalizacao;
  exige_rt: boolean;
  exige_projeto_arquitetonico: boolean;
  is_active: boolean;
}

export interface VinculoCNAEDTO {
  id?: string;
  cnae_id?: string;
  cnae_codigo: string;
  eh_principal: boolean;
  data_inicio_atividade?: string | null;
  cnae?: CNAEItem | null;
}

export interface RepresentanteLegalDTO {
  id?: string;
  nome_completo: string;
  cpf: string;
  rg_numero?: string | null;
  rg_orgao_emissor?: string | null;
  telefone: string;
  email: string;
  endereco_residencial: string;
}

export interface ResponsavelTecnicoVinculoDTO {
  id?: string;
  responsavel_tecnico_id: string;
  eh_substituto: boolean;
  carga_horaria_semanal?: string | null;
  horario_permanencia?: string | null;
  numero_art_crt?: string | null;
  data_inicio?: string | null;
  responsavel_tecnico?: {
    id: string;
    nome_completo: string;
    cpf: string;
    conselho_classe: string;
    numero_registro_conselho: string;
    uf_conselho: string;
    telefone?: string | null;
    email?: string | null;
  } | null;
}

export interface EstabelecimentoDetalhe {
  id: string;
  tipo_cadastro: TipoPessoa;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string | null;
  inscricao_municipal?: string | null;
  natureza_juridica?: string | null;

  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  bairro: string;
  municipio: string;
  uf: string;
  ponto_referencia?: string | null;
  acesso_compartilhado_residencia: boolean;

  telefone_fixo?: string | null;
  telefone_celular: string;
  email: string;

  nivel_risco: NivelRisco;
  competencia_fiscalizacao: CompetenciaFiscalizacao;
  situacao_estabelecimento: SituacaoCadastral;
  observacoes_baixa?: string | null;

  horario_funcionamento?: string | null;
  fonte_abastecimento_agua?: string | null;
  possui_reservatorio_proprio: boolean;
  capacidade_reservatorio_litros: number;

  numero_alvara?: string | null;
  data_validade_alvara?: string | null;
  situacao_alvara: SituacaoAlvara;

  representante_legal?: RepresentanteLegalDTO | null;
  cnaes: VinculoCNAEDTO[];
  responsaveis_tecnicos?: ResponsavelTecnicoVinculoDTO[];

  is_active: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface EstabelecimentoListItem extends EstabelecimentoDetalhe {}

export interface EstabelecimentoListResponse {
  itens: EstabelecimentoDetalhe[];
  total: number;
  skip: number;
  limit: number;
}

export interface EstabelecimentoFilters {
  busca?: string;
  risco?: NivelRisco | "";
  situacao?: SituacaoCadastral | "";
  skip?: number;
  limit?: number;
  only_active?: boolean;
  order_by?: string;
  order_direction?: "asc" | "desc";
}

export interface EstabelecimentoFormValues {
  tipo_cadastro: TipoPessoa;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string;
  inscricao_municipal?: string;
  natureza_juridica?: string;

  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  ponto_referencia?: string;
  acesso_compartilhado_residencia: boolean;

  telefone_fixo?: string;
  telefone_celular: string;
  email: string;

  competencia_fiscalizacao: CompetenciaFiscalizacao;
  horario_funcionamento?: string;
  fonte_abastecimento_agua?: string;
  possui_reservatorio_proprio: boolean;
  capacidade_reservatorio_litros: number;

  representante_legal: {
    nome_completo: string;
    cpf: string;
    rg_numero?: string;
    rg_orgao_emissor?: string;
    telefone: string;
    email: string;
    endereco_residencial: string;
  };

  cnaes: Array<{
    cnae_codigo: string;
    descricao?: string;
    grau_risco_padrao?: NivelRisco;
    exige_rt?: boolean;
    eh_principal: boolean;
    data_inicio_atividade?: string;
  }>;
}
