from enum import Enum


class TipoMotivoInspecao(str, Enum):
    REQUERIMENTO_ALVARA = "requerimento_alvara"
    ROTINA_PROGRAMADA = "rotina_programada"
    DENUNCIA = "denuncia"
    REINSPECAO = "reinspecao"
    VAPT_TRABALHADOR = "vapt_trabalhador"
    INVESTIGACAO_SURTO = "investigacao_surto"


class StatusInspecao(str, Enum):
    AGENDADA = "agendada"
    EM_ANDAMENTO = "em_andamento"
    CONCLUIDA = "concluida"
    CANCELADA = "cancelada"


class ResultadoInspecao(str, Enum):
    APROVADO = "aprovado"
    APROVADO_COM_EXIGENCIAS = "aprovado_com_exigencias"
    NOTIFICADO_COM_PRAZO = "notificado_com_prazo"
    AUTO_INFRACAO = "auto_infracao"
    INTERDITADO_PARCIALMENTE = "interditado_parcialmente"
    INTERDITADO_TOTALMENTE = "interditado_totalmente"
    INDEFERIDO = "indeferido"
