/**
 * Tipagens e Contratos para o Módulo de Licenciamento Sanitário e Alvarás
 * Alinhado estritamente com os esquemas Pydantic v2 e Enums do Backend FastAPI.
 */

import { NivelRisco } from "./estabelecimento";

export type TipoSolicitacaoAlvara = "concessao_inicial" | "renovacao";

export type StatusRequerimento =
  | "pendente"
  | "em_analise"
  | "aguardando_inspecao"
  | "aguardando_adequacao"
  | "deferido"
  | "indeferido"
  | "cancelado";

export type StatusAlvara =
  | "ativo"
  | "vencido"
  | "suspenso"
  | "revogado"
  | "cassado";

export interface RequerimentoDadosDeclarados {
  tipo_cadastro?: string | null;
  cpf_cnpj: string;
  razao_social: string;
  nome_fantasia?: string | null;
  inscricao_municipal?: string | null;
  natureza_juridica?: string | null;

  telefone_fixo?: string | null;
  telefone_celular?: string | null;
  email_comercial?: string | null;

  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  ponto_referencia?: string | null;
  acesso_compartilhado_residencia?: string | null;

  cnae_principal_selecionado?: string | null;
  cnae_principal_codigo_manual?: string | null;
  cnae_principal_descricao?: string | null;
  cnaes_secundarios_declarados?: string | null;
  atividades_auxiliares?: string | null;

  projeto_arquitetonico_aprovado?: string | null;
  numero_processo_projeto_sei?: string | null;
  afe_anvisa?: string | null;
  ae_anvisa?: string | null;

  dias_horario_funcionamento?: string | null;
  num_funcionarios_manipuladores?: number;
  fonte_abastecimento_agua?: string | null;
  possui_caixa_agua_propria?: string | null;
  capacidade_caixa_agua_litros?: number;
  data_ultima_limpeza_caixa_agua?: string | null;
  possui_coleta_rss?: string | null;
  possui_raio_x?: string | null;

  rep_nome?: string | null;
  rep_cpf?: string | null;
  rep_rg?: string | null;
  rep_orgao_uf?: string | null;
  rep_celular?: string | null;
  rep_email?: string | null;
  rep_endereco_residencial?: string | null;

  exige_rt?: string | null;
  rt_proprio_representante?: string | null;
  rt_nome?: string | null;
  rt_cpf?: string | null;
  rt_conselho_classe?: string | null;
  rt_numero_conselho?: string | null;
  rt_conselho_uf?: string | null;
  rt_carga_horaria?: string | null;
  rt_telefone?: string | null;
  rt_email?: string | null;
  possui_rt_substituto?: string | null;
  rt_substituto_dados?: string | null;

  relacao_documentos_declarados?: string | null;
  link_drive_documentos?: string | null;
  declaracao_veracidade_texto?: string | null;
  preenchedor_nome?: string | null;
  preenchedor_vinculo?: string | null;
  preenchedor_telefone?: string | null;
}

export interface RequerimentoListItem {
  id: string;
  numero_protocolo: string;
  estabelecimento_id: string;
  tipo_solicitacao: TipoSolicitacaoAlvara;
  status: StatusRequerimento;
  alvara_anterior_numero?: string | null;
  alvara_anterior_exercicio?: number | null;
  data_submissao: string;
  origem_solicitacao: string;
  analisado_por?: string | null;
  data_inicio_analise?: string | null;
  data_conclusao?: string | null;
  parecer_fiscal?: string | null;
  motivo_indeferimento?: string | null;
  dados_declarados?: RequerimentoDadosDeclarados | null;
  criado_em: string;
}

export interface RequerimentoDetalhe extends RequerimentoListItem {
  estabelecimento?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj_cpf: string;
    nivel_risco: NivelRisco;
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    municipio: string;
    uf: string;
    cep?: string | null;
  } | null;
}

export interface PaginatedRequerimentos {
  total: number;
  skip: number;
  limit: number;
  items: RequerimentoListItem[];
}

export interface RequerimentoFilters {
  skip?: number;
  limit?: number;
  status?: StatusRequerimento | "";
  estabelecimento_id?: string;
  apenas_fila?: boolean;
  busca?: string;
}

export interface AnalisarRequerimentoDTO {
  acao:
    | "iniciar_analise"
    | "encaminhar_inspecao"
    | "solicitar_adequacao"
    | "deferir"
    | "indeferir"
    | "cancelar";
  parecer_ou_motivo?: string;
}

export interface NovoRequerimentoDTO {
  estabelecimento_id: string;
  tipo_solicitacao: TipoSolicitacaoAlvara;
  alvara_anterior_numero?: string;
  alvara_anterior_exercicio?: number;
  origem_solicitacao?: string;
  dados: RequerimentoDadosDeclarados;
}

export interface EmitirAlvaraDTO {
  estabelecimento_id: string;
  requerimento_id?: string;
  inspecao_conclusiva_id?: string;
  validade_meses?: number;
  condicionantes_restricoes?: string;
  url_alvara_pdf?: string;
}

export interface AlvaraSanitarioDetalhe {
  id: string;
  numero_alvara: number;
  exercicio: number;
  numero_formatado: string;
  estabelecimento_id: string;
  requerimento_id?: string | null;
  inspecao_conclusiva_id?: string | null;
  codigo_autenticidade: string;
  data_emissao: string;
  data_vencimento: string;
  status: StatusAlvara;
  emitido_por: string;
  condicionantes_restricoes?: string | null;
  url_alvara_pdf?: string | null;
  criado_em: string;

  // Dados enriquecidos para o layout oficial de impressão
  estabelecimento?: {
    id: string;
    razao_social: string;
    nome_fantasia?: string | null;
    cnpj_cpf: string;
    inscricao_municipal?: string | null;
    logradouro: string;
    numero: string;
    complemento?: string | null;
    bairro: string;
    municipio: string;
    uf: string;
    cep: string;
    nivel_risco: NivelRisco;
    cnaes?: Array<{
      cnae_codigo: string;
      eh_principal: boolean;
      cnae?: {
        codigo: string;
        descricao: string;
        grau_risco_padrao: NivelRisco;
      } | null;
    }>;
    representante_legal?: {
      nome_completo: string;
      cpf: string;
    } | null;
    responsaveis_tecnicos?: Array<{
      eh_substituto: boolean;
      responsavel_tecnico?: {
        nome_completo: string;
        cpf: string;
        conselho_classe: string;
        numero_registro_conselho: string;
        uf_conselho: string;
      } | null;
    }>;
  } | null;
}

export interface PaginatedAlvaras {
  total: number;
  skip: number;
  limit: number;
  items: AlvaraSanitarioDetalhe[];
}

export interface AlvaraFilters {
  skip?: number;
  limit?: number;
  estabelecimento_id?: string;
  exercicio?: number;
  status?: StatusAlvara | "";
}

export interface ValidacaoAlvaraPublicoResponse extends AlvaraSanitarioDetalhe {
  valido: boolean;
  motivo_status?: string;
  dias_restantes_validade?: number;
}
