#!/usr/bin/env bash
# Restaura um backup criado por scripts/backup_data.sh ou POST /api/sistema/backup.
# Uso: ./scripts/restore_data.sh data/backups/LABEL-STAMP
# ATENÇÃO: sobrescreve data/licitacoes.db (e opcionalmente powerbi / chave).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC="${1:-}"

if [[ -z "$SRC" || ! -d "$SRC" ]]; then
  echo "Uso: $0 data/backups/<pasta-do-backup>" >&2
  exit 1
fi

SRC="$(cd "$SRC" && pwd)"
if [[ ! -f "$SRC/licitacoes.db" ]]; then
  echo "Backup inválido: falta licitacoes.db em $SRC" >&2
  exit 1
fi

STAMP="$(date +%Y%m%d-%H%M%S)"
SAFE="$ROOT/data/backups/pre-restore-$STAMP"
mkdir -p "$SAFE"
if [[ -f "$ROOT/data/licitacoes.db" ]]; then
  cp -a "$ROOT/data/licitacoes.db" "$SAFE/"
fi

cp -a "$SRC/licitacoes.db" "$ROOT/data/licitacoes.db"
if [[ -f "$SRC/.ia_fernet_key" ]]; then
  cp -a "$SRC/.ia_fernet_key" "$ROOT/data/.ia_fernet_key"
fi
if [[ -d "$SRC/powerbi" ]]; then
  mkdir -p "$ROOT/data/powerbi"
  cp -a "$SRC/powerbi/." "$ROOT/data/powerbi/"
fi

echo "Restaurado a partir de $SRC"
echo "Cópia de segurança pré-restore em $SAFE"
echo "Reinicie o app/container para liberar handles do SQLite."
