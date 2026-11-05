/**
 * Contratos de API TypeScript para o Sistema VigiMinas
 * Espelho rigoroso dos DTOs Pydantic v2 da API FastAPI
 */

// =============================================================================
// 1. AUTENTICAÇÃO E USUÁRIOS
// =============================================================================
export type PerfilUsuario = "admin_master" | "coordenador" | "fiscal_tecnico" | "digitador";

export interface LoginInputDTO {
  email_ou_matricula: string;
  senha: string;
}

export interface TokenResponseDTO {
  access_token: string;
  token_type: string;
  expires_in_minutes: number;
  usuario: UsuarioOutputDTO;
}

export interface UsuarioOutputDTO {
  id: string;
  nome_completo: string;
  email: string;
  cpf: string;
  matricula: string;
  perfil: PerfilUsuario;
  cargo: string;
  portaria_designacao?: string | null;
  assinatura_digital_url?: string | null;
  is_active: boolean;
  criado_em: string;
}

// =============================================================================
// 2. CNAES E ESTABELECIMENTOS
// =============================================================================
export type NivelRiscoCNAE = "Dispensado" | "Risco I" | "Risco II" | "Risco III";
export type NivelRiscoSanitario = "Dispensado" | "Risco I" | "Risco II" | "Risco III";
export type CompetenciaFiscalizacao = "Municipal" | "Estadual" | "Pactuado";
export type SituacaoCadastral = "Ativo" | "Inativo" | "Suspenso";
export type SituacaoAlvara = "Válido" | "Vencido" | "Não Possui (Irregular)";

export interface CnaeDTO {
  id: string;
  codigo: string;
  descricao: string;
  grau_risco_padrao: NivelRiscoCNAE;
  competencia_padrao: CompetenciaFiscalizacao;
  exige_rt: boolean;
  exige_projeto_arquitetonico: boolean;
}

export interface EstabelecimentoCnaeItemDTO {
  cnae_id: string;
  codigo: string;
  descricao: string;
  eh_principal: boolean;
  data_inicio_atividade?: string | null;
}

export interface EstabelecimentoOutputDTO {
  id: string;
  tipo_cadastro: "PF" | "PJ";
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string | null;
  inscricao_municipal?: string | null;
  natureza_juridica?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio: string;
  uf: string;
  telefone_fixo?: string | null;
  telefone_celular?: string | null;
  email?: string | null;
  nivel_risco: NivelRiscoSanitario;
  competencia_fiscalizacao: CompetenciaFiscalizacao;
  situacao_estabelecimento: SituacaoCadastral;
  situacao_alvara: SituacaoAlvara;
  numero_alvara?: string | null;
  data_validade_alvara?: string | null;
  cnaes: EstabelecimentoCnaeItemDTO[];
  criado_em: string;
}

export interface CadastrarEstabelecimentoInputDTO {
  tipo_cadastro: "PF" | "PJ";
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string | null;
  inscricao_municipal?: string | null;
  natureza_juridica?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string;
  uf?: string;
  telefone_fixo?: string | null;
  telefone_celular?: string | null;
  email?: string | null;
  cnaes: { cnae_id: string; eh_principal: boolean; data_inicio_atividade?: string | null }[];
}

// =============================================================================
// 3. FISCALIZAÇÃO E INSPEÇÕES
// =============================================================================
export type TipoMotivoInspecao =
  | "requerimento_alvara"
  | "rotina_programada"
  | "denuncia"
  | "reinspecao"
  | "vapt_trabalhador"
  | "investigacao_surto";

export type StatusInspecao = "agendada" | "em_andamento" | "concluida" | "cancelada";

export type ResultadoInspecao =
  | "aprovado"
  | "aprovado_com_exigencias"
  | "notificado_com_prazo"
  | "auto_infracao"
  | "interditado_parcialmente"
  | "interditado_totalmente"
  | "indeferido";

export interface AgendarInspecaoInputDTO {
  estabelecimento_id: string;
  motivo: TipoMotivoInspecao;
  data_inicio: string;
  data_agendamento?: string | null;
  hora_inspecao?: string | null;
  fiscais_acompanhantes?: string | null;
  requerimento_id?: string | null;
  denuncia_id?: string | null;
  eh_trabalhador_vapt?: boolean;
}

export interface ConcluirInspecaoInputDTO {
  resultado: ResultadoInspecao;
  laudo_tecnico: string;
  nome_pessoa_acompanhou?: string | null;
  prazo_notificacao_dias?: number | null;
  exigencias_notificacao?: string | null;
  motivo_interdicao?: string | null;
  dados_vapt_especificos?: Record<string, unknown> | null;
}

export interface InspecaoOutputDTO {
  id: string;
  numero_termo: string;
  motivo: TipoMotivoInspecao;
  status: StatusInspecao;
  estabelecimento_id: string;
  fiscal_responsavel_id: string;
  data_inicio: string;
  data_fim?: string | null;
  resultado?: ResultadoInspecao | null;
  laudo_tecnico?: string | null;
  eh_trabalhador_vapt: boolean;
  criado_em: string;
}

// =============================================================================
// 4. LICENCIAMENTO SANITÁRIO E ALVARÁS
// =============================================================================
export type TipoSolicitacaoAlvara = "concessao_inicial" | "renovacao";
export type StatusRequerimento =
  | "pendente"
  | "em_analise"
  | "aguardando_inspecao"
  | "aguardando_adequacao"
  | "deferido"
  | "indeferido"
  | "cancelado";
export type StatusAlvara = "ativo" | "vencido" | "suspenso" | "revogado" | "cassado";

export interface RequerimentoDadosDeclaradosDTO {
  cpf_cnpj: string;
  razao_social: string;
  tipo_cadastro?: string | null;
  nome_fantasia?: string | null;
  inscricao_municipal?: string | null;
  natureza_juridica?: string | null;
  telefone_fixo?: string | null;
  telefone_celular?: string | null;
  email_comercial?: string | null;
  cep?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cnae_principal_selecionado?: string | null;
  cnae_principal_descricao?: string | null;
  dias_horario_funcionamento?: string | null;
  num_funcionarios_manipuladores?: number;
  fonte_abastecimento_agua?: string | null;
  rep_nome?: string | null;
  rep_cpf?: string | null;
  rep_celular?: string | null;
  exige_rt?: string | null;
  rt_nome?: string | null;
  rt_cpf?: string | null;
}

export interface SubmeterRequerimentoInputDTO {
  estabelecimento_id: string;
  tipo_solicitacao: TipoSolicitacaoAlvara;
  alvara_anterior_numero?: string | null;
  alvara_anterior_exercicio?: number | null;
  dados: RequerimentoDadosDeclaradosDTO;
}

export interface RequerimentoOutputDTO {
  id: string;
  numero_protocolo: string;
  estabelecimento_id: string;
  tipo_solicitacao: TipoSolicitacaoAlvara;
  status: StatusRequerimento;
  data_submissao: string;
  analisado_por?: string | null;
  parecer_fiscal?: string | null;
  dados_declarados?: RequerimentoDadosDeclaradosDTO | null;
  criado_em: string;
}

export interface AnalisarRequerimentoInputDTO {
  acao: "iniciar_analise" | "encaminhar_inspecao" | "solicitar_adequacao" | "deferir" | "indeferir" | "cancelar";
  parecer_ou_motivo?: string | null;
}

export interface PaginatedRequerimentosOutputDTO {
  total: number;
  skip: number;
  limit: number;
  items: RequerimentoOutputDTO[];
}

export interface EmitirAlvaraSanitarioInputDTO {
  estabelecimento_id: string;
  requerimento_id?: string | null;
  inspecao_conclusiva_id?: string | null;
  validade_meses?: number;
  condicionantes_restricoes?: string | null;
  url_alvara_pdf?: string | null;
}

export interface AlvaraSanitarioOutputDTO {
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
}

export interface PaginatedAlvarasOutputDTO {
  total: number;
  skip: number;
  limit: number;
  items: AlvaraSanitarioOutputDTO[];
}

// =============================================================================
// 5. OUVIDORIA E DENÚNCIAS
// =============================================================================
export type CanalDenuncia = "formulario_web" | "presencial" | "telefone" | "ouvidoria_geral" | "oficio_ministerio";
export type StatusDenuncia = "recebida" | "em_analise" | "em_apuracao_fiscal" | "procedente" | "improcedente" | "arquivada";
export type GravidadeDenuncia = "baixa" | "media" | "alta" | "urgente";

export interface RegistrarDenunciaInputDTO {
  local_denunciado_identificacao: string;
  relato_denuncia: string;
  origem?: CanalDenuncia;
  gravidade?: GravidadeDenuncia;
  estabelecimento_id?: string | null;
  logradouro?: string | null;
  bairro?: string | null;
  denunciante_anonimo?: boolean;
  denunciante_nome?: string | null;
  denunciante_telefone?: string | null;
  denunciante_email?: string | null;
}

export interface DenunciaOutputDTO {
  id: string;
  numero_protocolo: string;
  data_recebimento: string;
  origem: CanalDenuncia;
  gravidade: GravidadeDenuncia;
  status: StatusDenuncia;
  local_denunciado_identificacao: string;
  relato_denuncia: string;
  denunciante_anonimo: boolean;
  fiscal_designado_id?: string | null;
  despacho_coordenacao?: string | null;
  conclusao_apuracao?: string | null;
  resposta_ao_denunciante?: string | null;
}

export interface DespacharDenunciaInputDTO {
  fiscal_designado_id?: string | null;
  despacho_coordenacao: string;
  nova_gravidade?: GravidadeDenuncia;
  iniciar_apuracao?: boolean;
}

export interface ConcluirDenunciaInputDTO {
  status: StatusDenuncia;
  conclusao_apuracao: string;
  resposta_ao_denunciante?: string | null;
}

export interface DenunciaPublicaOutputDTO {
  numero_protocolo: string;
  data_recebimento: string;
  status: StatusDenuncia;
  gravidade: GravidadeDenuncia;
  local_denunciado_identificacao: string;
  resposta_ao_denunciante?: string | null;
  data_encerramento?: string | null;
}

export interface FilaTrabalhoDenunciaOutputDTO {
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

export interface PaginatedDenunciasOutputDTO {
  total: number;
  skip: number;
  limit: number;
  items: DenunciaOutputDTO[];
}

// =============================================================================
// 6. INDICADORES SANITÁRIOS E RELATÓRIOS OFICIAIS (CQRS)
// =============================================================================
export interface ProgressoMetaDTO {
  meta_pactuada: number;
  realizado: number;
  percentual_atingido: number;
  status: "Atingida" | "Em Andamento" | "Crítica";
}

export interface IndicadorItemDTO {
  codigo: string;
  titulo: string;
  descricao: string;
  unidade: string;
  progresso: ProgressoMetaDTO;
}

export interface DashboardMetasConsolidadoDTO {
  ano_exercicio: number;
  indicador_11_vapt: IndicadorItemDTO;
  indicador_12_risco_3: IndicadorItemDTO;
  indicador_13_risco_2: IndicadorItemDTO;
  indicador_14_risco_1: IndicadorItemDTO;
  indicador_15_sintetico: IndicadorItemDTO;
  total_estabelecimentos_cadastrados: number;
  distribuicao_estabelecimentos_por_risco: Record<string, number>;
  total_inspecoes_exercicio: number;
  total_alvaras_ativos: number;
  atualizado_em: string;
}

export interface RelatorioIndicador11DetalhadoDTO {
  ano_exercicio: number;
  meta_pactuada: number;
  total_acoes_realizadas: number;
  acoes_concluidas: number;
  acoes_em_andamento: number;
  estabelecimentos_distintos_atendidos: number;
  percentual_atingido: number;
  status_cumprimento: string;
  historico_exercicios: Record<string, unknown>[];
}

export interface ItemEstabelecimentoCoberturaDTO {
  id: string;
  cnpj_cpf: string;
  razao_social: string;
  nome_fantasia?: string | null;
  grau_risco: string;
  fiscalizado_no_exercicio: boolean;
  data_ultima_inspecao?: string | null;
  resultado_ultima_inspecao?: string | null;
  situacao_alvara: string;
  numero_alvara?: string | null;
}

export interface RelatorioRiscoCoberturaDTO {
  ano_exercicio: number;
  grau_risco: string;
  total_estabelecimentos_cadastrados: number;
  total_estabelecimentos_fiscalizados: number;
  percentual_cobertura_realizado: number;
  meta_cobertura_pactuada: number;
  status_cobertura: string;
  estabelecimentos: ItemEstabelecimentoCoberturaDTO[];
}

export interface PainelAlertasVencimentoDTO {
  total_notificacoes_criticas: number;
  total_documentos_vencendo: number;
  notificacoes: {
    inspecao_id: string;
    numero_termo: string;
    estabelecimento_id: string;
    razao_social: string;
    cnpj_cpf: string;
    fiscal_responsavel: string;
    data_inicio: string;
    data_limite_cumprimento: string;
    dias_restantes: number;
    urgencia_vencimento: string;
  }[];
  documentos: {
    documento_id: string;
    estabelecimento_id: string;
    razao_social: string;
    nome_documento: string;
    categoria: string;
    data_vencimento: string;
    dias_para_vencimento: number;
    status_vigencia: string;
  }[];
}

export interface RelatorioOficialExercicioDTO {
  municipio: string;
  uf: string;
  nome_prefeitura: string;
  nome_secretaria: string;
  nome_coordenadoria: string;
  ano_exercicio: number;
  data_emissao_relatorio: string;
  indicadores_sintese: IndicadorItemDTO[];
  resumo_geral: Record<string, unknown>;
}

export interface PaginatedResult<T> {
  total: number;
  skip: number;
  limit: number;
  items: T[];
}
