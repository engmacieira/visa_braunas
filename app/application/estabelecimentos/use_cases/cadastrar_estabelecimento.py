import uuid
from typing import List, Optional

from app.application.estabelecimentos.dtos import (
    EstabelecimentoCreateDTO,
    EstabelecimentoResponseDTO,
)
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria
from app.domain.auth.repositories import IAuditoriaRepository
from app.domain.estabelecimentos.entities import (
    CNAE,
    Estabelecimento,
    RepresentanteLegal,
    TipoPessoa,
    VinculoCNAE,
)
from app.domain.estabelecimentos.repositories import (
    ICNAERepository,
    IEstabelecimentoRepository,
    IRepresentanteLegalRepository,
)
from app.domain.estabelecimentos.services import CalculadoraRiscoSanitarioService
from app.domain.estabelecimentos.value_objects import CEP, CNPJ, CPF


class EstabelecimentoJaExisteException(Exception):
    pass


class CNAEInvalidoException(Exception):
    pass


class RepresentanteNaoEncontradoException(Exception):
    pass


class CadastrarEstabelecimentoUseCase:
    """
    Caso de Uso responsável por orquestrar o cadastro completo de um novo Estabelecimento:
    - Validação formal de documentos (CNPJ/CPF e CEP)
    - Verificação de duplicidade cadastral ativa
    - Vínculo/cadastro do Representante Legal
    - Resolução dos CNAEs e garantia estrita de exatamente 1 CNAE Principal
    - Apuração automática do Grau de Risco Sanitário Preponderante
    - Registro na Trilha Imutável de Auditoria
    """

    def __init__(
        self,
        estabelecimento_repo: IEstabelecimentoRepository,
        cnae_repo: ICNAERepository,
        rep_repo: IRepresentanteLegalRepository,
        auditoria_repo: Optional[IAuditoriaRepository] = None,
    ) -> None:
        self.estabelecimento_repo = estabelecimento_repo
        self.cnae_repo = cnae_repo
        self.rep_repo = rep_repo
        self.auditoria_repo = auditoria_repo

    async def execute(
        self,
        dto: EstabelecimentoCreateDTO,
        cadastrado_por: Optional[uuid.UUID] = None,
        usuario_nome: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> EstabelecimentoResponseDTO:
        # 1. Validação de Documento (CNPJ ou CPF) e CEP via Value Objects
        clean_doc = "".join(filter(str.isdigit, dto.cnpj_cpf))
        if dto.tipo_cadastro == TipoPessoa.PJ:
            vo_doc = CNPJ(clean_doc)
            documento_validado = vo_doc.valor
        else:
            vo_doc = CPF(clean_doc)
            documento_validado = vo_doc.valor

        vo_cep = CEP(dto.cep)

        # 2. Verificação de Duplicidade Ativa
        existente = await self.estabelecimento_repo.get_by_cnpj_cpf(documento_validado, include_deleted=False)
        if existente:
            raise EstabelecimentoJaExisteException(
                f"Já existe um estabelecimento ativo com o documento '{vo_doc.formatado}'."
            )

        # 3. Resolução do Representante Legal
        rep_id_final: Optional[uuid.UUID] = None
        if dto.representante_legal_id:
            rep_existente = await self.rep_repo.get_by_id(dto.representante_legal_id)
            if not rep_existente:
                raise RepresentanteNaoEncontradoException("Representante legal especificado não foi encontrado.")
            rep_id_final = rep_existente.id
        elif dto.representante_legal:
            vo_rep_cpf = CPF(dto.representante_legal.cpf)
            rep_cadastrado = await self.rep_repo.get_by_cpf(vo_rep_cpf.valor)
            if not rep_cadastrado:
                novo_rep = RepresentanteLegal(
                    id=uuid.uuid4(),
                    nome_completo=dto.representante_legal.nome_completo.strip(),
                    cpf=vo_rep_cpf.valor,
                    rg_numero=dto.representante_legal.rg_numero,
                    rg_orgao_emissor=dto.representante_legal.rg_orgao_emissor,
                    telefone=dto.representante_legal.telefone.strip(),
                    email=dto.representante_legal.email.strip().lower(),
                    endereco_residencial=dto.representante_legal.endereco_residencial.strip(),
                )
                rep_salvo = await self.rep_repo.save(novo_rep)
                rep_id_final = rep_salvo.id
            else:
                rep_id_final = rep_cadastrado.id

        # 4. Resolução dos CNAEs e Garantia de Exatamente UM Principal
        principais = [c for c in dto.cnaes if c.eh_principal]
        if len(principais) != 1:
            raise CNAEInvalidoException(
                f"O estabelecimento deve possuir exatamente 1 CNAE marcado como principal. Informados: {len(principais)}."
            )

        estabelecimento_id = uuid.uuid4()
        cnaes_vinculados: List[VinculoCNAE] = []
        cnaes_entities: List[CNAE] = []

        for c_input in dto.cnaes:
            clean_codigo = c_input.cnae_codigo.strip()
            cnae_ent = await self.cnae_repo.get_by_codigo(clean_codigo)
            if not cnae_ent:
                raise CNAEInvalidoException(f"CNAE com o código '{clean_codigo}' não está cadastrado no sistema.")

            cnaes_entities.append(cnae_ent)
            cnaes_vinculados.append(
                VinculoCNAE(
                    id=uuid.uuid4(),
                    estabelecimento_id=estabelecimento_id,
                    cnae_id=cnae_ent.id,
                    cnae_codigo=cnae_ent.codigo,
                    eh_principal=c_input.eh_principal,
                    data_inicio_atividade=c_input.data_inicio_atividade,
                    cnae=cnae_ent,
                )
            )

        # 5. Cálculo do Grau de Risco Preponderante
        risco_apurado = CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_entities)

        # 6. Instanciação e Salvamento do Estabelecimento
        estabelecimento = Estabelecimento(
            id=estabelecimento_id,
            tipo_cadastro=dto.tipo_cadastro,
            cnpj_cpf=documento_validado,
            razao_social=dto.razao_social.strip(),
            nome_fantasia=dto.nome_fantasia.strip() if dto.nome_fantasia else None,
            inscricao_municipal=dto.inscricao_municipal.strip() if dto.inscricao_municipal else None,
            natureza_juridica=dto.natureza_juridica.strip() if dto.natureza_juridica else None,
            cep=vo_cep.formatado,
            logradouro=dto.logradouro.strip(),
            numero=dto.numero.strip(),
            complemento=dto.complemento.strip() if dto.complemento else None,
            bairro=dto.bairro.strip(),
            municipio=dto.municipio.strip(),
            uf=dto.uf.strip().upper(),
            ponto_referencia=dto.ponto_referencia.strip() if dto.ponto_referencia else None,
            acesso_compartilhado_residencia=dto.acesso_compartilhado_residencia,
            telefone_fixo=dto.telefone_fixo.strip() if dto.telefone_fixo else None,
            telefone_celular=dto.telefone_celular.strip(),
            email=dto.email.strip().lower(),
            nivel_risco=risco_apurado,
            competencia_fiscalizacao=dto.competencia_fiscalizacao,
            horario_funcionamento=dto.horario_funcionamento,
            fonte_abastecimento_agua=dto.fonte_abastecimento_agua,
            possui_reservatorio_proprio=dto.possui_reservatorio_proprio,
            capacidade_reservatorio_litros=dto.capacidade_reservatorio_litros,
            representante_legal_id=rep_id_final,
            cadastrado_por=cadastrado_por,
            cnaes=cnaes_vinculados,
        )

        salvo = await self.estabelecimento_repo.save(estabelecimento)

        # 7. Trilha de Auditoria
        if self.auditoria_repo:
            log_cadastro = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="estabelecimentos",
                registro_id=str(salvo.id),
                identificador_entidade=salvo.razao_social,
                operacao=TipoOperacaoAuditoria.INSERT,
                acao="Cadastro de Estabelecimento",
                detalhes=f"Estabelecimento '{salvo.razao_social}' cadastrado com grau {salvo.nivel_risco.value}.",
                dados_novos={
                    "id": str(salvo.id),
                    "cnpj_cpf": salvo.cnpj_cpf,
                    "razao_social": salvo.razao_social,
                    "nivel_risco": salvo.nivel_risco.value,
                    "total_cnaes": len(salvo.cnaes),
                },
                usuario_id=cadastrado_por,
                usuario_nome=usuario_nome,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_cadastro)

        return EstabelecimentoResponseDTO.model_validate(salvo)
