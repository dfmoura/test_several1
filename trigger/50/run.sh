#!/usr/bin/env bash
# Dev local (acoplado ao terminal/IDE). Fecha o Cursor → este processo some.
# Runtime permanente / independente do IDE: ./scripts/docker-up.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Carrega .env sem sobrescrever variáveis já exportadas.
if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi
PORT="${APP_PORT:-8096}"
VENV="$ROOT/.venv"

show_urls() {
  local lan_ip
  lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo "Observatório Social Brasil (compras públicas · multiunidade):"
  echo "  Local:  http://localhost:${PORT}/"
  if [[ -n "$lan_ip" ]]; then
    echo "  Rede:   http://${lan_ip}:${PORT}/"
  fi
}

port_in_use() {
  ss -tln 2>/dev/null | grep -q ":${PORT} " || \
  ss -tln 2>/dev/null | grep -q ":${PORT}$"
}

app_responding() {
  curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/api/health" 2>/dev/null
}

if port_in_use; then
  if app_responding; then
    echo "Já está rodando na porta ${PORT}."
    echo
    show_urls
    exit 0
  fi
  echo "Erro: porta ${PORT} em uso por outro processo." >&2
  exit 1
fi

if [[ ! -x "$VENV/bin/uvicorn" ]]; then
  echo "Ambiente não configurado. Execute primeiro: ./setup.sh" >&2
  exit 1
fi

show_urls
echo

cd "$ROOT"
exec "$VENV/bin/uvicorn" app.main:app --reload --host 0.0.0.0 --port "$PORT"
