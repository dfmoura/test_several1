#!/usr/bin/env bash
# Instala cron diário de backup (Free Tier / VM única).
# Uso: ./scripts/install_backup_cron.sh
# Remove: crontab -l | grep -v 'backup_data.sh' | crontab -
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT="$ROOT/scripts/backup_data.sh"
LOG_DIR="$ROOT/data/backups"
mkdir -p "$LOG_DIR"

LINE="15 3 * * * cd \"$ROOT\" && \"$SCRIPT\" cron 7 >> \"$LOG_DIR/cron.log\" 2>&1"

# Evita duplicar a mesma linha
EXISTENTE="$(crontab -l 2>/dev/null || true)"
if echo "$EXISTENTE" | grep -F "$SCRIPT" >/dev/null 2>&1; then
  echo "Cron de backup já instalado."
  echo "$EXISTENTE" | grep -F "$SCRIPT" || true
  exit 0
fi

{
  echo "$EXISTENTE"
  echo "$LINE"
} | grep -v '^$' | crontab -

echo "Cron instalado (03:15 local, retenção 7):"
echo "$LINE"
