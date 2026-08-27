#!/usr/bin/env bash
# Sobe o NFS-e Nacional em homologação (teste) e valida a API.
set -euo pipefail
cd "$(dirname "$0")/.."

PROFILE="${1:-prod}"
API_KEY="$(grep -E '^NFSE_API_KEY=' .env | cut -d= -f2-)"
API_KEY="${API_KEY:-dev-api-key-change-in-production}"
WEB_PASS="$(grep -E '^NFSE_WEB_PASSWORD=' .env | cut -d= -f2-)"
WEB_PASS="${WEB_PASS:-admin}"

echo "==> Ambiente do .env:"
grep -E '^NFSE_AMBIENTE=|^NFSE_GOV_MOCK=|^NFSE_CERT_REQUIRED=' .env || true

if grep -q '^NFSE_AMBIENTE=prod' .env; then
  echo
  echo "ATENCAO: modo PRODUCAO — notas emitidas tem valor fiscal real."
  echo
fi

echo "==> Liberando redes Docker órfãs / antigas do projeto..."
docker compose --profile homolog down --remove-orphans >/dev/null 2>&1 || true
docker compose --profile prod down --remove-orphans >/dev/null 2>&1 || true
docker network prune -f >/dev/null 2>&1 || true
for n in \
  nfse-nacional_nfse-public \
  nfse-nacional_nfse-app \
  nfse-nacional_nfse-data \
  nfse-nacional_nfse-obs \
  nfse-nacional_nfse-egress
do
  docker network rm "$n" >/dev/null 2>&1 || true
done

echo "==> Subindo stack (profile: ${PROFILE})..."
docker compose --profile "${PROFILE}" up -d --build

echo "==> Aguardando API em http://127.0.0.1:18100 ..."
for i in $(seq 1 90); do
  if curl -sf -H "X-API-Key: ${API_KEY}" \
      http://127.0.0.1:18100/health/ready >/tmp/nfse-health.json 2>/dev/null; then
    echo
    echo "========================================"
    echo "  PRONTO — PRODUCAO"
    echo "========================================"
    echo "  Painel:  http://localhost:18102"
    echo "  Senha:   ${WEB_PASS}"
    echo "  API:     http://localhost:18100"
    echo "  Health:"
    cat /tmp/nfse-health.json
    echo
    echo "  Confirme no painel: Ambiente = prod | Certificado OK"
    echo "========================================"
    exit 0
  fi
  printf '.'
  sleep 2
done

echo
echo "==> Timeout. Containers:"
docker compose --profile "${PROFILE}" ps
echo "==> Logs nfse-api:"
docker compose --profile "${PROFILE}" logs --tail=50 nfse-api
exit 1
