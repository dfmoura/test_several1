#!/usr/bin/env bash
# Rebuild limpo + sobe stack + mostra diagnóstico se a API falhar.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Parando stack..."
docker compose down --remove-orphans

echo "==> Rebuild sem cache (api/worker)..."
docker compose build --no-cache api worker

echo "==> Subindo..."
docker compose up -d

echo "==> Aguardando API (até ~90s)..."
ok=0
for i in $(seq 1 45); do
  if curl -fsS http://127.0.0.1:8141/health >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 2
done

echo
echo "==> Status containers:"
docker compose ps -a

if [[ "$ok" -eq 1 ]]; then
  echo
  echo "OK — API respondendo em http://localhost:8141/health"
  curl -sS http://127.0.0.1:8141/health
  echo
  curl -sS http://127.0.0.1:8141/ready || true
  echo
  exit 0
fi

echo
echo "FALHOU — logs da API:"
docker logs zap-gateway-api --tail 120 || true
echo
echo "logs do worker:"
docker logs zap-gateway-worker --tail 60 || true
exit 1
