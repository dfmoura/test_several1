#!/usr/bin/env bash
# Sobe o ambiente de desenvolvimento e valida com smoke test.
# Seguro: não usa down -v; preserva volumes e secrets.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BUILD="${NFSE_DEV_BUILD:-1}"
WAIT_SEC="${NFSE_DEV_WAIT_SEC:-180}"

if [[ ! -f .env ]]; then
  echo "Criando .env a partir de .env.example (primeira vez)..."
  cp .env.example .env
fi

if [[ ! -f secrets/certificado.pfx ]]; then
  echo "AVISO: secrets/certificado.pfx ausente — em dev com NFSE_CERT_REQUIRED=false o mock segue ok."
fi

echo "== Subindo stack (profile: dev) =="
if [[ "$BUILD" == "1" ]]; then
  docker compose --profile dev up -d --build
else
  docker compose --profile dev up -d
fi

echo
echo "== Aguardando API healthy (até ${WAIT_SEC}s) =="
API_PORT="${NFSE_HOST_PORT_API:-18100}"
deadline=$((SECONDS + WAIT_SEC))
until curl -sf --connect-timeout 2 --max-time 5 "http://127.0.0.1:${API_PORT}/health/live" >/dev/null 2>&1; do
  if (( SECONDS >= deadline )); then
    echo "Timeout aguardando API. Últimos logs:"
    docker compose --profile dev logs --tail 80 nfse-api || true
    docker compose --profile dev ps -a
    exit 1
  fi
  sleep 3
done
echo "API live OK."

echo
bash "$ROOT/scripts/smoke-test.sh"
