import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AgendarInspecaoInputDTO,
  AlvaraSanitarioOutputDTO,
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
} from "../../types/apiContracts";
import { apiClient, ApiError } from "../apiClient";
import { vigiminasApi } from "../vigiminasApi";

describe("vigiminasApi (Módulos de Domínio Sanitário)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // ===========================================================================
  // 1. AUTENTICAÇÃO E SESSÃO
  // ===========================================================================
  describe("1. Autenticação e Sessão", () => {
    it("deve realizar login, armazenar token e usuário no storage (Happy Path)", async () => {
      const mockCredenciais: LoginInputDTO = {
        email_ou_matricula: "fiscal.teste@braunas.mg.gov.br",
        senha: "senhaCorreta123",
      };

      const mockResponse: TokenResponseDTO = {
        access_token: "jwt-token-autenticado-12345",
        token_type: "bearer",
        expires_in_minutes: 480,
        usuario: {
          id: "usr-01",
          nome_completo: "Carlos Alberto - Fiscal Sanitário",
          email: "fiscal.teste@braunas.mg.gov.br",
          cpf: "111.222.333-44",
          matricula: "MAT-2026-01",
          perfil: "fiscal_tecnico",
          cargo: "Fiscal Sanitário Municipal",
          portaria_designacao: "PORT-45/2025",
          assinatura_digital_url: "https://storage.braunas.mg.gov.br/assinaturas/usr-01.png",
          is_active: true,
          criado_em: "2026-01-10T08:00:00Z",
        },
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValue(mockResponse);
      const setTokenSpy = vi.spyOn(apiClient, "setToken");

      const resultado = await vigiminasApi.login(mockCredenciais);

      expect(postSpy).toHaveBeenCalledWith("/auth/login", mockCredenciais);
      expect(setTokenSpy).toHaveBeenCalledWith("jwt-token-autenticado-12345");
      expect(localStorage.getItem("vigiminas_user")).toBe(JSON.stringify(mockResponse.usuario));
      expect(resultado).toEqual(mockResponse);
    });

    it("deve retornar resposta sem setar token caso access_token não esteja presente na resposta de login", async () => {
      const mockSemToken = {
        access_token: "",
        token_type: "bearer",
        expires_in_minutes: 0,
        usuario: {} as any,
      };

      vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockSemToken);
      const setTokenSpy = vi.spyOn(apiClient, "setToken");

      const resultado = await vigiminasApi.login({
        email_ou_matricula: "usuario",
        senha: "pwd",
      });

      expect(resultado).toEqual(mockSemToken);
      expect(setTokenSpy).not.toHaveBeenCalled();
    });

    it("deve rejeitar login com erro 401 para credenciais inválidas (Unhappy Path)", async () => {
      vi.spyOn(apiClient, "post").mockRejectedValue(
        new ApiError(401, "Email, matrícula ou senha incorretos.")
      );

      await expect(
        vigiminasApi.login({ email_ou_matricula: "invalido", senha: "wrong" })
      ).rejects.toMatchObject({
        status: 401,
        message: "Email, matrícula ou senha incorretos.",
      });
    });

    it("deve realizar logout e invocar clearToken()", () => {
      const clearTokenSpy = vi.spyOn(apiClient, "clearToken");
      vigiminasApi.logout();
      expect(clearTokenSpy).toHaveBeenCalled();
    });

    it("deve obter dados do perfil do usuário autenticado (Happy Path e Unhappy Path 403)", async () => {
      const mockUsuario: UsuarioOutputDTO = {
        id: "usr-02",
        nome_completo: "Dra. Mariana Coordenadora",
        email: "mariana@braunas.mg.gov.br",
        cpf: "999.888.777-66",
        matricula: "MAT-COORD-01",
        perfil: "coordenador",
        cargo: "Coordenadora de Vigilância em Saúde",
        is_active: true,
        criado_em: "2026-01-01T00:00:00Z",
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockUsuario);

      const perfil = await vigiminasApi.obterPerfilAtual();
      expect(perfil.perfil).toBe("coordenador");
      expect(perfil.email).toBe("mariana@braunas.mg.gov.br");

      // Unhappy Path 403
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(403, "Acesso restrito.")
      );
      await expect(vigiminasApi.obterPerfilAtual()).rejects.toMatchObject({
        status: 403,
      });
    });
  });

  // ===========================================================================
  // 2. ESTABELECIMENTOS E CNAES
  // ===========================================================================
  describe("2. Estabelecimentos e CNAEs", () => {
    it("deve listar estabelecimentos com filtros por CNPJ formatado e não formatado", async () => {
      const mockResult: PaginatedResult<EstabelecimentoOutputDTO> = {
        total: 1,
        skip: 0,
        limit: 10,
        items: [
          {
            id: "est-01",
            tipo_cadastro: "PJ",
            cnpj_cpf: "12.345.678/0001-90",
            razao_social: "Drogaria Braúnas Ltda",
            nome_fantasia: "Drogaria Saúde",
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
              },
            ],
            criado_em: "2026-02-01T10:00:00Z",
          },
        ],
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValue(mockResult);

      // Consulta formatada
      const resFormatada = await vigiminasApi.listarEstabelecimentos({
        termo: "12.345.678/0001-90",
        nivel_risco: "Risco III",
      });
      expect(getSpy).toHaveBeenLastCalledWith("/estabelecimentos", {
        termo: "12.345.678/0001-90",
        nivel_risco: "Risco III",
      });
      expect(resFormatada.items[0].cnpj_cpf).toBe("12.345.678/0001-90");

      // Consulta não formatada
      await vigiminasApi.listarEstabelecimentos({ termo: "12345678000190" });
      expect(getSpy).toHaveBeenLastCalledWith("/estabelecimentos", {
        termo: "12345678000190",
      });
    });

    it("deve obter estabelecimento por ID (Happy Path) e tratar 404 (Unhappy Path)", async () => {
      const mockEst: EstabelecimentoOutputDTO = {
        id: "est-123",
        tipo_cadastro: "PJ",
        cnpj_cpf: "01.234.567/0001-89",
        razao_social: "Padaria e Confeitaria Central",
        municipio: "Braúnas",
        uf: "MG",
        nivel_risco: "Risco II",
        competencia_fiscalizacao: "Municipal",
        situacao_estabelecimento: "Ativo",
        situacao_alvara: "Não Possui (Irregular)",
        cnaes: [],
        criado_em: "2026-03-01T00:00:00Z",
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockEst);
      const est = await vigiminasApi.obterEstabelecimento("est-123");
      expect(est.id).toBe("est-123");

      // Unhappy Path 404
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(404, "Estabelecimento com ID est-999 não encontrado")
      );
      await expect(vigiminasApi.obterEstabelecimento("est-999")).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining("não encontrado"),
      });
    });

    it("deve cadastrar estabelecimento com CNAEs vinculados (Happy Path e Unhappy Path 422)", async () => {
      const payload: CadastrarEstabelecimentoInputDTO = {
        tipo_cadastro: "PJ",
        cnpj_cpf: "98.765.432/0001-10",
        razao_social: "Supermercado do Povo",
        nome_fantasia: "Super Povo",
        municipio: "Braúnas",
        uf: "MG",
        cnaes: [
          { cnae_id: "cnae-mercado", eh_principal: true, data_inicio_atividade: "2026-01-01" },
          { cnae_id: "cnae-padaria", eh_principal: false, data_inicio_atividade: "2026-01-01" },
        ],
      };

      const mockCriado: EstabelecimentoOutputDTO = {
        id: "est-novo",
        ...payload,
        municipio: "Braúnas",
        uf: "MG",
        nivel_risco: "Risco II",
        competencia_fiscalizacao: "Municipal",
        situacao_estabelecimento: "Ativo",
        situacao_alvara: "Não Possui (Irregular)",
        cnaes: [
          {
            cnae_id: "cnae-mercado",
            codigo: "4711-3/02",
            descricao: "Comércio varejista de mercadorias",
            eh_principal: true,
          },
        ],
        criado_em: "2026-04-01T00:00:00Z",
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockCriado);
      const resultado = await vigiminasApi.cadastrarEstabelecimento(payload);

      expect(postSpy).toHaveBeenCalledWith("/estabelecimentos", payload);
      expect(resultado.id).toBe("est-novo");
      expect(resultado.cnaes).toHaveLength(1);

      // Unhappy Path 422 (Pydantic validation: CNPJ inválido)
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new ApiError(422, "CNPJ com dígitos verificadores inválidos.")
      );
      await expect(vigiminasApi.cadastrarEstabelecimento(payload)).rejects.toMatchObject({
        status: 422,
        message: "CNPJ com dígitos verificadores inválidos.",
      });
    });

    it("deve listar CNAEs com filtros e tratar erro 500 (Unhappy Path)", async () => {
      const mockCnaes: PaginatedResult<CnaeDTO> = {
        total: 2,
        skip: 0,
        limit: 10,
        items: [
          {
            id: "cnae-1",
            codigo: "1011-2/01",
            descricao: "Frigorífico - abate de bovinos",
            grau_risco_padrao: "Risco III",
            competencia_padrao: "Municipal",
            exige_rt: true,
            exige_projeto_arquitetonico: true,
          },
        ],
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockCnaes);
      const res = await vigiminasApi.listarCnaes({ grau_risco: "Risco III" });
      expect(res.items[0].grau_risco_padrao).toBe("Risco III");

      // Unhappy Path 500
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(500, "Erro interno de banco de dados ao buscar CNAEs")
      );
      await expect(vigiminasApi.listarCnaes()).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  // ===========================================================================
  // 3. FISCALIZAÇÃO E INSPEÇÕES (VAPT / INDICADOR 11)
  // ===========================================================================
  describe("3. Fiscalização e Inspeções Sanitárias (VAPT / Indicador 11)", () => {
    it("deve listar inspeções sanitárias com filtros (Happy Path)", async () => {
      const mockResult: PaginatedResult<InspecaoOutputDTO> = {
        total: 1,
        skip: 0,
        limit: 10,
        items: [
          {
            id: "insp-01",
            numero_termo: "TERMO-2026-0001",
            motivo: "vapt_trabalhador",
            status: "agendada",
            estabelecimento_id: "est-01",
            fiscal_responsavel_id: "usr-01",
            data_inicio: "2026-05-10T09:00:00Z",
            eh_trabalhador_vapt: true,
            criado_em: "2026-05-01T08:00:00Z",
          },
        ],
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockResult);

      const res = await vigiminasApi.listarInspecoes({
        motivo: "vapt_trabalhador",
        status: "agendada",
      });
      expect(res.items[0].eh_trabalhador_vapt).toBe(true);
      expect(res.items[0].motivo).toBe("vapt_trabalhador");
    });

    it("deve obter inspeção por ID (Happy Path e Unhappy Path 404)", async () => {
      const mockInspecao: InspecaoOutputDTO = {
        id: "insp-01",
        numero_termo: "TERMO-2026-0001",
        motivo: "requerimento_alvara",
        status: "concluida",
        estabelecimento_id: "est-01",
        fiscal_responsavel_id: "usr-01",
        data_inicio: "2026-05-10T09:00:00Z",
        data_fim: "2026-05-10T11:00:00Z",
        resultado: "aprovado",
        laudo_tecnico: "Estabelecimento cumpre todas as exigências sanitárias.",
        eh_trabalhador_vapt: false,
        criado_em: "2026-05-01T08:00:00Z",
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockInspecao);
      const res = await vigiminasApi.obterInspecao("insp-01");
      expect(res.resultado).toBe("aprovado");

      // 404
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(404, "Inspeção inexistente")
      );
      await expect(vigiminasApi.obterInspecao("insp-404")).rejects.toMatchObject({
        status: 404,
      });
    });

    it("deve agendar inspeção sanitária com flag VAPT (Happy Path e Unhappy Path 400)", async () => {
      const input: AgendarInspecaoInputDTO = {
        estabelecimento_id: "est-01",
        motivo: "vapt_trabalhador",
        data_inicio: "2026-06-01T09:00:00Z",
        hora_inspecao: "09:30",
        eh_trabalhador_vapt: true,
      };

      const mockCriada: InspecaoOutputDTO = {
        id: "insp-nova",
        numero_termo: "TERMO-2026-0002",
        motivo: "vapt_trabalhador",
        status: "agendada",
        estabelecimento_id: "est-01",
        fiscal_responsavel_id: "usr-01",
        data_inicio: "2026-06-01T09:00:00Z",
        eh_trabalhador_vapt: true,
        criado_em: "2026-05-20T08:00:00Z",
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockCriada);
      const res = await vigiminasApi.agendarInspecao(input);

      expect(postSpy).toHaveBeenCalledWith("/inspecoes", input);
      expect(res.id).toBe("insp-nova");
      expect(res.eh_trabalhador_vapt).toBe(true);

      // Unhappy Path 400 (Estabelecimento suspenso ou data no passado)
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new ApiError(400, "Não é possível agendar inspeção com data retroativa.")
      );
      await expect(vigiminasApi.agendarInspecao(input)).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("data retroativa"),
      });
    });

    it("deve concluir inspeção com notificação de prazo e exigências técnicas (Happy Path e Unhappy Path 422)", async () => {
      const input: ConcluirInspecaoInputDTO = {
        resultado: "notificado_com_prazo",
        laudo_tecnico: "Identificadas irregularidades no armazenamento de perecíveis.",
        prazo_notificacao_dias: 15,
        exigencias_notificacao: "Instalar termômetro na câmara fria e higienizar piso.",
        nome_pessoa_acompanhou: "José Gerente",
      };

      const mockConcluida: InspecaoOutputDTO = {
        id: "insp-01",
        numero_termo: "TERMO-2026-0001",
        motivo: "rotina_programada",
        status: "concluida",
        estabelecimento_id: "est-01",
        fiscal_responsavel_id: "usr-01",
        data_inicio: "2026-05-10T09:00:00Z",
        data_fim: "2026-05-10T11:00:00Z",
        resultado: "notificado_com_prazo",
        laudo_tecnico: input.laudo_tecnico,
        eh_trabalhador_vapt: false,
        criado_em: "2026-05-01T08:00:00Z",
      };

      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValueOnce(mockConcluida);
      const res = await vigiminasApi.concluirInspecao("insp-01", input);

      expect(patchSpy).toHaveBeenCalledWith("/inspecoes/insp-01/concluir", input);
      expect(res.status).toBe("concluida");
      expect(res.resultado).toBe("notificado_com_prazo");

      // Unhappy Path 422 (Falta de prazo para notificado_com_prazo)
      vi.spyOn(apiClient, "patch").mockRejectedValueOnce(
        new ApiError(422, "O campo prazo_notificacao_dias é obrigatório quando o resultado for notificado_com_prazo")
      );
      await expect(vigiminasApi.concluirInspecao("insp-01", input)).rejects.toMatchObject({
        status: 422,
      });
    });
  });

  // ===========================================================================
  // 4. LICENCIAMENTO SANITÁRIO E ALVARÁS
  // ===========================================================================
  describe("4. Licenciamento Sanitário e Alvarás", () => {
    it("deve submeter requerimento de alvará (Happy Path e Unhappy Path 400)", async () => {
      const input: SubmeterRequerimentoInputDTO = {
        estabelecimento_id: "est-01",
        tipo_solicitacao: "concessao_inicial",
        dados: {
          cpf_cnpj: "12.345.678/0001-90",
          razao_social: "Drogaria Braúnas Ltda",
          num_funcionarios_manipuladores: 4,
          fonte_abastecimento_agua: "Rede Pública (Copasa)",
        },
      };

      const mockReq: RequerimentoOutputDTO = {
        id: "req-01",
        numero_protocolo: "REQ-2026-0001",
        estabelecimento_id: "est-01",
        tipo_solicitacao: "concessao_inicial",
        status: "pendente",
        data_submissao: "2026-05-01T10:00:00Z",
        criado_em: "2026-05-01T10:00:00Z",
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockReq);
      const res = await vigiminasApi.submeterRequerimento(input);

      expect(postSpy).toHaveBeenCalledWith("/requerimentos", input);
      expect(res.numero_protocolo).toBe("REQ-2026-0001");
      expect(res.status).toBe("pendente");

      // Unhappy Path 400 (Já existe requerimento pendente)
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new ApiError(400, "Já existe um requerimento em análise para este estabelecimento.")
      );
      await expect(vigiminasApi.submeterRequerimento(input)).rejects.toMatchObject({
        status: 400,
        message: expect.stringContaining("Já existe um requerimento"),
      });
    });

    it("deve listar e obter requerimentos por ID", async () => {
      const mockList: PaginatedRequerimentosOutputDTO = {
        total: 1,
        skip: 0,
        limit: 10,
        items: [
          {
            id: "req-01",
            numero_protocolo: "REQ-2026-0001",
            estabelecimento_id: "est-01",
            tipo_solicitacao: "concessao_inicial",
            status: "em_analise",
            data_submissao: "2026-05-01T10:00:00Z",
            criado_em: "2026-05-01T10:00:00Z",
          },
        ],
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockList);
      const listRes = await vigiminasApi.listarRequerimentos({ status: "em_analise" });
      expect(listRes.items).toHaveLength(1);

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockList.items[0]);
      const itemRes = await vigiminasApi.obterRequerimento("req-01");
      expect(itemRes.id).toBe("req-01");
    });

    it("deve analisar requerimento alterando status sanitário (Happy Path)", async () => {
      const mockAnalise: RequerimentoOutputDTO = {
        id: "req-01",
        numero_protocolo: "REQ-2026-0001",
        estabelecimento_id: "est-01",
        tipo_solicitacao: "concessao_inicial",
        status: "deferido",
        data_submissao: "2026-05-01T10:00:00Z",
        analisado_por: "usr-01",
        parecer_fiscal: "Documentação completa e em conformidade.",
        criado_em: "2026-05-01T10:00:00Z",
      };

      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValueOnce(mockAnalise);
      const res = await vigiminasApi.analisarRequerimento("req-01", {
        acao: "deferir",
        parecer_ou_motivo: "Documentação aprovada.",
      });

      expect(patchSpy).toHaveBeenCalledWith("/requerimentos/req-01/analisar", {
        acao: "deferir",
        parecer_ou_motivo: "Documentação aprovada.",
      });
      expect(res.status).toBe("deferido");
    });

    it("deve emitir alvará sanitário e listar alvarás emitidos", async () => {
      const input: EmitirAlvaraSanitarioInputDTO = {
        estabelecimento_id: "est-01",
        requerimento_id: "req-01",
        validade_meses: 12,
        condicionantes_restricoes: "Manter dedetização em dia",
      };

      const mockAlvara: AlvaraSanitarioOutputDTO = {
        id: "alv-01",
        numero_alvara: 101,
        exercicio: 2026,
        numero_formatado: "101/2026",
        estabelecimento_id: "est-01",
        requerimento_id: "req-01",
        codigo_autenticidade: "AUT-BRAUNAS-9A8B7C",
        data_emissao: "2026-05-15T10:00:00Z",
        data_vencimento: "2027-05-15T10:00:00Z",
        status: "ativo",
        emitido_por: "usr-01",
        condicionantes_restricoes: "Manter dedetização em dia",
        criado_em: "2026-05-15T10:00:00Z",
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockAlvara);
      const res = await vigiminasApi.emitirAlvara(input);

      expect(postSpy).toHaveBeenCalledWith("/alvaras/emitir", input);
      expect(res.numero_formatado).toBe("101/2026");
      expect(res.codigo_autenticidade).toBe("AUT-BRAUNAS-9A8B7C");

      // Listar alvarás
      const mockPaginated: PaginatedAlvarasOutputDTO = {
        total: 1,
        skip: 0,
        limit: 10,
        items: [mockAlvara],
      };
      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockPaginated);
      const listaAlv = await vigiminasApi.listarAlvaras({ exercicio: 2026 });
      expect(listaAlv.items[0].exercicio).toBe(2026);

      // Obter alvará por ID
      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockAlvara);
      const alvId = await vigiminasApi.obterAlvara("alv-01");
      expect(alvId.id).toBe("alv-01");
    });

    it("deve validar alvará público por código de autenticidade (Happy Path e Unhappy Path 404)", async () => {
      const mockAlvara: AlvaraSanitarioOutputDTO = {
        id: "alv-01",
        numero_alvara: 101,
        exercicio: 2026,
        numero_formatado: "101/2026",
        estabelecimento_id: "est-01",
        codigo_autenticidade: "VALIDO-123",
        data_emissao: "2026-05-15T10:00:00Z",
        data_vencimento: "2027-05-15T10:00:00Z",
        status: "ativo",
        emitido_por: "usr-01",
        criado_em: "2026-05-15T10:00:00Z",
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockAlvara);
      const valid = await vigiminasApi.validarAlvaraPublico("VALIDO-123");

      expect(getSpy).toHaveBeenCalledWith("/alvaras/validar/VALIDO-123");
      expect(valid.codigo_autenticidade).toBe("VALIDO-123");

      // 404 Código Inexistente/Fraude
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(404, "Código de autenticidade inválido ou alvará inexistente.")
      );
      await expect(vigiminasApi.validarAlvaraPublico("CODIGO-FALSO")).rejects.toMatchObject({
        status: 404,
        message: expect.stringContaining("inválido"),
      });
    });
  });

  // ===========================================================================
  // 5. OUVIDORIA E DENÚNCIAS
  // ===========================================================================
  describe("5. Ouvidoria e Denúncias", () => {
    it("deve registrar denúncia anônima com sucesso (Happy Path)", async () => {
      const payloadAnonimo: RegistrarDenunciaInputDTO = {
        local_denunciado_identificacao: "Restaurante da Esquina, Praça Matriz",
        relato_denuncia: "Presença de baratas na área de manipulação de alimentos.",
        origem: "formulario_web",
        gravidade: "alta",
        denunciante_anonimo: true,
      };

      const mockDenuncia: DenunciaOutputDTO = {
        id: "den-01",
        numero_protocolo: "DEN-2026-0001",
        data_recebimento: "2026-06-01T14:00:00Z",
        origem: "formulario_web",
        gravidade: "alta",
        status: "recebida",
        local_denunciado_identificacao: payloadAnonimo.local_denunciado_identificacao,
        relato_denuncia: payloadAnonimo.relato_denuncia,
        denunciante_anonimo: true,
      };

      const postSpy = vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockDenuncia);
      const res = await vigiminasApi.registrarDenuncia(payloadAnonimo);

      expect(postSpy).toHaveBeenCalledWith("/denuncias", payloadAnonimo);
      expect(res.denunciante_anonimo).toBe(true);
      expect(res.numero_protocolo).toBe("DEN-2026-0001");
    });

    it("deve registrar denúncia identificada com dados completos do denunciante", async () => {
      const payloadIdentificado: RegistrarDenunciaInputDTO = {
        local_denunciado_identificacao: "Mercado Novo - Bairro Bela Vista",
        relato_denuncia: "Venda de produtos lácteos com prazo de validade adulterado.",
        origem: "telefone",
        gravidade: "urgente",
        denunciante_anonimo: false,
        denunciante_nome: "Ana Souza Cidadã",
        denunciante_telefone: "(33) 99999-8888",
        denunciante_email: "ana@email.com",
      };

      const mockDenuncia: DenunciaOutputDTO = {
        id: "den-02",
        numero_protocolo: "DEN-2026-0002",
        data_recebimento: "2026-06-02T10:00:00Z",
        origem: "telefone",
        gravidade: "urgente",
        status: "recebida",
        local_denunciado_identificacao: payloadIdentificado.local_denunciado_identificacao,
        relato_denuncia: payloadIdentificado.relato_denuncia,
        denunciante_anonimo: false,
      };

      vi.spyOn(apiClient, "post").mockResolvedValueOnce(mockDenuncia);
      const res = await vigiminasApi.registrarDenuncia(payloadIdentificado);

      expect(res.denunciante_anonimo).toBe(false);
      expect(res.gravidade).toBe("urgente");
    });

    it("deve rejeitar registro de denúncia incompleta com erro 422 (Unhappy Path)", async () => {
      vi.spyOn(apiClient, "post").mockRejectedValueOnce(
        new ApiError(422, "O relato da denúncia deve conter ao menos 15 caracteres.")
      );

      await expect(
        vigiminasApi.registrarDenuncia({
          local_denunciado_identificacao: "Local",
          relato_denuncia: "curto",
        })
      ).rejects.toMatchObject({
        status: 422,
      });
    });

    it("deve consultar denúncia pública por protocolo e tratar 404", async () => {
      const mockPub: DenunciaPublicaOutputDTO = {
        numero_protocolo: "DEN-2026-0001",
        data_recebimento: "2026-06-01T14:00:00Z",
        status: "em_apuracao_fiscal",
        gravidade: "alta",
        local_denunciado_identificacao: "Restaurante da Esquina",
      };

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockPub);
      const res = await vigiminasApi.consultarDenunciaPublica("DEN-2026-0001");
      expect(res.numero_protocolo).toBe("DEN-2026-0001");

      // 404
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(404, "Protocolo não encontrado")
      );
      await expect(vigiminasApi.consultarDenunciaPublica("PROTO-INEXISTENTE")).rejects.toMatchObject({
        status: 404,
      });
    });

    it("deve gerenciar triagem fiscal (fila de trabalho, despacho e conclusão)", async () => {
      // 1. Fila de trabalho
      const mockFila: FilaTrabalhoDenunciaOutputDTO[] = [
        {
          id: "den-01",
          numero_protocolo: "DEN-2026-0001",
          data_recebimento: "2026-06-01T14:00:00Z",
          gravidade: "urgente",
          status: "recebida",
          local_denunciado_identificacao: "Restaurante",
          dias_em_aberto: 2,
        },
      ];
      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockFila);
      const fila = await vigiminasApi.listarFilaTrabalhoDenuncias();
      expect(fila).toHaveLength(1);

      // 2. Despacho
      const despInput: DespacharDenunciaInputDTO = {
        fiscal_designado_id: "usr-01",
        despacho_coordenacao: "Designado para averiguação in loco imediata.",
        nova_gravidade: "urgente",
        iniciar_apuracao: true,
      };
      const mockDespachada: DenunciaOutputDTO = {
        id: "den-01",
        numero_protocolo: "DEN-2026-0001",
        data_recebimento: "2026-06-01T14:00:00Z",
        origem: "formulario_web",
        gravidade: "urgente",
        status: "em_apuracao_fiscal",
        local_denunciado_identificacao: "Restaurante",
        relato_denuncia: "Relato...",
        denunciante_anonimo: true,
        fiscal_designado_id: "usr-01",
        despacho_coordenacao: despInput.despacho_coordenacao,
      };
      const patchSpy = vi.spyOn(apiClient, "patch").mockResolvedValueOnce(mockDespachada);
      const despRes = await vigiminasApi.despacharDenuncia("den-01", despInput);
      expect(patchSpy).toHaveBeenCalledWith("/denuncias/den-01/despacho", despInput);
      expect(despRes.status).toBe("em_apuracao_fiscal");

      // 3. Conclusão
      const conclInput: ConcluirDenunciaInputDTO = {
        status: "procedente",
        conclusao_apuracao: "Inspeção realizada. Auto de infração lavrado e produto apreendido.",
        resposta_ao_denunciante: "A vigilância sanitária autuou o estabelecimento.",
      };
      const mockConcluida: DenunciaOutputDTO = {
        ...mockDespachada,
        status: "procedente",
        conclusao_apuracao: conclInput.conclusao_apuracao,
        resposta_ao_denunciante: conclInput.resposta_ao_denunciante,
      };
      vi.spyOn(apiClient, "patch").mockResolvedValueOnce(mockConcluida);
      const conclRes = await vigiminasApi.concluirDenuncia("den-01", conclInput);
      expect(conclRes.status).toBe("procedente");
      expect(conclRes.conclusao_apuracao).toContain("Auto de infração");

      // 4. Listar todas e obter por ID
      const mockPaginatedDen: PaginatedDenunciasOutputDTO = {
        total: 1,
        skip: 0,
        limit: 10,
        items: [mockConcluida],
      };
      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockPaginatedDen);
      const listDen = await vigiminasApi.listarDenuncias({ status: "procedente" });
      expect(listDen.items).toHaveLength(1);

      vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockConcluida);
      const singleDen = await vigiminasApi.obterDenuncia("den-01");
      expect(singleDen.id).toBe("den-01");
    });
  });

  // ===========================================================================
  // 6. INDICADORES SANITÁRIOS E RELATÓRIOS OFICIAIS (CQRS)
  // ===========================================================================
  describe("6. Indicadores Sanitários e Relatórios Oficiais (CQRS)", () => {
    it("deve carregar o Dashboard consolidado de metas sanitárias (Happy Path e Unhappy Path 500)", async () => {
      const mockDashboard: DashboardMetasConsolidadoDTO = {
        ano_exercicio: 2026,
        indicador_11_vapt: {
          codigo: "IND-11",
          titulo: "VAPT - Vigilância em Ambientes e Processos de Trabalho",
          descricao: "Ações de saúde do trabalhador",
          unidade: "ações",
          progresso: { meta_pactuada: 10, realizado: 8, percentual_atingido: 80, status: "Em Andamento" },
        },
        indicador_12_risco_3: {
          codigo: "IND-12",
          titulo: "Inspeções em Alto Risco (Risco III)",
          descricao: "Cobertura de estabelecimentos de alto risco",
          unidade: "%",
          progresso: { meta_pactuada: 100, realizado: 100, percentual_atingido: 100, status: "Atingida" },
        },
        indicador_13_risco_2: {
          codigo: "IND-13",
          titulo: "Inspeções em Médio Risco (Risco II)",
          descricao: "Cobertura de médio risco",
          unidade: "%",
          progresso: { meta_pactuada: 75, realizado: 50, percentual_atingido: 66.6, status: "Em Andamento" },
        },
        indicador_14_risco_1: {
          codigo: "IND-14",
          titulo: "Inspeções em Baixo Risco (Risco I)",
          descricao: "Ações orientativas",
          unidade: "%",
          progresso: { meta_pactuada: 50, realizado: 40, percentual_atingido: 80, status: "Em Andamento" },
        },
        indicador_15_sintetico: {
          codigo: "IND-15",
          titulo: "Índice Sintético de Cobertura Sanitária Municipal",
          descricao: "Consolidado geral",
          unidade: "pontos",
          progresso: { meta_pactuada: 100, realizado: 85, percentual_atingido: 85, status: "Em Andamento" },
        },
        total_estabelecimentos_cadastrados: 150,
        distribuicao_estabelecimentos_por_risco: {
          "Risco III": 25,
          "Risco II": 60,
          "Risco I": 40,
          Dispensado: 25,
        },
        total_inspecoes_exercicio: 84,
        total_alvaras_ativos: 92,
        atualizado_em: "2026-06-30T23:59:59Z",
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockDashboard);
      const res = await vigiminasApi.obterDashboardIndicadores(2026);

      expect(getSpy).toHaveBeenCalledWith("/indicadores/dashboard", { ano: 2026 });
      expect(res.indicador_11_vapt.progresso.percentual_atingido).toBe(80);
      expect(res.total_inspecoes_exercicio).toBe(84);

      // Unhappy Path 500
      vi.spyOn(apiClient, "get").mockRejectedValueOnce(
        new ApiError(500, "Erro ao consolidar visão materializada dos indicadores.")
      );
      await expect(vigiminasApi.obterDashboardIndicadores()).rejects.toMatchObject({
        status: 500,
      });
    });

    it("deve obter relatório detalhado do Indicador 11 (VAPT)", async () => {
      const mockInd11: RelatorioIndicador11DetalhadoDTO = {
        ano_exercicio: 2026,
        meta_pactuada: 12,
        total_acoes_realizadas: 10,
        acoes_concluidas: 8,
        acoes_em_andamento: 2,
        estabelecimentos_distintos_atendidos: 7,
        percentual_atingido: 83.3,
        status_cumprimento: "Em Andamento",
        historico_exercicios: [],
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockInd11);
      const res = await vigiminasApi.obterRelatorioIndicador11(2026);

      expect(getSpy).toHaveBeenCalledWith("/indicadores/vapt-11", { ano: 2026 });
      expect(res.estabelecimentos_distintos_atendidos).toBe(7);
    });

    it("deve obter relatório de cobertura por grau de risco", async () => {
      const mockRisco: RelatorioRiscoCoberturaDTO = {
        ano_exercicio: 2026,
        grau_risco: "Risco III",
        total_estabelecimentos_cadastrados: 25,
        total_estabelecimentos_fiscalizados: 22,
        percentual_cobertura_realizado: 88,
        meta_cobertura_pactuada: 100,
        status_cobertura: "Abaixo da Meta",
        estabelecimentos: [
          {
            id: "est-01",
            cnpj_cpf: "12.345.678/0001-90",
            razao_social: "Drogaria Braúnas",
            grau_risco: "Risco III",
            fiscalizado_no_exercicio: true,
            situacao_alvara: "Válido",
          },
        ],
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockRisco);
      const res = await vigiminasApi.obterCoberturaPorRisco("Risco III", { ano: 2026, apenas_pendentes: false });

      expect(getSpy).toHaveBeenCalledWith("/indicadores/cobertura-risco/Risco III", {
        ano: 2026,
        apenas_pendentes: false,
      });
      expect(res.total_estabelecimentos_fiscalizados).toBe(22);
    });

    it("deve carregar painel de alertas de vencimento com limite customizado de dias", async () => {
      const mockAlertas: PainelAlertasVencimentoDTO = {
        total_notificacoes_criticas: 2,
        total_documentos_vencendo: 5,
        notificacoes: [
          {
            inspecao_id: "insp-01",
            numero_termo: "TERMO-001",
            estabelecimento_id: "est-01",
            razao_social: "Drogaria",
            cnpj_cpf: "123",
            fiscal_responsavel: "Carlos",
            data_inicio: "2026-06-01",
            data_limite_cumprimento: "2026-06-15",
            dias_restantes: 3,
            urgencia_vencimento: "CRITICA",
          },
        ],
        documentos: [],
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockAlertas);
      const res = await vigiminasApi.obterPainelAlertas(15);

      expect(getSpy).toHaveBeenCalledWith("/indicadores/alertas", { limite_dias: 15 });
      expect(res.total_notificacoes_criticas).toBe(2);
    });

    it("deve gerar o Relatório Oficial de Prestação de Contas do Exercício", async () => {
      const mockRelatorio: RelatorioOficialExercicioDTO = {
        municipio: "Braúnas",
        uf: "MG",
        nome_prefeitura: "Prefeitura Municipal de Braúnas",
        nome_secretaria: "Secretaria Municipal de Saúde",
        nome_coordenadoria: "Coordenadoria de Vigilância em Saúde",
        ano_exercicio: 2026,
        data_emissao_relatorio: "2026-11-10T11:00:00Z",
        indicadores_sintese: [],
        resumo_geral: {
          total_inspecoes: 120,
          total_alvaras: 88,
          indice_resolutividade: "94%",
        },
      };

      const getSpy = vi.spyOn(apiClient, "get").mockResolvedValueOnce(mockRelatorio);
      const res = await vigiminasApi.gerarRelatorioOficial(2026);

      expect(getSpy).toHaveBeenCalledWith("/indicadores/relatorio-oficial", { ano: 2026 });
      expect(res.municipio).toBe("Braúnas");
      expect(res.resumo_geral.total_inspecoes).toBe(120);
    });
  });
});
