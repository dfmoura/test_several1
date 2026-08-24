#!/usr/bin/env bash
# Ensaio ASAAS ≈ produção: tunnel flexorc + webhook + Checkout cartão.
# Norma: docs/ADR_ENSAIO_ASAAS_FLEXORC.md · docs/DEPLOY_LOCAL_AWS.md
#
# Uso:
#   ./scripts/ensaio-asaas-ready.sh           # só valida
#   ./scripts/ensaio-asaas-ready.sh --ativar  # aponta ORCAMENTO_PUBLIC_BASE_URL → flexorc
#   ./scripts/ensaio-asaas-ready.sh --desativar
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PUBLIC_HOST="${FLEXORC_PUBLIC_HOST:-https://flexorc.triggerti.com}"
PUBLIC_HOST="${PUBLIC_HOST%/}"
WEBHOOK_PATH="/api/v1/webhooks/bancarios/asaas"
WEBHOOK_URL="${PUBLIC_HOST}${WEBHOOK_PATH}"
LOCAL_HEALTH="http://localhost:8043/api/v1/health"
MODE="${1:-}"

FAIL=0
ok() { printf '  OK  %s\n' "$*"; }
bad() { printf '  FAIL %s\n' "$*"; FAIL=1; }
warn() { printf '  WARN %s\n' "$*"; }
info() { printf '  ·   %s\n' "$*"; }

get_env() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 0
  grep -E "^${key}=" "$file" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r' | sed 's/^["'\'']//;s/["'\'']$//' || true
}

set_env_key() {
  local file="$1" key="$2" val="$3"
  if [[ ! -f "$file" ]]; then
    bad "arquivo ausente: $file"
    return 1
  fi
  if grep -qE "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$file"
  else
    printf '\n%s=%s\n' "$key" "$val" >>"$file"
  fi
}

ensure_webhook_token() {
  local file="$1"
  local tok
  tok="$(get_env "$file" ASAAS_WEBHOOK_TOKEN)"
  if [[ -n "$tok" ]]; then
    ok "ASAAS_WEBHOOK_TOKEN já definido ($file)"
    return 0
  fi
  tok="$(openssl rand -hex 24)"
  set_env_key "$file" ASAAS_WEBHOOK_TOKEN "$tok"
  ok "ASAAS_WEBHOOK_TOKEN gerado em $file — copie para o painel ASAAS"
  info "token=$tok"
}

echo "=== ensaio-asaas-ready ==="
echo "Público: $PUBLIC_HOST"
echo

if [[ "$MODE" == "--ativar" ]]; then
  echo "-- ativar ensaio (ORCAMENTO → flexorc) --"
  set_env_key .env ORCAMENTO_PUBLIC_BASE_URL "$PUBLIC_HOST"
  set_env_key apps/api/.env ORCAMENTO_PUBLIC_BASE_URL "$PUBLIC_HOST"
  ensure_webhook_token apps/api/.env
  # Espelha token no .env raiz para o checklist (compose não injeta ASAAS vazio).
  root_tok="$(get_env apps/api/.env ASAAS_WEBHOOK_TOKEN)"
  if [[ -n "$root_tok" ]]; then
    set_env_key .env ASAAS_WEBHOOK_TOKEN "$root_tok"
  fi
  ok "ORCAMENTO_PUBLIC_BASE_URL=$PUBLIC_HOST"
  echo
  warn "Reinicie a stack: make down && make up"
  warn "Tunnel Cloudflare: hostname flexorc → http://localhost:8043 (docs/DEPLOY_LOCAL_AWS.md)"
  echo
fi

if [[ "$MODE" == "--desativar" ]]; then
  echo "-- desativar ensaio (ORCAMENTO → localhost) --"
  set_env_key .env ORCAMENTO_PUBLIC_BASE_URL "http://localhost:8043"
  set_env_key apps/api/.env ORCAMENTO_PUBLIC_BASE_URL "http://localhost:8043"
  ok "ORCAMENTO_PUBLIC_BASE_URL=http://localhost:8043"
  echo
  warn "Reinicie: make down && make up — e remova/apague a regra do tunnel se não precisar"
  echo
fi

ROOT_ORC="$(get_env .env ORCAMENTO_PUBLIC_BASE_URL)"
API_ORC="$(get_env apps/api/.env ORCAMENTO_PUBLIC_BASE_URL)"
API_KEY="$(get_env apps/api/.env ASAAS_API_KEY)"
ASAAS_ENV="$(get_env apps/api/.env ASAAS_ENV)"
WEBHOOK_TOK="$(get_env apps/api/.env ASAAS_WEBHOOK_TOKEN)"
BILLING="$(get_env apps/api/.env BILLING_PROVIDER)"

echo "-- configuração --"
if [[ "$ROOT_ORC" == "$PUBLIC_HOST" ]] || [[ "$API_ORC" == "$PUBLIC_HOST" ]]; then
  ok "base pública de ensaio: $PUBLIC_HOST"
else
  warn "ORCAMENTO ainda local (root=$ROOT_ORC api=$API_ORC)"
  info "Para ensaio com webhook real: ./scripts/ensaio-asaas-ready.sh --ativar"
fi

if [[ -n "$API_KEY" ]]; then
  ok "ASAAS_API_KEY presente (apps/api/.env)"
else
  bad "ASAAS_API_KEY vazio — Checkout não abre"
fi

case "${ASAAS_ENV:-sandbox}" in
  sandbox|production) ok "ASAAS_ENV=${ASAAS_ENV:-sandbox}" ;;
  *) warn "ASAAS_ENV inesperado: $ASAAS_ENV" ;;
esac

if [[ "${ASAAS_ENV:-sandbox}" == "production" ]]; then
  warn "Ensaio com ASAAS production — confirme que o webhook não aponta para conta errada"
fi

if [[ -n "$WEBHOOK_TOK" ]]; then
  ok "ASAAS_WEBHOOK_TOKEN definido"
else
  bad "ASAAS_WEBHOOK_TOKEN vazio — ASAAS não autentica o webhook (ou use --ativar)"
fi

if [[ -z "$BILLING" ]] || [[ "$BILLING" == "asaas" ]]; then
  ok "BILLING_PROVIDER=${BILLING:-asaas (via chave)}"
else
  warn "BILLING_PROVIDER=$BILLING — para Checkout real use asaas ou deixe vazio com ASAAS_API_KEY"
fi

echo
echo "-- health local --"
if curl -sfS -m 5 "$LOCAL_HEALTH" >/tmp/flexorc-health-local.json 2>/dev/null; then
  ok "localhost:8043/api/v1/health"
  info "$(tr -d '\n' </tmp/flexorc-health-local.json | head -c 200)"
else
  bad "stack local fora do ar — make up && make doctor"
fi

echo
echo "-- health público (tunnel) --"
if curl -sfS -m 8 "${PUBLIC_HOST}/api/v1/health" >/tmp/flexorc-health-public.json 2>/dev/null; then
  ok "${PUBLIC_HOST}/api/v1/health"
  info "$(tr -d '\n' </tmp/flexorc-health-public.json | head -c 200)"
else
  bad "túnel/DNS não alcança a API local"
  info "cloudflared: hostname flexorc.triggerti.com → http://localhost:8043"
fi

echo
echo "-- painel ASAAS (sandbox) — configure à mão --"
info "URL webhook eventos: $WEBHOOK_URL"
info "Header auth: asaas-access-token = valor de ASAAS_WEBHOOK_TOKEN"
info "Eventos: PAYMENT_RECEIVED, PAYMENT_CONFIRMED, PAYMENT_OVERDUE, PAYMENT_DELETED,"
info "         SUBSCRIPTION_DELETED, SUBSCRIPTION_INACTIVATED, CHECKOUT_PAID (se disponível)"
info "Checkout mensalidade: só cartão (RECURRENT) — já no código"
info "Retorno sucesso: ${PUBLIC_HOST}/conta/mensalidade?retorno=asaas"
echo
info "Saque (opcional): ${PUBLIC_HOST}/api/v1/webhooks/bancarios/asaas/autorizar-saque"
info "Norma: docs/ADR_ENSAIO_ASAAS_FLEXORC.md"
echo

if [[ "$FAIL" -ne 0 ]]; then
  echo "=== RESULTADO: pendências (veja FAIL/WARN) ==="
  exit 1
fi

echo "=== RESULTADO: ensaio pronto para testar Checkout + webhook ==="
exit 0
