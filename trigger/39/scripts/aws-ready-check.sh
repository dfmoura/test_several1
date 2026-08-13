#!/usr/bin/env bash
# Valida .env.aws (ou arquivo passado) antes de subir no Lightsail.
# Uso:
#   ./scripts/aws-ready-check.sh
#   ./scripts/aws-ready-check.sh .env.aws
#   ERP_ENV_FILE=.env.aws.homolog.example ./scripts/aws-ready-check.sh
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${1:-${ERP_ENV_FILE:-.env.aws}}"
FAIL=0

ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
warn() { printf '  WARN %s\n' "$*"; }

echo "=== aws-ready-check ==="
echo "Arquivo: $ENV_FILE"
echo

if [[ ! -f "$ENV_FILE" ]]; then
  bad "arquivo não encontrado (cp .env.aws.homolog.example .env.aws)"
  exit 1
fi

get() {
  local key="$1"
  grep -E "^${key}=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' || true
}

STAGE="$(get ERP_STAGE)"
APP_ENV="$(get APP_ENV)"
DEBUG="$(get APP_DEBUG)"
SEED="$(get SEED_ON_BOOT)"
KEY="$(get APP_KEY)"
URL="$(get APP_URL)"
DBPASS="$(get DB_PASSWORD)"
ROOTPASS="$(get DB_ROOT_PASSWORD)"
ADMINPASS="$(get ADMIN_PASSWORD)"

case "$STAGE" in
  homolog|production) ok "ERP_STAGE=$STAGE" ;;
  local) bad "ERP_STAGE=local — na AWS use homolog ou production" ;;
  *) bad "ERP_STAGE inválido: '$STAGE' (homolog|production)" ;;
esac

if [[ "$DEBUG" == "true" ]]; then
  if [[ "$STAGE" == "production" ]]; then
    bad "APP_DEBUG=true em production — recusado"
  else
    warn "APP_DEBUG=true em homolog — preferível false"
  fi
else
  ok "APP_DEBUG=$DEBUG"
fi

if [[ "$SEED" == "true" ]]; then
  bad "SEED_ON_BOOT=true — na AWS deve ser false (seed manual se banco vazio)"
else
  ok "SEED_ON_BOOT=$SEED"
fi

if printf '%s' "$KEY" | grep -qE '^base64:[A-Za-z0-9+/=]{20,}$'; then
  ok "APP_KEY definida"
else
  bad "APP_KEY ausente/inválida — gere e preserve (tokens IA/Focus dependem dela)"
fi

if [[ "$URL" == *"seudominio"* ]] || [[ -z "$URL" ]] || [[ "$URL" == *"localhost"* ]]; then
  bad "APP_URL ainda placeholder/local: $URL"
else
  ok "APP_URL=$URL"
fi

for pair in "DB_PASSWORD:$DBPASS" "DB_ROOT_PASSWORD:$ROOTPASS" "ADMIN_PASSWORD:$ADMINPASS"; do
  name="${pair%%:*}"
  val="${pair#*:}"
  if [[ -z "$val" ]] || [[ "$val" == TROCAR* ]] || [[ "$val" == *"erp_secret"* ]] || [[ "$val" == *"Admin@123"* ]]; then
    bad "$name ainda fraca/placeholder"
  else
    ok "$name definida (não placeholder)"
  fi
done

if [[ "$STAGE" == "production" && "$APP_ENV" != "production" ]]; then
  warn "ERP_STAGE=production mas APP_ENV=$APP_ENV (recomendado APP_ENV=production)"
fi

echo
if [[ "$FAIL" -ne 0 ]]; then
  echo "RESULTADO: NÃO PRONTO — corrija os FAIL acima."
  exit 1
fi

echo "RESULTADO: pronto para make up-aws (com --env-file $ENV_FILE)."
echo "Lembretes host: swap (scripts/lightsail-setup-swap.sh), só 80/443, snapshot antes da virada."
exit 0
