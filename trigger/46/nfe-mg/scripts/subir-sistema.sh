#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-dev}"
API_KEY="$(grep -E '^NFE_API_KEY=' .env 2>/dev/null | cut -d= -f2- || true)"
API_KEY="${API_KEY:-dev-api-key-change-in-production}"
WEB_PASS="$(grep -E '^NFE_WEB_PASSWORD=' .env 2>/dev/null | cut -d= -f2- || true)"
WEB_PASS="${WEB_PASS:-admin}"

if [ ! -f .env ]; then
  cp .env.example .env
  echo "==> .env criado a partir de .env.example"
fi

echo "==> Ambiente:"
grep -E '^NFE_AMBIENTE=|^NFE_SEFAZ_MOCK=|^NFE_CERT_REQUIRED=' .env || true

echo "==> Subindo stack (profile: ${PROFILE})..."
docker compose --profile "${PROFILE}" up -d --build

echo "==> Aguardando API em http://127.0.0.1:19100 ..."
for i in $(seq 1 90); do
  if curl -sf -H "X-API-Key: ${API_KEY}" \
      http://127.0.0.1:19100/health/ready >/tmp/nfe-health.json 2>/dev/null; then
    echo
    echo "========================================"
    echo "  PRONTO — NF-e MG"
    echo "========================================"
    echo "  Painel:  http://localhost:19102"
    echo "  Senha:   ${WEB_PASS}"
    echo "  API:     http://localhost:19100"
    echo "  Health:"
    cat /tmp/nfe-health.json
    echo
    echo "========================================"
    exit 0
  fi
  printf '.'
  sleep 2
done

echo
echo "==> Timeout. Containers:"
docker compose --profile "${PROFILE}" ps
echo "==> Logs nfe-api:"
docker compose --profile "${PROFILE}" logs --tail=50 nfe-api
exit 1
