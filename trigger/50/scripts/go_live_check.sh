#!/usr/bin/env bash
# Checklist rápido de go-live (local ou VM). Não provisiona Lightsail.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BASE_URL="${BASE_URL:-http://127.0.0.1:${APP_PORT:-8096}}"

echo "== go-live check · ${BASE_URL} =="

if ! command -v curl >/dev/null 2>&1; then
  echo "curl necessário" >&2
  exit 1
fi

HEALTH="$(curl -sf "${BASE_URL}/api/health")" || {
  echo "FALHA: /api/health inacessível" >&2
  exit 1
}
echo "$HEALTH"

echo "$HEALTH" | grep -q '"power_bi": false\|"power_bi":false' || {
  echo "FALHA: power_bi deve ser false" >&2
  exit 1
}
echo "$HEALTH" | grep -q '"fase": "9"\|"fase":"9"' || {
  echo "AVISO: fase esperada 9 (verifique versão implantada)"
}

echo "== backup ensaio =="
./scripts/backup_data.sh golive 3

echo "== OK · próximos manuais =="
echo "  1. DNS A → IP Lightsail"
echo "  2. docker compose ... --profile https up -d --build"
echo "  3. ./scripts/install_backup_cron.sh"
echo "  4. Snapshot Lightsail 'pre-prod-ok'"
echo "  5. Uptime no /api/health"
echo "  6. Ver RUNBOOK.md"
