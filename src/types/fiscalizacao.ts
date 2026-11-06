/**
 * Tipagens e Contratos para o Módulo de Fiscalização e Inspeções Sanitárias
 * Alinhado estritamente com os esquemas e enums do Backend FastAPI.
 */

export type TipoMotivoInspecao =
  | "rotina_programada"
  | "requerimento_alvara"
  | "denuncia"
  | "reinspecao"
  | "vapt_trabalhador"
  | "investigacao_surto";

export type StatusInspecao =
  | "agendada"
  | "em_andamento"
  | "concluida"
  | "cancelada";

export type ResultadoInspecao =
  | "aprovado"
  | "aprovado_com_exigencias"
  | "notificado_com_prazo"
  | "auto_infracao"
  | "interditado_parcialmente"
  | "interditado_totalmente"
  | "indeferido";

export interface FotoEvidencia {
  id: string;
  url: string;
  legenda: string;
  data_registro: string;
}

export type StatusItemChecklist = "C" | "NC" | "NA";

export interface ChecklistItemResposta {
  status: StatusItemChecklist;
  observacao?: string;
}

export type ChecklistRespostas = Record<string, ChecklistItemResposta>;

export interface InspecaoDetalhe {
  id: string;
  numero_termo: string;
  motivo: TipoMotivoInspecao;
  status: StatusInspecao;
  estabelecimento_id: string;
  fiscal_responsavel_id: string;

  requerimento_id?: string | null;
  denuncia_id?: string | null;
  fiscais_acompanhantes?: string | null;

  data_agendamento?: string | null;
  data_inicio: string;
  data_fim?: string | null;
  hora_inspecao?: string | null;

  resultado?: ResultadoInspecao | null;
  nome_pessoa_acompanhou?: string | null;
  cpf_pessoa_acompanhou?: string | null;

  relato_vistoria?: string | null;
  irregularidades_constatadas?: string | null;
  exigencias_notificadas?: string | null;
  prazo_adequacao_dias: number;
  data_limite_adequacao?: string | null;

  nome_local_trabalho?: string | null;
  principais_riscos_identificados?: string | null;
  recomendacoes_orientacoes?: string | null;

  checklist_respostas: ChecklistRespostas;
  relatorio_fotografico: FotoEvidencia[];
  url_termo_assinado_pdf?: string | null;

  is_active: boolean;
  criado_em: string;
  atualizado_em: string;
}

export interface InspecaoListItem extends InspecaoDetalhe {}

export interface InspecaoFilters {
  skip?: number;
  limit?: number;
  estabelecimento_id?: string;
  fiscal_id?: string;
  motivo?: TipoMotivoInspecao | "";
  status?: StatusInspecao | "";
  data_inicio_de?: string;
  data_inicio_ate?: string;
  only_active?: boolean;
}

export interface NotificacaoPrazoAlerta {
  inspecao_id: string;
  numero_termo: string;
  estabelecimento_id: string;
  razao_social: string;
  nome_fantasia?: string | null;
  fiscal_responsavel: string;
  data_limite_adequacao: string;
  dias_restantes: number;
}

export interface Indicador11Consolidado {
  exercicio: number;
  total_acoes_vapt: number;
  vapt_concluidas: number;
  vapt_em_acompanhamento: number;
}

export interface AgendarInspecaoFormValues {
  numero_termo: string;
  estabelecimento_id: string;
  fiscal_responsavel_id: string;
  motivo: TipoMotivoInspecao;
  data_inicio: string;
  data_agendamento?: string;
  hora_inspecao?: string;
  fiscais_acompanhantes?: string;
  requerimento_id?: string;
  denuncia_id?: string;

  // Específico para VAPT (Saúde do Trabalhador - Indicador 11)
  nome_local_trabalho?: string;
  principais_riscos_identificados?: string;
  recomendacoes_orientacoes?: string;
}

export interface LaudoConclusaoFormValues {
  resultado: ResultadoInspecao;
  data_fim: string;
  relato_vistoria: string;
  irregularidades_constatadas?: string;
  exigencias_notificadas?: string;
  prazo_adequacao_dias: number;
  data_limite_adequacao?: string;

  nome_pessoa_acompanhou?: string;
  cpf_pessoa_acompanhou?: string;
  checklist_respostas: ChecklistRespostas;
  relatorio_fotografico: FotoEvidencia[];
  url_termo_assinado_pdf?: string;

  // Campos VAPT quando concluído em vistoria de saúde do trabalhador
  nome_local_trabalho?: string;
  principais_riscos_identificados?: string;
  recomendacoes_orientacoes?: string;
}
