"""
Constantes Globais do Sistema VigiMinas.
Sprint QA-08 - Fonte Única de Verdade (SSOT) e Eliminação de Magic Values.
"""

# ==============================================================================
# PRAZOS LEGAIS E REGULATÓRIOS SANITÁRIOS (DIAS)
# ==============================================================================
PRAZO_VALIDADE_ALVARA_DIAS: int = 365
PRAZO_PADRAO_NOTIFICACAO_DIAS: int = 30
DIAS_MES_COMERCIAL: float = 30.4167

# ==============================================================================
# LIMITES DE UPLOAD E ARQUIVOS BINÁRIOS
# ==============================================================================
MAX_UPLOAD_SIZE_MB: int = 10
MAX_UPLOAD_SIZE_BYTES: int = MAX_UPLOAD_SIZE_MB * 1024 * 1024  # 10 MB em Bytes
UPLOAD_MAGIC_BYTES_INSPECTION_BUFFER: int = 2048
UPLOAD_CHUNK_SIZE_BYTES: int = 1024 * 64  # 64 KB por chunk

# ==============================================================================
# FORMATOS DE DATA E HORA
# ==============================================================================
DATE_FORMAT_BR: str = "%d/%m/%Y"
DATETIME_FORMAT_BR: str = "%d/%m/%Y %H:%M:%S"
DATETIME_FORMAT_ISO: str = "%Y-%m-%dT%H:%M:%SZ"

# ==============================================================================
# CABEÇALHOS HTTP CUSTOMIZADOS
# ==============================================================================
HEADER_RESPONSE_TIME: str = "X-Response-Time"
HEADER_FORWARDED_FOR: str = "x-forwarded-for"
HEADER_FORWARDED_PROTO: str = "x-forwarded-proto"

# ==============================================================================
# RATE LIMITING
# ==============================================================================
RATE_LIMIT_DEFAULT: str = "100/minute"
RATE_LIMIT_LOGIN: str = "5/minute"
RATE_LIMIT_PUBLIC: str = "30/minute"
RATE_LIMIT_RETRY_AFTER_SECONDS: str = "60"

# ==============================================================================
# STATUS OPERACIONAL DO SISTEMA
# ==============================================================================
STATUS_OPERACIONAL: str = "operacional"
STATUS_HEALTHY: str = "healthy"
STATUS_DEGRADED: str = "degraded"
STATUS_ONLINE: str = "online"
STATUS_OFFLINE: str = "offline"
