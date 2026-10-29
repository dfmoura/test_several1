#!/usr/bin/env bash
# Verificação rápida pós-mudança: testes + health local (se a porta estiver aberta).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -x "$ROOT/.venv/bin/pytest" ]]; then
  PYTEST="$ROOT/.venv/bin/pytest"
else
  PYTEST="pytest"
fi

echo "== pytest =="
"$PYTEST" -q

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
# Host do Compose (APP_HOST_PORT); fallback APP_PORT / 8097
PORT="${APP_HOST_PORT:-${APP_PORT:-8097}}"
if command -v curl >/dev/null 2>&1; then
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/tmp/osb50_health.json 2>/dev/null; then
    echo "== health OK (:${PORT}) =="
    cat /tmp/osb50_health.json
    echo
  else
    echo "== health: app não está escutando em :${PORT} (ok se só rodou testes) =="
  fi
fi
