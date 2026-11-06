"""
Testes Unitários: Validador Seguro de Uploads Binários (Magic Bytes e Tamanho Máximo).
Sprint QA-05 - VigiMinas.
"""
import io
import pytest
from fastapi import HTTPException, UploadFile

from app.core.upload_validator import validate_uploaded_file


@pytest.mark.asyncio
async def test_upload_pdf_legitimo_sucesso_com_reset_ponteiro():
    """Valida que arquivo com cabeçalho PDF válido é aceito e o ponteiro é resetado para 0."""
    conteudo_pdf = b"%PDF-1.4\n1 0 obj\n<< /Title (Laudo Tecnico Braunas) >>\nendobj\n%%EOF"
    arquivo = UploadFile(
        file=io.BytesIO(conteudo_pdf),
        filename="termo_notificacao.pdf",
    )

    # Não deve lançar exceção
    await validate_uploaded_file(arquivo)

    # Verifica se o ponteiro foi devidamente resetado para 0
    bytes_apos_validacao = await arquivo.read()
    assert bytes_apos_validacao == conteudo_pdf


@pytest.mark.asyncio
async def test_upload_imagem_png_e_jpeg_legitimas():
    """Valida que arquivos PNG e JPEG com magic bytes corretos são aceitos."""
    conteudo_png = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR..."
    arquivo_png = UploadFile(
        file=io.BytesIO(conteudo_png),
        filename="foto_fachada.png",
    )
    await validate_uploaded_file(arquivo_png)
    assert await arquivo_png.read() == conteudo_png

    conteudo_jpeg = b"\xff\xd8\xff\xe0\x00\x10JFIF..."
    arquivo_jpeg = UploadFile(
        file=io.BytesIO(conteudo_jpeg),
        filename="registro_sanitario.jpg",
    )
    await validate_uploaded_file(arquivo_jpeg)
    assert await arquivo_jpeg.read() == conteudo_jpeg


@pytest.mark.asyncio
async def test_upload_rejeita_script_ou_executavel_disfarcado_de_pdf():
    """
    Bloqueio de arquivo executável (ELF / Shell script) maliciosamente renomeado para .pdf.
    A divergência de Magic Bytes deve levantar HTTPException 400.
    """
    conteudo_malicioso = b"#!/bin/bash\nrm -rf / --no-preserve-root\n"
    arquivo_script = UploadFile(
        file=io.BytesIO(conteudo_malicioso),
        filename="termo_falso.pdf",
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_uploaded_file(arquivo_script)

    assert exc_info.value.status_code == 400
    assert "assinatura binária não corresponde" in exc_info.value.detail.lower()
    # Verifica que ponteiro foi resetado mesmo após erro
    assert await arquivo_script.read() == conteudo_malicioso


@pytest.mark.asyncio
async def test_upload_rejeita_executavel_pe_disfarcado_de_png():
    """Bloqueio de binário Windows (MZ) com extensão .png."""
    conteudo_exe = b"MZ\x90\x00\x03\x00\x00\x00\x04\x00..."
    arquivo_exe = UploadFile(
        file=io.BytesIO(conteudo_exe),
        filename="imagem_trojan.png",
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_uploaded_file(arquivo_exe)

    assert exc_info.value.status_code == 400
    assert "assinatura binária não corresponde" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_upload_rejeita_arquivo_vazio():
    """Arquivo de 0 bytes deve ser bloqueado com erro 400."""
    arquivo_vazio = UploadFile(
        file=io.BytesIO(b""),
        filename="vazio.pdf",
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_uploaded_file(arquivo_vazio)

    assert exc_info.value.status_code == 400
    assert "vazio ou corrompido" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_upload_rejeita_extensao_nao_permitida():
    """Extensões não homologadas (.exe, .sh, .docx) devem ser rejeitadas de imediato."""
    arquivo_sh = UploadFile(
        file=io.BytesIO(b"echo hello"),
        filename="script.sh",
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_uploaded_file(arquivo_sh)

    assert exc_info.value.status_code == 400
    assert "não permitida" in exc_info.value.detail.lower()


@pytest.mark.asyncio
async def test_upload_rejeita_arquivo_acima_do_tamanho_maximo():
    """
    Arquivo que excede o limite configurado (ex: simulando 11 MB ou limite de 1 MB)
    deve ser bloqueado com status 400.
    """
    # Cria payload com cabeçalho PDF válido mas tamanho de 2 MB quando o limite é 1 MB
    cabecalho = b"%PDF-1.4\n"
    corpo_grande = b"A" * (2 * 1024 * 1024)
    arquivo_pesado = UploadFile(
        file=io.BytesIO(cabecalho + corpo_grande),
        filename="relatorio_pesado.pdf",
    )

    with pytest.raises(HTTPException) as exc_info:
        await validate_uploaded_file(arquivo_pesado, max_size_mb=1)

    assert exc_info.value.status_code == 400
    assert "excede o limite máximo" in exc_info.value.detail.lower()
