#!/usr/bin/env bash
# ==============================================================================
# VigiMinas - Rotina Automatizada de Backup do PostgreSQL
# Município de Braúnas / MG - Vigilância Sanitária Municipal
# ==============================================================================
#
# DESCRIÇÃO:
#   Gera um dump comprimido custom (-Fc) da base de dados PostgreSQL do VigiMinas,
#   permitindo restauração seletiva e concorrente de esquemas e tabelas.
#   Aplica expurgo/rotação automático de arquivos com retenção superior a 7 dias,
#   executado unicamente após o sucesso confirmado do dump do dia corrente.
#
# VARIÁVEIS DE AMBIENTE SUPORTADAS (COM FALLBACKS):
#   PGHOST         - Host do banco de dados (padrão: localhost)
#   PGPORT         - Porta do PostgreSQL (padrão: 5434)
#   PGUSER         - Usuário do PostgreSQL (padrão: vigiminas_user)
#   PGDATABASE     - Nome da base de dados (padrão: vigiminas_db)
#   PGPASSWORD     - Senha de acesso (padrão: vigiminas_pass)
#   BACKUP_DIR     - Diretório de armazenamento (padrão: ./backups)
#   RETENTION_DAYS - Dias para expurgo de arquivos antigos (padrão: 7)
#
# ------------------------------------------------------------------------------
# INSTRUÇÕES DE DISASTER RECOVERY (RECUPERAÇÃO DE DESASTRES):
# ------------------------------------------------------------------------------
# 1. Obtenha o arquivo .dump mais recente ou desejado em $BACKUP_DIR.
# 2. Assegure que as variáveis de conexão estão definidas no ambiente:
#      export PGHOST=localhost
#      export PGPORT=5434
#      export PGUSER=vigiminas_user
#      export PGPASSWORD=vigiminas_pass
#      export PGDATABASE=vigiminas_db
# 3. Restauração direta com recriação de schema limpo (--clean --if-exists):
#      pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" \
#                 --clean --if-exists -v "/caminho/do/arquivo.dump"
# 4. Caso queira recriar o banco do zero via psql:
#      dropdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" --if-exists "$PGDATABASE"
#      createdb -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" "$PGDATABASE"
#      psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "CREATE EXTENSION IF NOT EXISTS pgcrypto;"
#      pg_restore -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -v "/caminho/do/arquivo.dump"
# 5. Ou utilize o script utilitário complementar:
#      ./scripts/restore_postgres.sh "/caminho/do/arquivo.dump"
# ==============================================================================

set -euo pipefail

# 1. Configurações de conexão e parâmetros de execução
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5434}"
PGUSER="${PGUSER:-vigiminas_user}"
PGDATABASE="${PGDATABASE:-vigiminas_db}"
PGPASSWORD="${PGPASSWORD:-vigiminas_pass}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"

export PGPASSWORD

# 2. Inicialização do ambiente de backup
mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILENAME="vigiminas_backup_${TIMESTAMP}.dump"
BACKUP_FILEPATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

START_TIME="$(date +%s)"
echo "=============================================================================="
echo " [$(date '+%Y-%m-%d %H:%M:%S')] INICIANDO BACKUP DO POSTGRESQL (VigiMinas)"
echo " Banco Alvo : ${PGDATABASE} em ${PGHOST}:${PGPORT} (Usuário: ${PGUSER})"
echo " Destino    : ${BACKUP_FILEPATH}"
echo " Formato    : Custom Comprimido (-Fc)"
echo "=============================================================================="

# 3. Execução do dump PostgreSQL
if pg_dump -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -Fc -f "$BACKUP_FILEPATH"; then
    END_TIME="$(date +%s)"
    DURATION=$((END_TIME - START_TIME))
    FILE_SIZE="$(du -h "$BACKUP_FILEPATH" | cut -f1)"

    echo "------------------------------------------------------------------------------"
    echo " [$(date '+%Y-%m-%d %H:%M:%S')] BACKUP CONCLUÍDO COM SUCESSO!"
    echo " Arquivo Gerado: ${BACKUP_FILENAME}"
    echo " Tamanho Final : ${FILE_SIZE}"
    echo " Duração Total : ${DURATION}s"
    echo "------------------------------------------------------------------------------"
else
    echo " [$(date '+%Y-%m-%d %H:%M:%S')] [ERRO CRÍTICO] Falha ao executar pg_dump no banco ${PGDATABASE}!" >&2
    exit 1
fi

# 4. Rotação e expurgo de backups antigos (> RETENTION_DAYS)
echo " [$(date '+%Y-%m-%d %H:%M:%S')] Executando rotação: removendo backups com mais de ${RETENTION_DAYS} dias..."

DELETED_COUNT=0
while IFS= read -r old_file; do
    if [ -n "$old_file" ]; then
        echo "   -> Expurgo: removendo backup antigo: $(basename "$old_file")"
        rm -f "$old_file"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done < <(find "$BACKUP_DIR" -type f -name "vigiminas_backup_*.dump" -mtime +"${RETENTION_DAYS}" 2>/dev/null || true)

echo " [$(date '+%Y-%m-%d %H:%M:%S')] Rotação finalizada. Total de arquivos removidos: ${DELETED_COUNT}."
echo " [$(date '+%Y-%m-%d %H:%M:%S')] Rotina de backup finalizada com sucesso."
echo "=============================================================================="
