#!/usr/bin/env bash
# Backup operacional de data/ (SQLite online + CSVs + chave IA).
# Uso: ./scripts/backup_data.sh [label] [manter_N]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

LABEL="${1:-cron}"
MANTER="${2:-7}"

if [[ -x "$ROOT/.venv/bin/python" ]]; then
  PY="$ROOT/.venv/bin/python"
else
  PY="${PYTHON:-python3}"
fi

export PYTHONPATH="$ROOT"
"$PY" - <<PY
from app.backup_ops import criar_backup, podar_backups
pasta = criar_backup(label="${LABEL}")
removidas = podar_backups(manter=int("${MANTER}"))
print(f"OK backup → {pasta}")
if removidas:
    print(f"podados: {len(removidas)}")
PY
