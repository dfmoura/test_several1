#!/usr/bin/env bash
# Restaura um backup criado por scripts/backup_data.sh.
# Uso: ./scripts/restore_data.sh data/backups/LABEL-STAMP
# ATENÇÃO: sobrescreve data/observatorio.db
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-}"

if [[ -z "$SRC" || ! -d "$SRC" ]]; then
  echo "Uso: $0 data/backups/<pasta-do-backup>" >&2
  exit 1
fi

SRC="$(cd "$SRC" && pwd)"
if [[ ! -f "$SRC/observatorio.db" ]]; then
  echo "Backup inválido: falta observatorio.db em $SRC" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SAFE="$ROOT/data/backups/pre-restore-$STAMP"
mkdir -p "$SAFE"
if [[ -f "$ROOT/data/observatorio.db" ]]; then
  cp -a "$ROOT/data/observatorio.db" "$SAFE/"
fi

cp -a "$SRC/observatorio.db" "$ROOT/data/observatorio.db"

echo "Restaurado a partir de $SRC"
echo "Cópia de segurança pré-restore em $SAFE"
echo "Reinicie o app/container para liberar handles do SQLite."
