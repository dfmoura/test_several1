#!/bin/sh
# Restaura um dump feito por /backup/backup.sh. Roda dentro do container db.
set -eu
if [ "${1:-}" = "" ]; then
  echo "Uso: /backup/restore.sh /var/backups/osb/osb-AAAAMMDD-HHMMSS.dump" >&2
  exit 1
fi
ATIVA=$(psql -U postgres -d osb -tAc "SELECT count(*) FROM coleta_job WHERE status = 'executando'")
if [ "$ATIVA" != "0" ]; then
  echo "Coleta em execução. Restore recusado." >&2
  exit 1
fi
pg_restore -U postgres -d osb --clean --if-exists --no-owner --no-privileges "$1"
echo "Restaurado: $1"
