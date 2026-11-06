from enum import Enum


class CanalDenuncia(str, Enum):
    FORMULARIO_WEB = "formulario_web"
    PRESENCIAL = "presencial"
    TELEFONE = "telefone"
    OUVIDORIA_GERAL = "ouvidoria_geral"
    OFICIO_MINISTERIO = "oficio_ministerio"


class StatusDenuncia(str, Enum):
    RECEBIDA = "recebida"
    EM_ANALISE = "em_analise"
    EM_APURACAO_FISCAL = "em_apuracao_fiscal"
    PROCEDENTE = "procedente"
    IMPROCEDENTE = "improcedente"
    ARQUIVADA = "arquivada"


class GravidadeDenuncia(str, Enum):
    BAIXA = "baixa"
    MEDIA = "media"
    ALTA = "alta"
    URGENTE = "urgente"
