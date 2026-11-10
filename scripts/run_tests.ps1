<#
.SYNOPSIS
    Script automatizado de execução de testes do VigiMinas em ambiente isolado Docker.
.DESCRIPTION
    1. Sobe o container PostgreSQL de testes via Docker Compose na porta isolada 5436.
    2. Executa as migrations do Alembic no banco de teste.
    3. Roda a suíte do Pytest com o .env.test.
    4. Opcionalmente derruba o container após os testes se invocado com -Down.
#>
param(
    [switch]$Down,
    [string]$PytestArgs = ""
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  VigiMinas - Execução de Testes com PostgreSQL Docker" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Inicia o container PostgreSQL isolado
Write-Host "[1/3] Garantindo container PostgreSQL de teste (porta 5436)..." -ForegroundColor Yellow
docker compose -f "$RootDir\docker-compose.test.yml" up -d test_db

# 2. Executa migrations via Alembic
Write-Host "[2/3] Aplicando migrações do Alembic no banco de testes..." -ForegroundColor Yellow
$env:DATABASE_URL = "postgresql+asyncpg://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db"
$env:DATABASE_URL_SYNC = "postgresql+psycopg2://vigiminas_test_user:vigiminas_test_password@localhost:5436/vigiminas_test_db"

$pythonExe = "$RootDir\.venv\Scripts\python.exe"
if (-not (Test-Path $pythonExe)) {
    $pythonExe = "python"
}

& $pythonExe -m alembic upgrade head

# 3. Dispara Pytest
Write-Host "[3/3] Executando suíte do Pytest..." -ForegroundColor Green
$pytestExe = "$RootDir\.venv\Scripts\pytest.exe"
if (-not (Test-Path $pytestExe)) {
    $pytestExe = "pytest"
}

if ($PytestArgs) {
    & $pytestExe $PytestArgs.Split(" ")
} else {
    & $pytestExe
}

if ($Down) {
    Write-Host "Encerrando container Docker de testes (-Down)..." -ForegroundColor Gray
    docker compose -f "$RootDir\docker-compose.test.yml" down -v
}

