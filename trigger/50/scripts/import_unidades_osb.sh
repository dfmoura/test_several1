#!/usr/bin/env bash
# Importa filiais do mapa OSB (unidades-osb.txt) no container em execução.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f "$ROOT/unidades-osb.txt" ]]; then
  echo "Arquivo ausente: $ROOT/unidades-osb.txt" >&2
  exit 1
fi

if ! docker compose ps --status running --services 2>/dev/null | grep -qx app; then
  echo "Container app não está up. Suba com: ./scripts/docker-up.sh" >&2
  exit 1
fi

# Arquivo vem montado via docker-compose (./unidades-osb.txt:/app/unidades-osb.txt:ro).
if ! docker compose exec -T app test -f /app/unidades-osb.txt; then
  echo "unidades-osb.txt não visível no container. Recrie: docker compose up -d" >&2
  exit 1
fi

echo "== backup antes do import =="
"$ROOT/scripts/backup_data.sh" pre-import-unidades 14

EXTRA_ARGS=("$@")
echo "== import via Docker =="
docker compose exec -T app python -m app.org.cli_import_unidades_osb "${EXTRA_ARGS[@]}"
