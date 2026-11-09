"""
Caso de Uso: Emissão Oficial de Alvará Sanitário Municipal
"""
from datetime import date, timedelta
import uuid

from app.application.licenciamento.dtos import (
    AlvaraSanitarioOutputDTO,
    EmitirAlvaraSanitarioInputDTO,
)
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.domain.fiscalizacao.repositories import IInspecaoRepository
from app.domain.licenciamento.entities import AlvaraSanitario, StatusAlvara, StatusRequerimento
from app.domain.licenciamento.repositories import IAlvaraRepository, IRequerimentoRepository
from app.domain.licenciamento.value_objects import (
    CodigoAutenticidadeAlvara,
    NumeroFormatadoAlvara,
)


class EmitirAlvaraSanitarioUseCase:
    """
    Emissão de Alvará Sanitário com numeração sequencial atômica por exercício,
    cálculo de validade e geração de código de autenticidade (QR Code).
    """
    def __init__(
        self,
        alvara_repo: IAlvaraRepository,
        requerimento_repo: IRequerimentoRepository,
        estabelecimento_repo: IEstabelecimentoRepository,
        inspecao_repo: IInspecaoRepository | None = None,
    ):
        self.alvara_repo = alvara_repo
        self.requerimento_repo = requerimento_repo
        self.estabelecimento_repo = estabelecimento_repo
        self.inspecao_repo = inspecao_repo

    async def execute(
        self,
        fiscal_emissor_id: uuid.UUID,
        input_dto: EmitirAlvaraSanitarioInputDTO,
    ) -> AlvaraSanitarioOutputDTO:
        # 1. Validar existência do estabelecimento
        estab = await self.estabelecimento_repo.buscar_por_id(input_dto.estabelecimento_id)
        if not estab:
            raise ValueError(f"Estabelecimento com ID '{input_dto.estabelecimento_id}' não encontrado.")
        if not estab.is_active or estab.is_deleted:
            raise ValueError("Não é possível emitir alvará para estabelecimento inativo ou excluído logicamente.")

        # 2. Invariante de Emissão: Verificar Deferimento Documental OU Inspeção Conclusiva
        if not input_dto.requerimento_id and not input_dto.inspecao_conclusiva_id:
            raise ValueError(
                "Invariante de Licenciamento: A emissão do alvará sanitário exige vinculação a um Requerimento deferido "
                "ou a uma Inspeção Conclusiva favorável."
            )

        if input_dto.requerimento_id:
            req = await self.requerimento_repo.buscar_por_id(input_dto.requerimento_id)
            if not req:
                raise ValueError(f"Requerimento com ID '{input_dto.requerimento_id}' não encontrado.")
            if req.estabelecimento_id != input_dto.estabelecimento_id:
                raise ValueError("O requerimento informado pertence a outro estabelecimento.")
            # Se ainda não estava deferido, defere formalmente no ato da expedição do título
            if req.status != StatusRequerimento.DEFERIDO:
                req.deferir(fiscal_emissor_id, "Requerimento deferido formalmente na expedição do Alvará Sanitário.")
                await self.requerimento_repo.salvar(req)

        if input_dto.inspecao_conclusiva_id and self.inspecao_repo:
            insp = await self.inspecao_repo.buscar_por_id(input_dto.inspecao_conclusiva_id)
            if not insp:
                raise ValueError(f"Inspeção com ID '{input_dto.inspecao_conclusiva_id}' não encontrada.")
            if insp.estabelecimento_id != input_dto.estabelecimento_id:
                raise ValueError("A inspeção conclusiva informada pertence a outro estabelecimento.")

        # 3. Numeração sequencial atômica por exercício anual
        hoje = date.today()
        exercicio = hoje.year
        proximo_numero = await self.alvara_repo.obter_proximo_numero_exercicio(exercicio)

        num_formatado_vo = NumeroFormatadoAlvara.criar(numero=proximo_numero, exercicio=exercicio)
        codigo_autenticidade_vo = CodigoAutenticidadeAlvara.gerar(exercicio=exercicio)

        # 4. Cálculo de validade (padrão de 365 dias para 12 meses)
        from app.core.constants import DIAS_MES_COMERCIAL, PRAZO_VALIDADE_ALVARA_DIAS

        if input_dto.validade_meses == 12:
            data_vencimento = hoje + timedelta(days=PRAZO_VALIDADE_ALVARA_DIAS)
        else:
            dias_validade = int(input_dto.validade_meses * DIAS_MES_COMERCIAL)
            data_vencimento = hoje + timedelta(days=dias_validade)

        # 5. Instanciar e salvar Alvará
        alvara = AlvaraSanitario(
            id=uuid.uuid4(),
            numero_alvara=proximo_numero,
            exercicio=exercicio,
            numero_formatado=num_formatado_vo.valor,
            estabelecimento_id=input_dto.estabelecimento_id,
            requerimento_id=input_dto.requerimento_id,
            inspecao_conclusiva_id=input_dto.inspecao_conclusiva_id,
            codigo_autenticidade=codigo_autenticidade_vo,
            data_emissao=hoje,
            data_vencimento=data_vencimento,
            status=StatusAlvara.ATIVO,
            emitido_por=fiscal_emissor_id,
            condicionantes_restricoes=input_dto.condicionantes_restricoes,
            url_alvara_pdf=input_dto.url_alvara_pdf,
        )

        salvo = await self.alvara_repo.salvar(alvara)

        return AlvaraSanitarioOutputDTO(
            id=salvo.id,
            numero_alvara=salvo.numero_alvara,
            exercicio=salvo.exercicio,
            numero_formatado=salvo.numero_formatado,
            estabelecimento_id=salvo.estabelecimento_id,
            requerimento_id=salvo.requerimento_id,
            inspecao_conclusiva_id=salvo.inspecao_conclusiva_id,
            codigo_autenticidade=salvo.codigo_autenticidade.valor,
            data_emissao=salvo.data_emissao,
            data_vencimento=salvo.data_vencimento,
            status=salvo.status,
            emitido_por=salvo.emitido_por,
            condicionantes_restricoes=salvo.condicionantes_restricoes,
            url_alvara_pdf=salvo.url_alvara_pdf,
            criado_em=salvo.criado_em,
        )
