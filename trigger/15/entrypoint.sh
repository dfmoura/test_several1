#!/bin/bash
set -euo pipefail

PORT="${APP_PORT:-8095}"

if [ "${HEADLESS:-true}" = "true" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
fi

echo "Iniciando com Xvfb (navegador headed)…"
Xvfb :99 -ac -screen 0 1400x900x24 -nolisten tcp &
export DISPLAY=:99
sleep 1
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
