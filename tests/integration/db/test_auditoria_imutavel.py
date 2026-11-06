"""
Testes de Integração de Gatilhos e Integridade: Auditoria Imutável (Append-Only)
Sprint QA-04 - VigiMinas.

Cobre a trigger `trg_bloquear_modificacao_logs` associada à função `fn_impedir_violacao_auditoria()`:
1. Inserção permitida de registro na tabela `logs_auditoria`.
2. Tentativa explícita de UPDATE -> Abortada com exceção pelo PostgreSQL.
3. Tentativa explícita de DELETE -> Abortada com exceção pelo PostgreSQL.
"""

import uuid
import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import DBAPIError

from app.infrastructure.models import LogAuditoriaModel


@pytest.mark.asyncio
async def test_trigger_auditoria_bloqueia_update(async_db_session: AsyncSession):
    # Inserção permitida
    log_id = uuid.uuid4()
    log_entry = LogAuditoriaModel(
        id=log_id,
        tabela_afetada="estabelecimentos",
        registro_id=str(uuid.uuid4()),
        identificador_entidade="18.303.187/0001-44",
        operacao="INSERT",
        acao="Cadastro Inicial de Estabelecimento",
        detalhes="Registro de auditoria para fins de teste de imutabilidade.",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(log_entry)
    await async_db_session.flush()

    # Tentativa explícita de UPDATE via SQL direto
    stmt_update = text(
        "UPDATE logs_auditoria SET detalhes = 'Tentativa de adulterar histórico' WHERE id = :lid"
    )
    with pytest.raises(DBAPIError) as exc_info:
        await async_db_session.execute(stmt_update, {"lid": log_id})

    assert "estritamente imutável" in str(exc_info.value)
    await async_db_session.rollback()


@pytest.mark.asyncio
async def test_trigger_auditoria_bloqueia_delete(async_db_session: AsyncSession):
    log_id = uuid.uuid4()
    log_entry = LogAuditoriaModel(
        id=log_id,
        tabela_afetada="requerimentos_alvara",
        registro_id=str(uuid.uuid4()),
        identificador_entidade="REQ-2026-0001",
        operacao="HOMOLOGACAO",
        acao="Deferimento de Alvará",
        detalhes="Registro para teste de proibição de exclusão física.",
        is_active=True,
        is_deleted=False,
    )
    async_db_session.add(log_entry)
    await async_db_session.flush()

    # Tentativa explícita de DELETE via SQL direto
    stmt_delete = text(
        "DELETE FROM logs_auditoria WHERE id = :lid"
    )
    with pytest.raises(DBAPIError) as exc_info:
        await async_db_session.execute(stmt_delete, {"lid": log_id})

    assert "estritamente imutável" in str(exc_info.value)
    await async_db_session.rollback()
