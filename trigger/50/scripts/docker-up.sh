#!/usr/bin/env bash
# Runtime oficial: Docker Compose detached (sobrevive ao fechar o Cursor/IDE).
# Não use uvicorn/.venv em background do agent para “segurar” o serviço.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ -f "$ROOT/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT/.env"
  set +a
fi

HOST_PORT="${APP_HOST_PORT:-8097}"

ensure_docker() {
  if ! docker info >/dev/null 2>&1; then
    echo "Docker daemon inacessível. Tentando iniciar o serviço…" >&2
    if command -v systemctl >/dev/null 2>&1; then
      sudo systemctl start docker || true
      sleep 2
    fi
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "Falha: Docker não está disponível (socket/daemon)." >&2
    exit 1
  fi
}

# Remove só uvicorn do .venv deste projeto na mesma porta (não toca containers).
free_host_uvicorn() {
  local pids
  pids="$(
    ps -eo pid=,cmd= 2>/dev/null | awk -v root="$ROOT" -v port="$HOST_PORT" '
      index($0, root "/.venv/") && /uvicorn/ && index($0, "port " port) { print $1 }
    ' || true
  )"
  if [[ -z "${pids// }" ]]; then
    return 0
  fi
  echo "== liberando porta ${HOST_PORT}: uvicorn host deste projeto (não-Docker) =="
  # shellcheck disable=SC2086
  ps -o pid,ppid,cmd -p $pids 2>/dev/null || true
  # shellcheck disable=SC2086
  kill -TERM $pids 2>/dev/null || true
  sleep 2
  pids="$(
    ps -eo pid=,cmd= 2>/dev/null | awk -v root="$ROOT" -v port="$HOST_PORT" '
      index($0, root "/.venv/") && /uvicorn/ && index($0, "port " port) { print $1 }
    ' || true
  )"
  if [[ -n "${pids// }" ]]; then
    # shellcheck disable=SC2086
    kill -KILL $pids 2>/dev/null || true
    sleep 1
  fi
}

ensure_docker
free_host_uvicorn

echo "== docker compose up --build -d =="
docker compose up --build -d

echo
echo "== aguardando health =="
ok=0
for _ in $(seq 1 40); do
  if curl -sf --max-time 2 "http://127.0.0.1:${HOST_PORT}/api/health" >/tmp/osb50_docker_health.json 2>/dev/null; then
    ok=1
    break
  fi
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "Falha: health não respondeu em :${HOST_PORT}" >&2
  docker compose ps -a >&2 || true
  docker compose logs --tail=80 app >&2 || true
  exit 1
fi

echo "Health OK:"
cat /tmp/osb50_docker_health.json
echo
echo
echo "Runtime: Docker Compose (restart: unless-stopped) — independente do Cursor."
echo "  UI:     http://localhost:${HOST_PORT}/"
echo "  Health: http://localhost:${HOST_PORT}/api/health"
echo "  Login:  admin / admin123  (Ctrl+F5)"
echo
echo "Status:   docker compose ps"
echo "Logs:     docker compose logs -f app"
echo "Parar:    docker compose down   # dados em ./data permanecem"
echo
echo "Evite:    ./run.sh ou uvicorn em terminal do Cursor para manter o serviço no ar."
