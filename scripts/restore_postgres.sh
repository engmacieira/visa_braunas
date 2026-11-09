#!/usr/bin/env bash
# ==============================================================================
# VigiMinas - Script Utilitário de Restauração (Disaster Recovery) do PostgreSQL
# Município de Braúnas / MG - Vigilância Sanitária Municipal
# ==============================================================================
#
# DESCRIÇÃO:
#   Restaura um dump no formato custom (-Fc) gerado pelo pg_dump na base PostgreSQL.
#   Aplica opções de limpeza limpa (--clean --if-exists) para restaurar tabelas,
#   índices parciais, triggers e views sem exigir a remoção manual prévia do schema.
#
# USO:
#   ./scripts/restore_postgres.sh <caminho_do_arquivo.dump> [nome_do_banco]
#
# EXEMPLO:
#   ./scripts/restore_postgres.sh ./backups/vigiminas_backup_20261106_120000.dump
#
# VARIÁVEIS DE AMBIENTE SUPORTADAS (COM FALLBACKS):
#   PGHOST         - Host do banco de dados (padrão: localhost)
#   PGPORT         - Porta do PostgreSQL (padrão: 5434)
#   PGUSER         - Usuário do PostgreSQL (padrão: vigiminas_user)
#   PGDATABASE     - Nome da base de dados (padrão: vigiminas_db)
#   PGPASSWORD     - Senha de acesso (padrão: vigiminas_pass)
# ==============================================================================

set -euo pipefail

# 1. Validação dos argumentos de entrada
if [ "$#" -lt 1 ]; then
    echo "Erro: Parâmetros insuficientes!" >&2
    echo "Uso correto: $0 <caminho_do_arquivo.dump> [nome_do_banco]" >&2
    exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erro: O arquivo de backup especificado não existe: '$BACKUP_FILE'" >&2
    exit 1
fi

# 2. Configurações de conexão
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5434}"
PGUSER="${PGUSER:-vigiminas_user}"
PGDATABASE="${2:-${PGDATABASE:-vigiminas_db}}"
PGPASSWORD="${PGPASSWORD:-vigiminas_pass}"

export PGPASSWORD

START_TIME="$(date +%s)"
FILE_SIZE="$(du -h "$BACKUP_FILE" | cut -f1)"

echo "=============================================================================="
echo " [$(date '+%Y-%m-%d %H:%M:%S')] INICIANDO RESTAURAÇÃO DO POSTGRESQL (VigiMinas)"
echo " Arquivo Alvo : ${BACKUP_FILE} (${FILE_SIZE})"
echo " Banco Alvo   : ${PGDATABASE} em ${PGHOST}:${PGPORT} (Usuário: ${PGUSER})"
echo " Flags        : --clean --if-exists -v"
echo "=============================================================================="

# 3. Execução da restauração via pg_restore
# Nota: pg_restore pode retornar exit code 0 ou emitir avisos não fatais ao limpar objetos
# que ainda não existiam (tratados por --if-exists).
if pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" --clean --if-exists -v "$BACKUP_FILE"; then
    RESTORE_STATUS="SUCESSO"
else
    RESTORE_STATUS="CONCLUÍDO COM AVISOS (Verifique o log detalhado)"
fi

END_TIME="$(date +%s)"
DURATION=$((END_TIME - START_TIME))

echo "------------------------------------------------------------------------------"
echo " [$(date '+%Y-%m-%d %H:%M:%S')] RESTAURAÇÃO FINALIZADA: ${RESTORE_STATUS}"
echo " Duração Total : ${DURATION}s"
echo "=============================================================================="
