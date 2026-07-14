#!/bin/bash
set -euo pipefail

PORT="${APP_PORT:-8095}"

start_xvfb() {
  echo "Iniciando Xvfb (navegador headed)…"
  Xvfb :99 -ac -screen 0 1400x900x24 -nolisten tcp &
  export DISPLAY=:99
  for _ in $(seq 1 20); do
    if [ -S /tmp/.X11-unix/X99 ] 2>/dev/null; then
      echo "Xvfb pronto (DISPLAY=$DISPLAY)"
      return 0
    fi
    sleep 0.25
  done
  echo "Erro: Xvfb não respondeu — coleta da Prefeitura vai falhar." >&2
  exit 1
}

if [ "${HEADLESS:-true}" = "true" ]; then
  exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
fi

if [ -z "${DISPLAY:-}" ]; then
  start_xvfb
fi

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
