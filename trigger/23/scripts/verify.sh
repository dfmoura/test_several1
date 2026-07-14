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

PORT="${APP_PORT:-8096}"
if command -v curl >/dev/null 2>&1; then
  if curl -sf "http://127.0.0.1:${PORT}/api/health" >/tmp/obs_health.json 2>/dev/null; then
    echo "== health OK =="
    cat /tmp/obs_health.json
    echo
  else
    echo "== health: app não está escutando em :${PORT} (ok se só rodou testes) =="
  fi
fi
