"""
Casos de Uso: Gestão de Denúncias e Ouvidoria Sanitária
"""
from datetime import datetime
import uuid

from app.application.ouvidoria.dtos import (
    ConcluirDenunciaInputDTO,
    DenunciaOutputDTO,
    DespacharDenunciaInputDTO,
    RegistrarDenunciaInputDTO,
)
from app.domain.auth.repositories import IUsuarioRepository
from app.domain.estabelecimentos.repositories import IEstabelecimentoRepository
from app.domain.ouvidoria.entities import Denuncia, StatusDenuncia
from app.domain.ouvidoria.repositories import IDenunciaRepository
from app.domain.ouvidoria.value_objects import NumeroProtocoloDenuncia


class RegistrarDenunciaUseCase:
    """
    Entrada pelo portal web ou balcão da vigilância com geração de protocolo público seguro
    """
    def __init__(
        self,
        denuncia_repo: IDenunciaRepository,
        estabelecimento_repo: IEstabelecimentoRepository,
    ):
        self.denuncia_repo = denuncia_repo
        self.estabelecimento_repo = estabelecimento_repo

    async def execute(self, input_dto: RegistrarDenunciaInputDTO) -> DenunciaOutputDTO:
        # 1. Se informou estabelecimento, validar existência
        if input_dto.estabelecimento_id:
            estab = await self.estabelecimento_repo.buscar_por_id(input_dto.estabelecimento_id)
            if not estab:
                raise ValueError(f"Estabelecimento com ID '{input_dto.estabelecimento_id}' não encontrado.")

        # 2. Gerar número de protocolo sequencial anual
        ano_corrente = datetime.now().year
        seq = await self.denuncia_repo.obter_proximo_sequencial(ano_corrente)
        protocolo_vo = NumeroProtocoloDenuncia.gerar(sequencial=seq, exercicio=ano_corrente)

        # 3. Tratamento de anonimato / sigilo de acordo com a invariante de domínio
        nome = input_dto.denunciante_nome if not input_dto.denunciante_anonimo else None
        tel = input_dto.denunciante_telefone if not input_dto.denunciante_anonimo else None
        email = input_dto.denunciante_email if not input_dto.denunciante_anonimo else None

        denuncia = Denuncia(
            id=uuid.uuid4(),
            numero_protocolo=protocolo_vo,
            local_denunciado_identificacao=input_dto.local_denunciado_identificacao.strip(),
            relato_denuncia=input_dto.relato_denuncia.strip(),
            origem=input_dto.origem,
            gravidade=input_dto.gravidade,
            status=StatusDenuncia.RECEBIDA,
            estabelecimento_id=input_dto.estabelecimento_id,
            logradouro=input_dto.logradouro,
            numero=input_dto.numero,
            bairro=input_dto.bairro,
            ponto_referencia=input_dto.ponto_referencia,
            denunciante_anonimo=input_dto.denunciante_anonimo,
            denunciante_nome=nome,
            denunciante_telefone=tel,
            denunciante_email=email,
            url_anexos_evidencias=input_dto.url_anexos_evidencias or [],
        )

        salva = await self.denuncia_repo.salvar(denuncia)

        return DenunciaOutputDTO(
            id=salva.id,
            numero_protocolo=salva.numero_protocolo.valor,
            data_recebimento=salva.data_recebimento,
            origem=salva.origem,
            gravidade=salva.gravidade,
            status=salva.status,
            estabelecimento_id=salva.estabelecimento_id,
            local_denunciado_identificacao=salva.local_denunciado_identificacao,
            logradouro=salva.logradouro,
            numero=salva.numero,
            bairro=salva.bairro,
            ponto_referencia=salva.ponto_referencia,
            denunciante_anonimo=salva.denunciante_anonimo,
            denunciante_nome=salva.denunciante_nome,
            denunciante_telefone=salva.denunciante_telefone,
            denunciante_email=salva.denunciante_email,
            url_anexos_evidencias=salva.url_anexos_evidencias,
            fiscal_designado_id=salva.fiscal_designado_id,
            despacho_coordenacao=salva.despacho_coordenacao,
            conclusao_apuracao=salva.conclusao_apuracao,
            resposta_ao_denunciante=salva.resposta_ao_denunciante,
            data_encerramento=salva.data_encerramento,
            finalizado_por=salva.finalizado_por,
            criado_em=salva.criado_em,
        )


class DespacharDenunciaUseCase:
    """
    Atribuição de fiscal técnico, despacho da coordenação e conversão em averiguação/inspeção in loco
    """
    def __init__(
        self,
        denuncia_repo: IDenunciaRepository,
        usuario_repo: IUsuarioRepository,
    ):
        self.denuncia_repo = denuncia_repo
        self.usuario_repo = usuario_repo

    async def execute(
        self,
        denuncia_id: uuid.UUID,
        input_dto: DespacharDenunciaInputDTO,
    ) -> DenunciaOutputDTO:
        denuncia = await self.denuncia_repo.buscar_por_id(denuncia_id)
        if not denuncia:
            raise ValueError(f"Denúncia com ID '{denuncia_id}' não encontrada.")

        if input_dto.fiscal_designado_id:
            fiscal = await self.usuario_repo.buscar_por_id(input_dto.fiscal_designado_id)
            if not fiscal:
                raise ValueError(f"Fiscal com ID '{input_dto.fiscal_designado_id}' não encontrado.")

        denuncia.despachar(
            fiscal_id=input_dto.fiscal_designado_id,
            despacho=input_dto.despacho_coordenacao,
            nova_gravidade=input_dto.nova_gravidade,
            iniciar_apuracao=input_dto.iniciar_apuracao,
        )

        salva = await self.denuncia_repo.salvar(denuncia)

        return DenunciaOutputDTO(
            id=salva.id,
            numero_protocolo=salva.numero_protocolo.valor,
            data_recebimento=salva.data_recebimento,
            origem=salva.origem,
            gravidade=salva.gravidade,
            status=salva.status,
            estabelecimento_id=salva.estabelecimento_id,
            local_denunciado_identificacao=salva.local_denunciado_identificacao,
            logradouro=salva.logradouro,
            numero=salva.numero,
            bairro=salva.bairro,
            ponto_referencia=salva.ponto_referencia,
            denunciante_anonimo=salva.denunciante_anonimo,
            denunciante_nome=salva.denunciante_nome,
            denunciante_telefone=salva.denunciante_telefone,
            denunciante_email=salva.denunciante_email,
            url_anexos_evidencias=salva.url_anexos_evidencias,
            fiscal_designado_id=salva.fiscal_designado_id,
            despacho_coordenacao=salva.despacho_coordenacao,
            conclusao_apuracao=salva.conclusao_apuracao,
            resposta_ao_denunciante=salva.resposta_ao_denunciante,
            data_encerramento=salva.data_encerramento,
            finalizado_por=salva.finalizado_por,
            criado_em=salva.criado_em,
        )


class ConcluirDenunciaUseCase:
    """
    Encerramento motivado da denúncia (procedente, improcedente ou arquivada) com resposta ao cidadão
    """
    def __init__(self, denuncia_repo: IDenunciaRepository):
        self.denuncia_repo = denuncia_repo

    async def execute(
        self,
        denuncia_id: uuid.UUID,
        finalizado_por_id: uuid.UUID,
        input_dto: ConcluirDenunciaInputDTO,
    ) -> DenunciaOutputDTO:
        denuncia = await self.denuncia_repo.buscar_por_id(denuncia_id)
        if not denuncia:
            raise ValueError(f"Denúncia com ID '{denuncia_id}' não encontrada.")

        denuncia.concluir(
            finalizado_por_id=finalizado_por_id,
            status_final=input_dto.status,
            conclusao=input_dto.conclusao_apuracao,
            resposta_denunciante=input_dto.resposta_ao_denunciante,
        )

        salva = await self.denuncia_repo.salvar(denuncia)

        return DenunciaOutputDTO(
            id=salva.id,
            numero_protocolo=salva.numero_protocolo.valor,
            data_recebimento=salva.data_recebimento,
            origem=salva.origem,
            gravidade=salva.gravidade,
            status=salva.status,
            estabelecimento_id=salva.estabelecimento_id,
            local_denunciado_identificacao=salva.local_denunciado_identificacao,
            logradouro=salva.logradouro,
            numero=salva.numero,
            bairro=salva.bairro,
            ponto_referencia=salva.ponto_referencia,
            denunciante_anonimo=salva.denunciante_anonimo,
            denunciante_nome=salva.denunciante_nome,
            denunciante_telefone=salva.denunciante_telefone,
            denunciante_email=salva.denunciante_email,
            url_anexos_evidencias=salva.url_anexos_evidencias,
            fiscal_designado_id=salva.fiscal_designado_id,
            despacho_coordenacao=salva.despacho_coordenacao,
            conclusao_apuracao=salva.conclusao_apuracao,
            resposta_ao_denunciante=salva.resposta_ao_denunciante,
            data_encerramento=salva.data_encerramento,
            finalizado_por=salva.finalizado_por,
            criado_em=salva.criado_em,
        )
