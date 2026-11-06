"""
Validador Seguro e Determinístico de Arquivos Binários (Uploads).
Sprint QA-05 - VigiMinas.
"""
from typing import List, Optional
from fastapi import HTTPException, UploadFile, status

# Assinaturas binárias (Magic Bytes) esperadas por tipo MIME / extensão
MAGIC_BYTES_SIGNATURES = {
    "pdf": [b"%PDF-"],
    "png": [b"\x89PNG\r\n\x1a\n"],
    "jpeg": [b"\xff\xd8\xff"],
    "jpg": [b"\xff\xd8\xff"],
}

DEFAULT_ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg"]
DEFAULT_MAX_SIZE_MB = 10


def _obter_extensao(filename: Optional[str]) -> str:
    """Extrai a extensão normalizada sem ponto (ex: 'pdf', 'png')."""
    if not filename or "." not in filename:
        return ""
    return filename.rsplit(".", 1)[1].lower().strip()


async def validate_uploaded_file(
    file: UploadFile,
    allowed_types: Optional[List[str]] = None,
    max_size_mb: int = DEFAULT_MAX_SIZE_MB,
) -> None:
    """
    Validador determinístico de arquivos binários contra uploads maliciosos:
    1. Validação da extensão declarada pelo arquivo.
    2. Validação do tamanho máximo permitido sem estourar memória.
    3. Inspeção determinística dos primeiros 2048 bytes para bater contra Magic Bytes reais:
       - PDF: %PDF- (b"%PDF-")
       - PNG: \x89PNG\r\n\x1a\n (b"\x89PNG\r\n\x1a\n")
       - JPEG: \xff\xd8\xff (b"\xff\xd8\xff")
    4. Reset obrigatório do ponteiro (await file.seek(0)) após inspeção.
    5. Lançamento de HTTPException 400 com mensagem padronizada em caso de discrepância ou payload inválido.
    """
    if allowed_types is None:
        allowed_types = DEFAULT_ALLOWED_EXTENSIONS

    allowed_types_clean = [t.lower().replace(".", "").strip() for t in allowed_types]

    ext = _obter_extensao(file.filename)
    if not ext or ext not in allowed_types_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extensão de arquivo não permitida: '{ext}'. Extensões aceitas: {', '.join(allowed_types_clean)}",
        )

    # 1. Inspeção determinística dos magic bytes (primeiros 2048 bytes)
    header = await file.read(2048)
    if not header:
        await file.seek(0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo vazio ou corrompido",
        )

    valid_signatures = MAGIC_BYTES_SIGNATURES.get(ext, [])
    matches_magic_bytes = any(header.startswith(sig) for sig in valid_signatures)

    if not matches_magic_bytes:
        await file.seek(0)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Arquivo inválido ou corrompido: a assinatura binária não corresponde à extensão declarada",
        )

    # 2. Verificação de tamanho máximo
    # O arquivo já teve até 2048 bytes lidos. Lemos o restante em chunks para medir o tamanho total.
    max_bytes = max_size_mb * 1024 * 1024
    total_size = len(header)
    chunk_size = 1024 * 64  # 64 KB por chunk

    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        total_size += len(chunk)
        if total_size > max_bytes:
            await file.seek(0)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Tamanho do arquivo ({total_size / (1024 * 1024):.2f} MB) excede o limite máximo permitido de {max_size_mb} MB",
            )

    # 3. Reset MANDATÓRIO do cursor para permitir posterior leitura ou gravação
    await file.seek(0)
