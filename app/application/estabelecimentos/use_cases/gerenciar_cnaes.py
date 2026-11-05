import uuid
from typing import List, Optional

from app.application.estabelecimentos.dtos import (
    EstabelecimentoResponseDTO,
    VinculoCNAEInputDTO,
)
from app.application.estabelecimentos.use_cases.cadastrar_estabelecimento import (
    CNAEInvalidoException,
)
from app.domain.auth.entities import LogAuditoria, TipoOperacaoAuditoria
from app.domain.auth.repositories import IAuditoriaRepository
from app.domain.estabelecimentos.entities import CNAE, VinculoCNAE
from app.domain.estabelecimentos.repositories import (
    ICNAERepository,
    IEstabelecimentoRepository,
)
from app.domain.estabelecimentos.services import CalculadoraRiscoSanitarioService


class GerenciarCNAEsUseCase:
    """
    Caso de Uso responsável por atualizar a lista de CNAEs vinculados a um Estabelecimento:
    - Valida a existência dos CNAEs no catálogo
    - Garante exatamente 1 CNAE Principal
    - Recalcula e atualiza o Grau de Risco Sanitário Preponderante do Estabelecimento
    - Registra a alteração na Trilha de Auditoria
    """

    def __init__(
        self,
        estabelecimento_repo: IEstabelecimentoRepository,
        cnae_repo: ICNAERepository,
        auditoria_repo: Optional[IAuditoriaRepository] = None,
    ) -> None:
        self.estabelecimento_repo = estabelecimento_repo
        self.cnae_repo = cnae_repo
        self.auditoria_repo = auditoria_repo

    async def execute(
        self,
        estabelecimento_id: uuid.UUID,
        cnaes_input: List[VinculoCNAEInputDTO],
        usuario_id: Optional[uuid.UUID] = None,
        usuario_nome: Optional[str] = None,
        ip_origem: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> EstabelecimentoResponseDTO:
        estabelecimento = await self.estabelecimento_repo.get_by_id(estabelecimento_id)
        if not estabelecimento:
            raise ValueError(f"Estabelecimento com ID {estabelecimento_id} não encontrado.")

        principais = [c for c in cnaes_input if c.eh_principal]
        if len(principais) != 1:
            raise CNAEInvalidoException(
                f"O estabelecimento deve possuir exatamente 1 CNAE marcado como principal. Informados: {len(principais)}."
            )

        novos_vinculos: List[VinculoCNAE] = []
        cnaes_entities: List[CNAE] = []

        for c_in in cnaes_input:
            clean_code = c_in.cnae_codigo.strip()
            cnae_ent = await self.cnae_repo.get_by_codigo(clean_code)
            if not cnae_ent:
                raise CNAEInvalidoException(f"CNAE '{clean_code}' não encontrado no catálogo do sistema.")

            cnaes_entities.append(cnae_ent)
            novos_vinculos.append(
                VinculoCNAE(
                    id=uuid.uuid4(),
                    estabelecimento_id=estabelecimento_id,
                    cnae_id=cnae_ent.id,
                    cnae_codigo=cnae_ent.codigo,
                    eh_principal=c_in.eh_principal,
                    data_inicio_atividade=c_in.data_inicio_atividade,
                    cnae=cnae_ent,
                )
            )

        # Substituição dos vínculos no repositório
        await self.estabelecimento_repo.substituir_cnaes(estabelecimento_id, novos_vinculos)

        # Recálculo do Risco Preponderante
        novo_risco = CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_entities)
        risco_anterior = estabelecimento.nivel_risco

        estabelecimento.atualizar_risco(novo_risco)
        estabelecimento.cnaes = novos_vinculos
        atualizado = await self.estabelecimento_repo.update(estabelecimento)

        # Auditoria da alteração de atividades econômicas e risco
        if self.auditoria_repo:
            log_cnae = LogAuditoria(
                id=uuid.uuid4(),
                tabela_afetada="estabelecimento_cnaes",
                registro_id=str(estabelecimento_id),
                identificador_entidade=atualizado.razao_social,
                operacao=TipoOperacaoAuditoria.UPDATE,
                acao="Atualização de CNAEs e Risco Sanitário",
                detalhes=f"CNAEs redefinidos. Risco anterior: {risco_anterior.value} -> Novo risco: {novo_risco.value}.",
                dados_anteriores={"nivel_risco": risco_anterior.value},
                dados_novos={
                    "nivel_risco": novo_risco.value,
                    "cnaes": [c.cnae_codigo for c in novos_vinculos],
                },
                usuario_id=usuario_id,
                usuario_nome=usuario_nome,
                ip_origem=ip_origem,
                user_agent=user_agent,
            )
            await self.auditoria_repo.registrar(log_cnae)

        return EstabelecimentoResponseDTO.model_validate(atualizado)
