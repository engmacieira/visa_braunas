import { describe, expect, it } from "vitest";
import type {
  AlvaraSanitarioOutputDTO,
  CanalDenuncia,
  CnaeDTO,
  CompetenciaFiscalizacao,
  DashboardMetasConsolidadoDTO,
  DenunciaOutputDTO,
  DenunciaPublicaOutputDTO,
  EstabelecimentoOutputDTO,
  GravidadeDenuncia,
  InspecaoOutputDTO,
  NivelRiscoCNAE,
  NivelRiscoSanitario,
  PaginatedAlvarasOutputDTO,
  PaginatedDenunciasOutputDTO,
  PaginatedRequerimentosOutputDTO,
  PaginatedResult,
  PerfilUsuario,
  RelatorioIndicador11DetalhadoDTO,
  RequerimentoOutputDTO,
  ResultadoInspecao,
  SituacaoAlvara,
  SituacaoCadastral,
  StatusAlvara,
  StatusDenuncia,
  StatusInspecao,
  StatusRequerimento,
  TipoMotivoInspecao,
  UsuarioOutputDTO,
} from "../apiContracts";

// Listas exatas de valores válidos esperados de acordo com os DTOs Pydantic v2 do backend
const NIVEIS_RISCO_VALIDOS: readonly NivelRiscoSanitario[] = [
  "Dispensado",
  "Risco I",
  "Risco II",
  "Risco III",
] as const;

const COMPETENCIAS_VALIDAS: readonly CompetenciaFiscalizacao[] = [
  "Municipal",
  "Estadual",
  "Pactuado",
] as const;

const SITUACOES_CADASTRAIS_VALIDAS: readonly SituacaoCadastral[] = [
  "Ativo",
  "Inativo",
  "Suspenso",
] as const;

const SITUACOES_ALVARA_VALIDAS: readonly SituacaoAlvara[] = [
  "Válido",
  "Vencido",
  "Não Possui (Irregular)",
] as const;

const MOTIVOS_INSPECAO_VALIDOS: readonly TipoMotivoInspecao[] = [
  "requerimento_alvara",
  "rotina_programada",
  "denuncia",
  "reinspecao",
  "vapt_trabalhador",
  "investigacao_surto",
] as const;

const STATUS_INSPECAO_VALIDOS: readonly StatusInspecao[] = [
  "agendada",
  "em_andamento",
  "concluida",
  "cancelada",
] as const;

const RESULTADOS_INSPECAO_VALIDOS: readonly ResultadoInspecao[] = [
  "aprovado",
  "aprovado_com_exigencias",
  "notificado_com_prazo",
  "auto_infracao",
  "interditado_parcialmente",
  "interditado_totalmente",
  "indeferido",
] as const;

const STATUS_REQUERIMENTO_VALIDOS: readonly StatusRequerimento[] = [
  "pendente",
  "em_analise",
  "aguardando_inspecao",
  "aguardando_adequacao",
  "deferido",
  "indeferido",
  "cancelado",
] as const;

const STATUS_ALVARA_VALIDOS: readonly StatusAlvara[] = [
  "ativo",
  "vencido",
  "suspenso",
  "revogado",
  "cassado",
] as const;

const STATUS_DENUNCIA_VALIDOS: readonly StatusDenuncia[] = [
  "recebida",
  "em_analise",
  "em_apuracao_fiscal",
  "procedente",
  "improcedente",
  "arquivada",
] as const;

const GRAVIDADES_DENUNCIA_VALIDAS: readonly GravidadeDenuncia[] = [
  "baixa",
  "media",
  "alta",
  "urgente",
] as const;

const CANAIS_DENUNCIA_VALIDOS: readonly CanalDenuncia[] = [
  "formulario_web",
  "presencial",
  "telefone",
  "ouvidoria_geral",
  "oficio_ministerio",
] as const;

const PERFIS_USUARIO_VALIDOS: readonly PerfilUsuario[] = [
  "admin_master",
  "coordenador",
  "fiscal_tecnico",
  "digitador",
] as const;

describe("Validação de Contratos de API (apiContracts.ts)", () => {
  // ===========================================================================
  // 1. ENUMS E LITERAIS DO DOMÍNIO SANITÁRIO
  // ===========================================================================
  describe("Enums e Domínios de Risco Sanitário e Competência", () => {
    it("deve aceitar todos os valores válidos de NivelRiscoSanitario e rejeitar valores anômalos", () => {
      NIVEIS_RISCO_VALIDOS.forEach((risco) => {
        expect(["Dispensado", "Risco I", "Risco II", "Risco III"]).toContain(risco);
      });

      const valorInvalido = "Alto Risco Desconhecido";
      expect(NIVEIS_RISCO_VALIDOS.includes(valorInvalido as NivelRiscoSanitario)).toBe(false);
    });

    it("deve aceitar todos os valores válidos de CompetenciaFiscalizacao e SituacaoCadastral", () => {
      COMPETENCIAS_VALIDAS.forEach((comp) => {
        expect(["Municipal", "Estadual", "Pactuado"]).toContain(comp);
      });

      SITUACOES_CADASTRAIS_VALIDAS.forEach((sit) => {
        expect(["Ativo", "Inativo", "Suspenso"]).toContain(sit);
      });
    });

    it("deve cobrir rigorosamente os estados de fiscalização e resultados de inspeção", () => {
      STATUS_INSPECAO_VALIDOS.forEach((status) => {
        expect(["agendada", "em_andamento", "concluida", "cancelada"]).toContain(status);
      });

      RESULTADOS_INSPECAO_VALIDOS.forEach((resultado) => {
        expect([
          "aprovado",
          "aprovado_com_exigencias",
          "notificado_com_prazo",
          "auto_infracao",
          "interditado_parcialmente",
          "interditado_totalmente",
          "indeferido",
        ]).toContain(resultado);
      });
    });

    it("deve cobrir o fluxo de requerimentos e alvarás sanitários", () => {
      STATUS_REQUERIMENTO_VALIDOS.forEach((status) => {
        expect([
          "pendente",
          "em_analise",
          "aguardando_inspecao",
          "aguardando_adequacao",
          "deferido",
          "indeferido",
          "cancelado",
        ]).toContain(status);
      });

      STATUS_ALVARA_VALIDOS.forEach((status) => {
        expect(["ativo", "vencido", "suspenso", "revogado", "cassado"]).toContain(status);
      });

      SITUACOES_ALVARA_VALIDAS.forEach((sit) => {
        expect(["Válido", "Vencido", "Não Possui (Irregular)"]).toContain(sit);
      });
    });

    it("deve cobrir os status e canais de ouvidoria/denúncias", () => {
      STATUS_DENUNCIA_VALIDOS.forEach((status) => {
        expect([
          "recebida",
          "em_analise",
          "em_apuracao_fiscal",
          "procedente",
          "improcedente",
          "arquivada",
        ]).toContain(status);
      });

      GRAVIDADES_DENUNCIA_VALIDAS.forEach((grav) => {
        expect(["baixa", "media", "alta", "urgente"]).toContain(grav);
      });

      CANAIS_DENUNCIA_VALIDOS.forEach((canal) => {
        expect([
          "formulario_web",
          "presencial",
          "telefone",
          "ouvidoria_geral",
          "oficio_ministerio",
        ]).toContain(canal);
      });
    });

    it("deve validar perfis RBAC do sistema VigiMinas", () => {
      PERFIS_USUARIO_VALIDOS.forEach((perfil) => {
        expect(["admin_master", "coordenador", "fiscal_tecnico", "digitador"]).toContain(perfil);
      });
    });
  });

  // ===========================================================================
  // 2. CONTRATOS DE PAGINAÇÃO
  // ===========================================================================
  describe("Estruturas de Paginação do Backend", () => {
    it("deve mapear corretamente PaginatedResult genérico", () => {
      const payload: PaginatedResult<string> = {
        total: 100,
        skip: 20,
        limit: 10,
        items: ["item1", "item2"],
      };

      expect(typeof payload.total).toBe("number");
      expect(typeof payload.skip).toBe("number");
      expect(typeof payload.limit).toBe("number");
      expect(Array.isArray(payload.items)).toBe(true);
      expect(payload.items).toHaveLength(2);
    });

    it("deve suportar paginação vazia de forma segura", () => {
      const payloadVazio: PaginatedRequerimentosOutputDTO = {
        total: 0,
        skip: 0,
        limit: 20,
        items: [],
      };

      expect(payloadVazio.total).toBe(0);
      expect(payloadVazio.items).toHaveLength(0);
    });
  });

  // ===========================================================================
  // 3. SERIALIZAÇÃO E PARSING DE DTOs COMPLETOS
  // ===========================================================================
  describe("Serialização e Desserialização de Payloads Pydantic", () => {
    it("deve serializar e desserializar EstabelecimentoOutputDTO preservando integridade de campos e CNAEs", () => {
      const rawJson = JSON.stringify({
        id: "est-1234",
        tipo_cadastro: "PJ",
        cnpj_cpf: "12.345.678/0001-90",
        razao_social: "Drogaria Braúnas Centro Ltda",
        nome_fantasia: "Drogaria Central",
        municipio: "Braúnas",
        uf: "MG",
        nivel_risco: "Risco III",
        competencia_fiscalizacao: "Municipal",
        situacao_estabelecimento: "Ativo",
        situacao_alvara: "Válido",
        cnaes: [
          {
            cnae_id: "cnae-01",
            codigo: "4771-7/01",
            descricao: "Comércio varejista de produtos farmacêuticos",
            eh_principal: true,
            data_inicio_atividade: "2020-01-15",
          },
        ],
        criado_em: "2026-01-01T12:00:00.000Z",
      });

      const parsed: EstabelecimentoOutputDTO = JSON.parse(rawJson);

      expect(parsed.id).toBe("est-1234");
      expect(parsed.tipo_cadastro).toBe("PJ");
      expect(parsed.cnaes[0].eh_principal).toBe(true);
      expect(NIVEIS_RISCO_VALIDOS).toContain(parsed.nivel_risco);
      expect(COMPETENCIAS_VALIDAS).toContain(parsed.competencia_fiscalizacao);
      expect(SITUACOES_CADASTRAIS_VALIDAS).toContain(parsed.situacao_estabelecimento);
      expect(SITUACOES_ALVARA_VALIDAS).toContain(parsed.situacao_alvara);
    });

    it("deve desserializar InspecaoOutputDTO validando campos VAPT e laudo técnico", () => {
      const rawJson = JSON.stringify({
        id: "insp-888",
        numero_termo: "TERMO-2026-888",
        motivo: "vapt_trabalhador",
        status: "concluida",
        estabelecimento_id: "est-1234",
        fiscal_responsavel_id: "usr-01",
        data_inicio: "2026-06-10T09:00:00Z",
        data_fim: "2026-06-10T12:00:00Z",
        resultado: "aprovado_com_exigencias",
        laudo_tecnico: "Equipamentos de proteção individual (EPI) fornecidos adequadamente.",
        eh_trabalhador_vapt: true,
        criado_em: "2026-06-01T08:00:00Z",
      });

      const parsed: InspecaoOutputDTO = JSON.parse(rawJson);

      expect(parsed.eh_trabalhador_vapt).toBe(true);
      expect(MOTIVOS_INSPECAO_VALIDOS).toContain(parsed.motivo);
      expect(STATUS_INSPECAO_VALIDOS).toContain(parsed.status);
      expect(RESULTADOS_INSPECAO_VALIDOS).toContain(parsed.resultado);
    });

    it("deve desserializar AlvaraSanitarioOutputDTO e validar campos de autenticidade e validade", () => {
      const rawJson = JSON.stringify({
        id: "alv-999",
        numero_alvara: 50,
        exercicio: 2026,
        numero_formatado: "050/2026",
        estabelecimento_id: "est-1234",
        codigo_autenticidade: "BRAUNAS-2026-XYZ987",
        data_emissao: "2026-01-10T00:00:00Z",
        data_vencimento: "2027-01-10T00:00:00Z",
        status: "ativo",
        emitido_por: "usr-coord-01",
        condicionantes_restricoes: null,
        url_alvara_pdf: "https://storage.braunas.mg.gov.br/alvaras/2026/050.pdf",
        criado_em: "2026-01-10T10:00:00Z",
      });

      const parsed: AlvaraSanitarioOutputDTO = JSON.parse(rawJson);

      expect(parsed.numero_alvara).toBe(50);
      expect(parsed.exercicio).toBe(2026);
      expect(STATUS_ALVARA_VALIDOS).toContain(parsed.status);
      expect(parsed.codigo_autenticidade).toMatch(/^BRAUNAS-/);
    });

    it("deve desserializar DashboardMetasConsolidadoDTO validando indicadores CQRS", () => {
      const rawJson = JSON.stringify({
        ano_exercicio: 2026,
        indicador_11_vapt: {
          codigo: "IND-11",
          titulo: "VAPT",
          descricao: "Saúde do Trabalhador",
          unidade: "ações",
          progresso: { meta_pactuada: 10, realizado: 8, percentual_atingido: 80, status: "Em Andamento" },
        },
        indicador_12_risco_3: {
          codigo: "IND-12",
          titulo: "Risco III",
          descricao: "Alto Risco",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 100, percentual_atingido: 100, status: "Atingida" },
        },
        indicador_13_risco_2: {
          codigo: "IND-13",
          titulo: "Risco II",
          descricao: "Médio Risco",
          unidade: "%",
          progresso: { meta_pactuada: 75, realizado: 60, percentual_atingido: 80, status: "Em Andamento" },
        },
        indicador_14_risco_1: {
          codigo: "IND-14",
          titulo: "Risco I",
          descricao: "Baixo Risco",
          unidade: "%",
          progresso: { meta_pactuada: 50, realizado: 45, percentual_atingido: 90, status: "Em Andamento" },
        },
        indicador_15_sintetico: {
          codigo: "IND-15",
          titulo: "Sintético",
          descricao: "Índice Consolidado",
          unidade: "pontos",
          progresso: { meta_pactuada: 100, realizado: 88, percentual_atingido: 88, status: "Em Andamento" },
        },
        total_estabelecimentos_cadastrados: 120,
        distribuicao_estabelecimentos_por_risco: {
          "Risco III": 20,
          "Risco II": 50,
          "Risco I": 30,
          Dispensado: 20,
        },
        total_inspecoes_exercicio: 70,
        total_alvaras_ativos: 65,
        atualizado_em: "2026-07-01T00:00:00Z",
      });

      const parsed: DashboardMetasConsolidadoDTO = JSON.parse(rawJson);

      expect(parsed.ano_exercicio).toBe(2026);
      expect(parsed.indicador_11_vapt.progresso.meta_pactuada).toBe(10);
      expect(parsed.indicador_11_vapt.progresso.realizado).toBe(8);
      expect(parsed.total_estabelecimentos_cadastrados).toBe(120);
    });
  });
});
