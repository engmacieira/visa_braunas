#!/usr/bin/env python3
"""
==============================================================================
Script de Backup do Banco de Dados Supabase - VigiMinas
==============================================================================
Gera backups do banco de dados PostgreSQL hospedado no Supabase.
Lê automaticamente as credenciais do arquivo .env da raiz do projeto.

Exemplos de uso:
    python backup_supabase.py                     # Backup completo (Schema + Dados) em .sql
    python backup_supabase.py --data-only         # Backup apenas dos dados (INSERTs)
    python backup_supabase.py --schema-only       # Backup apenas da estrutura (DDL)
    python backup_supabase.py --format dump       # Backup comprimido binário (.dump / pg_restore)
    python backup_supabase.py --retention 7       # Remove backups com mais de 7 dias
==============================================================================
"""

import argparse
import os
import re
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path
from urllib.parse import unquote, urlparse

# Diretório raiz do projeto
ROOT_DIR = Path(__file__).resolve().parent
ENV_PATH = ROOT_DIR / ".env"
BACKUP_DIR = ROOT_DIR / "backups"


def load_env_file(filepath: Path) -> dict:
    """Carrega variáveis do arquivo .env sem exigir dependências externas."""
    env_vars = {}
    if not filepath.exists():
        return env_vars

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip("'\"")
                env_vars[key] = val
    return env_vars


def find_pg_dump() -> str:
    """Localiza o executável pg_dump no PATH ou nos caminhos comuns de instalação no Windows."""
    # 1. Verifica no PATH
    found = shutil.which("pg_dump")
    if found:
        return found

    # 2. Verifica locais padrão de instalação do PostgreSQL no Windows
    candidates = [
        Path(r"C:\Program Files\PostgreSQL"),
        Path(r"C:\Program Files (x86)\PostgreSQL"),
    ]
    for base in candidates:
        if base.exists():
            for version_dir in sorted(base.glob("*"), reverse=True):
                candidate_exe = version_dir / "bin" / "pg_dump.exe"
                if candidate_exe.exists():
                    return str(candidate_exe)

    return ""


def parse_connection_params(env_vars: dict) -> dict:
    """Extrai parâmetros de conexão a partir do .env ou do ambiente do sistema."""
    # Prioridade de chaves de URL: DATABASE_URL_SYNC ou DATABASE_URL
    db_url = (
        os.getenv("DATABASE_URL_SYNC")
        or env_vars.get("DATABASE_URL_SYNC")
        or os.getenv("DATABASE_URL")
        or env_vars.get("DATABASE_URL")
    )

    if db_url:
        # Remove prefixos de dialeto como 'postgresql+psycopg2://' ou 'postgresql+asyncpg://'
        clean_url = re.sub(r"^postgresql\+[a-zA-Z0-9_-]+://", "postgresql://", db_url)
        parsed = urlparse(clean_url)

        return {
            "host": parsed.hostname or "localhost",
            "port": str(parsed.port or 5432),
            "user": unquote(parsed.username) if parsed.username else "postgres",
            "password": unquote(parsed.password) if parsed.password else "",
            "dbname": parsed.path.lstrip("/") or "postgres",
        }

    # Fallback para variáveis individuais se não houver DATABASE_URL
    return {
        "host": os.getenv("PGHOST") or env_vars.get("PGHOST", "localhost"),
        "port": os.getenv("PGPORT") or env_vars.get("PGPORT", "5432"),
        "user": os.getenv("PGUSER") or env_vars.get("POSTGRES_USER") or env_vars.get("PGUSER", "postgres"),
        "password": os.getenv("PGPASSWORD") or env_vars.get("POSTGRES_PASSWORD") or env_vars.get("PGPASSWORD", ""),
        "dbname": os.getenv("PGDATABASE") or env_vars.get("POSTGRES_DB") or env_vars.get("PGDATABASE", "postgres"),
    }


def clean_old_backups(backup_dir: Path, retention_days: int) -> int:
    """Remove arquivos de backup mais antigos que a retenção informada."""
    if retention_days <= 0:
        return 0

    now = time.time()
    cutoff = now - (retention_days * 86400)
    removed_count = 0

    for file in backup_dir.glob("supabase_backup_*.*"):
        if file.is_file() and file.stat().st_mtime < cutoff:
            try:
                file.unlink()
                print(f"   [Rotação] Expurgo de backup antigo: {file.name}")
                removed_count += 1
            except Exception as e:
                print(f"   [Aviso] Falha ao remover {file.name}: {e}")

    return removed_count


def human_size(bytes_val: int) -> str:
    """Formata bytes para leitura humana."""
    for unit in ["B", "KB", "MB", "GB"]:
        if abs(bytes_val) < 1024.0:
            return f"{bytes_val:3.1f} {unit}"
        bytes_val /= 1024.0
    return f"{bytes_val:.1f} TB"


def main():
    parser = argparse.ArgumentParser(
        description="Gera backup do banco de dados Supabase (VigiMinas).",
        formatter_class=argparse.RawTextHelpFormatter,
    )
    parser.add_argument(
        "--data-only",
        action="store_true",
        help="Gera backup somente dos dados das tabelas (INSERTs).",
    )
    parser.add_argument(
        "--schema-only",
        action="store_true",
        help="Gera backup somente da estrutura/DDL (tabelas, tipos, funções, triggers).",
    )
    parser.add_argument(
        "--schema",
        default="public",
        help="Esquema a ser exportado (padrão: public - evita erros em esquemas internos do Supabase).",
    )
    parser.add_argument(
        "--format",
        choices=["sql", "dump"],
        default="sql",
        help="Formato do arquivo:\n  sql  = texto puro SQL legível (padrão)\n  dump = formato binário customizado (-Fc) para pg_restore",
    )
    parser.add_argument(
        "--retention",
        type=int,
        default=0,
        help="Número de dias para reter backups antigos. 0 desativa a rotação automática.",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=BACKUP_DIR,
        help="Diretório de destino dos arquivos de backup (padrão: ./backups).",
    )

    args = parser.parse_args()

    # 1. Carrega parâmetros do .env
    env_vars = load_env_file(ENV_PATH)
    conn = parse_connection_params(env_vars)

    if not conn["password"]:
        print("[ERRO] Nenhuma senha de banco encontrada no .env ou nas variáveis de ambiente.")
        sys.exit(1)

    # 2. Localiza pg_dump
    pg_dump_bin = find_pg_dump()
    if not pg_dump_bin:
        print("[ERRO] O utilitário 'pg_dump' não foi encontrado no PATH nem nos diretórios padrão do PostgreSQL.")
        print("Certifique-se de que o PostgreSQL client tools está instalado.")
        sys.exit(1)

    # 3. Prepara diretório de destino
    output_dir: Path = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    mode_tag = "data" if args.data_only else ("schema" if args.schema_only else "full")
    ext = "dump" if args.format == "dump" else "sql"
    filename = f"supabase_backup_{mode_tag}_{timestamp}.{ext}"
    filepath = output_dir / filename

    # 4. Monta argumentos para o pg_dump
    cmd = [
        pg_dump_bin,
        "-h", conn["host"],
        "-p", conn["port"],
        "-U", conn["user"],
        "-d", conn["dbname"],
        "--no-owner",
        "--no-acl",
    ]

    if args.schema:
        cmd.extend(["--schema", args.schema])

    if args.data_only:
        cmd.append("--data-only")
        if args.format == "sql":
            cmd.append("--inserts")
    elif args.schema_only:
        cmd.append("--schema-only")

    if args.format == "dump":
        cmd.extend(["-Fc", "-f", str(filepath)])
    else:
        cmd.extend(["-f", str(filepath)])

    # 5. Executa pg_dump
    env = os.environ.copy()
    env["PGPASSWORD"] = conn["password"]

    print("=" * 78)
    print(f" [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] INICIANDO BACKUP DO SUPABASE")
    print(f" Host      : {conn['host']}:{conn['port']}")
    print(f" Banco     : {conn['dbname']} (Schema: {args.schema})")
    print(f" Modo      : {mode_tag.upper()} ({'Dados' if args.data_only else ('Estrutura' if args.schema_only else 'Estrutura + Dados')})")
    print(f" Formato   : {args.format.upper()}")
    print(f" Destino   : {filepath}")
    print("=" * 78)

    start_time = time.time()
    try:
        result = subprocess.run(cmd, env=env, capture_output=True, text=True)
    except Exception as e:
        print(f"\n[ERRO CRÍTICO] Falha ao disparar o subprocesso pg_dump: {e}")
        sys.exit(1)

    duration = time.time() - start_time

    if result.returncode != 0:
        print(f"\n[ERRO CRÍTICO] pg_dump falhou com código {result.returncode}!")
        if result.stderr:
            print("Detalhes do erro:")
            print(result.stderr)
        # Remove arquivo corrompido ou vazio se gerado
        if filepath.exists() and filepath.stat().st_size == 0:
            filepath.unlink()
        sys.exit(1)

    file_size = filepath.stat().st_size if filepath.exists() else 0
    print("-" * 78)
    print(f" [{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] BACKUP CONCLUÍDO COM SUCESSO!")
    print(f" Arquivo Gerado: {filepath.name}")
    print(f" Caminho Total : {filepath.resolve()}")
    print(f" Tamanho       : {human_size(file_size)}")
    print(f" Duração       : {duration:.2f} segundos")
    print("-" * 78)

    # 6. Rotação de backups antigos (se solicitada)
    if args.retention > 0:
        print(f" Verificando retenção ({args.retention} dias)...")
        removed = clean_old_backups(output_dir, args.retention)
        if removed == 0:
            print(" Nenhum backup expirado encontrado.")

    # 7. Dicas de restauração
    print("\n Dicas de Restauração:")
    if args.format == "sql":
        print(f"  • Via psql:")
        print(f'    psql -h {conn["host"]} -p {conn["port"]} -U {conn["user"]} -d {conn["dbname"]} -f "{filepath}"')
        print(f"  • Ou abra o arquivo '{filepath.name}' diretamente no SQL Editor do Supabase.")
    else:
        print(f"  • Via pg_restore:")
        print(f'    pg_restore -h {conn["host"]} -p {conn["port"]} -U {conn["user"]} -d {conn["dbname"]} --clean --if-exists "{filepath}"')
    print("=" * 78)


if __name__ == "__main__":
    main()

