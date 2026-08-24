#!/usr/bin/env bash
# Gera .env de produção (instância privada) sem sobrescrever um .env existente.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DOMAIN="${1:-}"
ACME_EMAIL="${2:-}"

if [[ -z "$DOMAIN" || -z "$ACME_EMAIL" ]]; then
  echo "Uso: $0 <dominio> <email-letsencrypt>" >&2
  echo "Ex.: $0 zap.seudominio.com voce@seudominio.com" >&2
  exit 1
fi

if [[ -f .env ]]; then
  echo "ERRO: .env já existe. Não vou sobrescrever." >&2
  echo "      Se for produção nova, mova o arquivo (mv .env .env.bak) e rode de novo." >&2
  exit 1
fi

rand_hex() { openssl rand -hex "$1"; }

JWT="$(rand_hex 32)"
ENC="$(rand_hex 32)"
ADMIN="$(rand_hex 24)"
WEBHOOK="$(rand_hex 24)"
EVO="$(rand_hex 24)"
PG="$(rand_hex 16)"
RMQ="$(rand_hex 16)"

cat > .env <<EOF
APP_NAME=zapvia
APP_ENV=production
LOG_LEVEL=INFO
HOST=0.0.0.0
PORT=8000
PUBLIC_BASE_URL=https://${DOMAIN}

DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL}

JWT_SECRET=${JWT}
APP_ENCRYPTION_KEY=${ENC}
ADMIN_TOKEN=${ADMIN}
WEBHOOK_SECRET=${WEBHOOK}

DEPLOYMENT_MODE=private
REGISTRATION_MODE=bootstrap
BILLING_AUTO_ACTIVATE=true
BILLING_PROVIDER=sandbox
PLAN_CODE=zapvia_pro
PLAN_NAME=ZapVia Pro
PLAN_PRICE_CENTS=9700
PLAN_CURRENCY=BRL
PLAN_INTERVAL_DAYS=3650

WHATSAPP_PROVIDER=sandbox
WHATSAPP_GRAPH_VERSION=v21.0
WHATSAPP_GRAPH_BASE_URL=https://graph.facebook.com

EVOLUTION_URL=http://evolution:8080
EVOLUTION_KEY=${EVO}
EVOLUTION_ENABLED=true

POSTGRES_PASSWORD=${PG}
RABBITMQ_PASSWORD=${RMQ}

DATABASE_URL=postgresql+asyncpg://zapvia:${PG}@postgres:5432/zapvia
DATABASE_URL_SYNC=postgresql://zapvia:${PG}@postgres:5432/zapvia
REDIS_URL=redis://redis:6379/0
RABBITMQ_URL=amqp://zapvia:${RMQ}@rabbitmq:5672/zapvia

DEFAULT_RATE_LIMIT_PER_MINUTE=30
MAX_SEND_ATTEMPTS=5
MESSAGE_RETENTION_DAYS=90
WORKER_PREFETCH=3
JWT_TTL_HOURS=168
EOF

chmod 600 .env
echo "==> .env de produção criado (permissão 600)"
echo "    domínio: https://${DOMAIN}"
echo "    cadastro: só a primeira conta (bootstrap)"
echo "    billing: sandbox auto-ativado por 10 anos"
echo
echo "Próximo: ./scripts/up-production.sh"
