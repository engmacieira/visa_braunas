from enum import Enum


class TipoSolicitacaoAlvara(str, Enum):
    CONCESSAO_INICIAL = "concessao_inicial"
    RENOVACAO = "renovacao"


class StatusRequerimento(str, Enum):
    PENDENTE = "pendente"
    EM_ANALISE = "em_analise"
    AGUARDANDO_INSPECAO = "aguardando_inspecao"
    AGUARDANDO_ADEQUACAO = "aguardando_adequacao"
    DEFERIDO = "deferido"
    INDEFERIDO = "indeferido"
    CANCELADO = "cancelado"


class StatusAlvara(str, Enum):
    ATIVO = "ativo"
    VENCIDO = "vencido"
    SUSPENSO = "suspenso"
    REVOGADO = "revogado"
    CASSADO = "cassado"
