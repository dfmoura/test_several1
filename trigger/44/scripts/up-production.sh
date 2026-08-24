#!/usr/bin/env bash
# Sobe a stack privada com TLS. Não altera o compose local (docker compose up).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "ERRO: $*" >&2; exit 1; }

[[ -f .env ]] || fail ".env ausente. Rode: ./scripts/new-prod-env.sh <dominio> <email>"

# shellcheck disable=SC1091
set -a
source .env
set +a

[[ "${APP_ENV:-}" == "production" ]] || fail "APP_ENV deve ser production"
[[ -n "${DOMAIN:-}" ]] || fail "DOMAIN não definido"
[[ -n "${ACME_EMAIL:-}" ]] || fail "ACME_EMAIL não definido"
[[ "${PUBLIC_BASE_URL:-}" == https://* ]] || fail "PUBLIC_BASE_URL deve ser https://..."

mode="${REGISTRATION_MODE:-open}"
[[ "$mode" == "bootstrap" || "$mode" == "closed" ]] \
  || fail "REGISTRATION_MODE deve ser bootstrap ou closed (agora: $mode)"

[[ "${BILLING_PROVIDER:-sandbox}" == "sandbox" ]] \
  || fail "Instância privada usa BILLING_PROVIDER=sandbox"

[[ "${JWT_SECRET:-}" != *change-me* && ${#JWT_SECRET} -ge 32 ]] \
  || fail "JWT_SECRET fraco ou placeholder"
[[ "${APP_ENCRYPTION_KEY:-}" != *change-me* && ${#APP_ENCRYPTION_KEY} -ge 24 ]] \
  || fail "APP_ENCRYPTION_KEY fraco ou placeholder"
[[ "${ADMIN_TOKEN:-}" != *change-me* ]] || fail "ADMIN_TOKEN ainda é placeholder"
[[ "${EVOLUTION_KEY:-}" != *change-me* ]] || fail "EVOLUTION_KEY ainda é placeholder"
[[ "${POSTGRES_PASSWORD:-zapvia}" != "zapvia" ]] || fail "POSTGRES_PASSWORD ainda é o padrão de desenvolvimento"
[[ "${RABBITMQ_PASSWORD:-zapvia}" != "zapvia" ]] || fail "RABBITMQ_PASSWORD ainda é o padrão de desenvolvimento"

command -v docker >/dev/null || fail "Docker CLI não encontrado"
docker info >/dev/null 2>&1 || fail "Docker daemon não está rodando"

echo "==> Pré-checagem…"
"$ROOT/scripts/preflight-production.sh"

echo "==> ZapVia produção (instância privada)"
echo "    domínio: ${PUBLIC_BASE_URL}"
echo "    cadastro: ${REGISTRATION_MODE}"
echo "==> Subindo stack (compose + overlay TLS)…"

docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

echo "==> Aguardando API interna…"
ok=0
for i in $(seq 1 90); do
  code="$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8144/health || true)"
  if [[ "$code" == "200" ]]; then
    ok=1
    break
  fi
  sleep 2
done

if [[ "$ok" != "1" ]]; then
  echo "ERRO: API não respondeu em http://127.0.0.1:8144/health" >&2
  docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=80 api caddy >&2 || true
  exit 1
fi

echo
echo "============================================"
echo " Produção no ar"
echo "============================================"
echo " URL:        ${PUBLIC_BASE_URL}"
echo " Health:     ${PUBLIC_BASE_URL}/health"
echo
echo " 1. Abra o site, crie A SUA conta (única) AGORA."
echo " 2. Conecte o WhatsApp Business (QR)."
echo " 3. Guarde a API key nos seus sistemas."
echo " 4. Depois disso o cadastro público fecha sozinho."
echo " 5. Agende backup: ./scripts/backup-postgres.sh"
echo "============================================"

docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
