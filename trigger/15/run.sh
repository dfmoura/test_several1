#!/usr/bin/env bash
# Sobe o app de licitações acessível em localhost e na Wi-Fi local.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${APP_PORT:-8095}"
VENV="$ROOT/.venv"

show_urls() {
  local lan_ip
  lan_ip="$(hostname -I 2>/dev/null | awk '{print $1}')"
  echo "Aplicativo de licitações:"
  echo "  Local:  http://localhost:${PORT}/"
  if [[ -n "$lan_ip" ]]; then
    echo "  Wi-Fi:  http://${lan_ip}:${PORT}/"
  else
    echo "  Wi-Fi:  (IP local não detectado — use: hostname -I)"
  fi
}

port_in_use() {
  ss -tln 2>/dev/null | grep -q ":${PORT} " || \
  ss -tln 2>/dev/null | grep -q ":${PORT}$"
}

app_responding() {
  curl -sf -o /dev/null --max-time 2 "http://127.0.0.1:${PORT}/" 2>/dev/null
}

if port_in_use; then
  if app_responding; then
    echo "Já está rodando na porta ${PORT} (não é preciso subir de novo)."
    echo
    show_urls
    docker_name="$(docker ps --format '{{.Names}}' 2>/dev/null | grep -E 'app|licit' | head -1 || true)"
    if [[ -n "$docker_name" ]]; then
      echo
      echo "Via Docker: container ${docker_name}"
      echo "  Parar:  docker compose down"
      echo "  Logs:   docker compose logs -f"
    fi
    exit 0
  fi
  echo "Erro: porta ${PORT} em uso por outro processo (não é o app de licitações)." >&2
  echo "Verifique com: ss -tlnp | grep ${PORT}" >&2
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
