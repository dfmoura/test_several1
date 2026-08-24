#!/usr/bin/env bash
# Deixa o console TRIGGER pronto para teste local.
# Norma: docs/ADR_CONSOLE_PLATAFORMA.md
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

OPS_EMAIL="${PLATAFORMA_OPS_EMAIL:-ops@triggerti.com}"
OPS_NAME="${PLATAFORMA_OPS_NAME:-Operação TRIGGER}"
OPS_PASSWORD="${PLATAFORMA_OPS_PASSWORD:-Ops@Trigger43}"

echo "== health =="
curl -sfS -m 8 http://localhost:8043/api/v1/health >/dev/null
curl -sfS -m 8 http://localhost:8043/api/v1/health; echo

echo "== RBAC plataforma =="
"${COMPOSE[@]}" exec -T app php artisan plataforma:ensure-rbac

echo "== operador =="
"${COMPOSE[@]}" exec -T app php artisan plataforma:criar-operador "$OPS_EMAIL" \
  --name="$OPS_NAME" \
  --password="$OPS_PASSWORD"

echo "== testes =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter ConsolePlataformaTest

echo ""
echo "Pronto."
echo "  Console:  http://localhost:8043/plataforma"
echo "  Login:    $OPS_EMAIL"
echo "  Senha:    $OPS_PASSWORD"
echo "  Cliente:  admin@rlp.com.br / Admin@123  (não entra no console)"
echo ""
