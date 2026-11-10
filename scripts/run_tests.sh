#!/usr/bin/env bash
set -e

# Raiz do projeto
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "=========================================================="
echo "  VigiMinas - Execução de Testes com PostgreSQL Docker"
echo "=========================================================="

# 1. Inicia o container PostgreSQL isolado
echo "[1/3] Garantindo container PostgreSQL de teste (porta 5436)..."
docker compose -f "$ROOT_DIR/docker-compose.test.yml" up -d test_db

# 2. Executa migrations via Alembic
echo "[2/3] Aplicando migrações do Alembic no banco de testes..."
export DATABASE_URL="postgresql+asyncpg://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db"
export DATABASE_URL_SYNC="postgresql+psycopg2://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db"

if [ -f "$ROOT_DIR/.venv/bin/python" ]; then
    PYTHON_CMD="$ROOT_DIR/.venv/bin/python"
    PYTEST_CMD="$ROOT_DIR/.venv/bin/pytest"
else
    PYTHON_CMD="python"
    PYTEST_CMD="pytest"
fi

$PYTHON_CMD -m alembic upgrade head

# 3. Dispara Pytest
echo "[3/3] Executando suíte do Pytest..."
$PYTEST_CMD "$@"

