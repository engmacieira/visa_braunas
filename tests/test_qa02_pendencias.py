"""
Suíte de Testes Automatizados da Sprint QA-02:
Resolução de Débitos Arquiteturais, Invariantes de Domínio e Contratos
"""
import ast
from datetime import date
from pathlib import Path
import uuid
import pytest

from app.application.fiscalizacao.dtos import InspecaoResponseDTO
from app.core.config import BaseSettings, settings
from app.domain.estabelecimentos.entities import (
    CNAE,
    NivelRiscoCNAE,
    NivelRiscoSanitario,
)
from app.domain.estabelecimentos.services import CalculadoraRiscoSanitarioService
from app.domain.fiscalizacao.entities import Inspecao, InvarianteInspecaoException
from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.infrastructure.base_model import Base, SoftDeleteAuditMixin
from app.infrastructure.models.auth_models import UsuarioModel
from app.infrastructure.models.estabelecimento_models import EstabelecimentoCnaeModel
from app.infrastructure.models.fiscalizacao_models import InspecaoModel
from app.presentation.routers.licenciamento_router import router as licenciamento_router
from app.presentation.routers.usuarios_router import router as usuarios_router
from sqlalchemy.dialects.postgresql import JSONB


# ==============================================================================
# FASE 1 - FUNDAÇÃO E INFRAESTRUTURA
# ==============================================================================
def test_pydantic_settings_v2_and_sync_driver():
    """Valida uso de pydantic_settings.BaseSettings e URL síncrona no Alembic."""
    assert BaseSettings.__module__ == "pydantic_settings.main"
    assert "psycopg2" in settings.DATABASE_URL_SYNC

    alembic_env_path = Path(__file__).resolve().parent.parent / "alembic" / "env.py"
    env_content = alembic_env_path.read_text(encoding="utf-8")
    assert "DATABASE_URL_SYNC" in env_content
    assert issubclass(SoftDeleteAuditMixin, object)
    assert issubclass(Base, object)


# ==============================================================================
# FASE 2 - AUTH, ISOLAMENTO E RBAC
# ==============================================================================
def test_domain_auth_strict_isolation():
    """Garante isolamento absoluto de app/domain/auth (zero sqlalchemy/pydantic)."""
    domain_auth_dir = Path(__file__).resolve().parent.parent / "app" / "domain" / "auth"
    for py_file in domain_auth_dir.glob("*.py"):
        tree = ast.parse(py_file.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for n in node.names:
                    assert "sqlalchemy" not in n.name, f"Import proibido de SQLAlchemy em {py_file.name}: {n.name}"
                    assert "pydantic" not in n.name, f"Import proibido de Pydantic em {py_file.name}: {n.name}"
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    assert "sqlalchemy" not in node.module, f"Import proibido de SQLAlchemy em {py_file.name}: {node.module}"
                    assert "pydantic" not in node.module, f"Import proibido de Pydantic em {py_file.name}: {node.module}"


def test_auth_partial_unique_indexes():
    """Valida sintaxe de índices parciais no dialeto PostgreSQL para usuários."""
    indexes = {idx.name: idx for idx in UsuarioModel.__table__.indexes}
    assert "uq_usuarios_cpf" in indexes
    assert "uq_usuarios_email" in indexes
    assert indexes["uq_usuarios_cpf"].unique is True
    assert indexes["uq_usuarios_email"].unique is True

    cpf_where = str(indexes["uq_usuarios_cpf"].dialect_options["postgresql"]["where"]).lower()
    email_where = str(indexes["uq_usuarios_email"].dialect_options["postgresql"]["where"]).lower()
    assert "is_deleted = false" in cpf_where
    assert "is_deleted = false" in email_where


def test_rbac_usuarios_routes():
    """Valida que todas as rotas de usuários exigem permissões de gestão."""
    for route in usuarios_router.routes:
        deps = [d.call for d in route.dependant.dependencies]
        # Pelo menos uma das dependências deve ser a checagem de role
        checker_deps = [d for d in deps if getattr(d, "__name__", "") == "role_checker"]
        assert len(checker_deps) >= 1, f"Rota {route.path} {route.methods} desprotegida de RBAC!"


# ==============================================================================
# FASE 3 - CNAES E CÁLCULO DE RISCO
# ==============================================================================
def test_estabelecimento_cnae_foreign_key_and_partial_index():
    """Valida FK cnae_id para cnaes.id e índice condicional do CNAE principal."""
    table = EstabelecimentoCnaeModel.__table__
    cnae_id_col = table.c.cnae_id
    assert len(cnae_id_col.foreign_keys) == 1
    fk = list(cnae_id_col.foreign_keys)[0]
    assert fk.target_fullname == "cnaes.id"
    assert "cnae_codigo" in table.c

    indexes = {idx.name: idx for idx in table.indexes}
    assert "uq_estabelecimento_cnae_principal" in indexes
    idx_princ = indexes["uq_estabelecimento_cnae_principal"]
    assert idx_princ.unique is True
    where_clause = str(idx_princ.dialect_options["postgresql"]["where"]).lower()
    assert "eh_principal = true" in where_clause
    assert "is_deleted = false" in where_clause


def test_calculadora_risco_precedencia():
    """Valida regra de precedência: Risco III > Risco II > Risco I > Dispensado."""
    def _cnae(grau: NivelRiscoCNAE) -> CNAE:
        return CNAE(
            id=uuid.uuid4(),
            codigo="0000-0/00",
            descricao="CNAE Teste",
            grau_risco_padrao=grau,
        )

    # 1. Risco III domina qualquer outro
    cnaes_com_risco_3 = [_cnae(NivelRiscoCNAE.DISPENSADO), _cnae(NivelRiscoCNAE.RISCO_I), _cnae(NivelRiscoCNAE.RISCO_III)]
    assert CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_com_risco_3) == NivelRiscoSanitario.RISCO_III

    # 2. Risco II domina Risco I e Dispensado
    cnaes_com_risco_2 = [_cnae(NivelRiscoCNAE.DISPENSADO), _cnae(NivelRiscoCNAE.RISCO_II), _cnae(NivelRiscoCNAE.RISCO_I)]
    assert CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_com_risco_2) == NivelRiscoSanitario.RISCO_II

    # 3. Risco I domina Dispensado
    cnaes_com_risco_1 = [_cnae(NivelRiscoCNAE.DISPENSADO), _cnae(NivelRiscoCNAE.RISCO_I)]
    assert CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_com_risco_1) == NivelRiscoSanitario.RISCO_I

    # 4. Todos Dispensados
    cnaes_dispensados = [_cnae(NivelRiscoCNAE.DISPENSADO)]
    assert CalculadoraRiscoSanitarioService.calcular_risco_cnaes(cnaes_dispensados) == NivelRiscoSanitario.RISCO_I


# ==============================================================================
# FASE 4 - FISCALIZAÇÃO, INVARIANTES VAPT E NOTIFICAÇÕES
# ==============================================================================
def test_inspecao_vapt_invariants():
    """Valida bloqueio de conclusão de inspeção VAPT sem campos de saúde do trabalhador."""
    # Vistoria VAPT sem nome_local_trabalho deve falhar
    with pytest.raises(InvarianteInspecaoException) as exc_info:
        Inspecao(
            id=uuid.uuid4(),
            numero_termo="TI-2026/01",
            estabelecimento_id=uuid.uuid4(),
            fiscal_responsavel_id=uuid.uuid4(),
            data_inicio=date.today(),
            motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
            status=StatusInspecao.CONCLUIDA,
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            nome_local_trabalho="",
            principais_riscos_identificados="Ruído e calor",
        )
    assert "nome_local_trabalho" in str(exc_info.value)

    # Vistoria VAPT sem principais_riscos_identificados deve falhar
    with pytest.raises(InvarianteInspecaoException) as exc_info:
        Inspecao(
            id=uuid.uuid4(),
            numero_termo="TI-2026/02",
            estabelecimento_id=uuid.uuid4(),
            fiscal_responsavel_id=uuid.uuid4(),
            data_inicio=date.today(),
            motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
            status=StatusInspecao.CONCLUIDA,
            resultado=ResultadoInspecao.APROVADO,
            data_fim=date.today(),
            nome_local_trabalho="Galpão de Moagem",
            principais_riscos_identificados="",
        )
    assert "principais_riscos_identificados" in str(exc_info.value)

    # Vistoria VAPT válida deve ser aceita
    inspecao_valida = Inspecao(
        id=uuid.uuid4(),
        numero_termo="TI-2026/03",
        estabelecimento_id=uuid.uuid4(),
        fiscal_responsavel_id=uuid.uuid4(),
        data_inicio=date.today(),
        motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
        status=StatusInspecao.CONCLUIDA,
        resultado=ResultadoInspecao.APROVADO,
        data_fim=date.today(),
        nome_local_trabalho="Galpão de Moagem",
        principais_riscos_identificados="Ruído e poeira vegetal",
    )
    assert inspecao_valida.status == StatusInspecao.CONCLUIDA


def test_inspecoes_indices_e_tipos_flexiveis():
    """Valida índice de notificações pendentes e campos JSONB/dict."""
    table = InspecaoModel.__table__
    indexes = {idx.name: idx for idx in table.indexes}
    assert "idx_inspecoes_prazos_pendentes" in indexes
    where_clause = str(indexes["idx_inspecoes_prazos_pendentes"].dialect_options["postgresql"]["where"]).lower()
    assert "resultado = 'notificado_com_prazo'" in where_clause
    assert "is_deleted = false" in where_clause
    assert "is_active = true" in where_clause

    assert isinstance(table.c.checklist_respostas.type, JSONB)
    assert isinstance(table.c.relatorio_fotografico.type, JSONB)

    dto_fields = InspecaoResponseDTO.model_fields
    assert "dict" in str(dto_fields["checklist_respostas"].annotation).lower()
    assert "list" in str(dto_fields["relatorio_fotografico"].annotation).lower()


# ==============================================================================
# FASE 5 - LICENCIAMENTO, SINCRONISMO E QR CODE
# ==============================================================================
def test_licenciamento_trigger_migration_and_public_validation_route():
    """Valida migration 004 (trigger de alvará, FK denúncias) e rota pública de validação."""
    mig4_path = Path(__file__).resolve().parent.parent / "alembic" / "versions" / "004_licenciamento_denuncias.py"
    mig4_content = mig4_path.read_text(encoding="utf-8")

    assert "fn_sincronizar_alvara_estabelecimento" in mig4_content
    assert "trg_alvara_sincroniza_estabelecimento" in mig4_content
    assert "situacao_alvara = 'Válido'" in mig4_content
    assert "fk_inspecoes_denuncias" in mig4_content

    # Validar que a rota de validação por código é pública (sem autenticação)
    validar_route = None
    for r in licenciamento_router.routes:
        if "validar" in r.path:
            validar_route = r
            break
    assert validar_route is not None
    deps = [getattr(d.call, "__name__", str(d.call)).lower() for d in validar_route.dependant.dependencies]
    assert not any("user" in d or "role" in d or "auth" in d for d in deps), f"Rota pública possui autenticação: {deps}"


# ==============================================================================
# FASE 6 - INDICADORES E FRONTEND
# ==============================================================================
def test_indicadores_views_usage_and_frontend_decoupling():
    """Valida consultas diretas a views sem N+1 e desacoplamento do Firestore."""
    repo_path = (
        Path(__file__).resolve().parent.parent
        / "app"
        / "infrastructure"
        / "repositories"
        / "indicadores_read_repository.py"
    )
    repo_content = repo_path.read_text(encoding="utf-8")
    assert "vw_indicador_11_vapt_consolidado" in repo_content
    assert "vw_estabelecimentos_risco_consolidado" in repo_content
    assert "func.count" in repo_content

    # Checar frontends
    root_dir = Path(__file__).resolve().parent.parent
    frontend_api = root_dir / "frontend" / "src" / "services" / "vigiminasApi.ts"
    if frontend_api.exists():
        content = frontend_api.read_text(encoding="utf-8")
        assert "firebase/firestore" not in content
        assert "getDocs(" not in content
        assert "apiClient" in content
