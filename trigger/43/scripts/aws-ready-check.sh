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
elif [[ "$URL" == *"flexorc.triggerti.com"* ]]; then
  bad "APP_URL=$URL — flexorc é tunnel de lab; use https://flexoerp001.triggerti.com (ADR_HOST_INSTALACAO_FLEXOERP001)"
else
  ok "APP_URL=$URL"
fi

ORC_URL="$(get ORCAMENTO_PUBLIC_BASE_URL)"
FRONT="$(get FRONTEND_URL)"
HOST_OFICIAL="flexoerp001.triggerti.com"

echo
echo "--- Host instalação ---"
if [[ -z "$ORC_URL" ]]; then
  warn "ORCAMENTO_PUBLIC_BASE_URL vazio — link público cai no APP_URL"
elif [[ "$ORC_URL" == *"flexorc.triggerti.com"* ]]; then
  if [[ "$STAGE" == "production" ]]; then
    bad "ORCAMENTO_PUBLIC_BASE_URL=$ORC_URL — em production use https://${HOST_OFICIAL} (não tunnel lab)"
  else
    warn "ORCAMENTO_PUBLIC_BASE_URL no flexorc (lab). Homolog online: preferir https://${HOST_OFICIAL}"
  fi
elif [[ "$ORC_URL" == *"${HOST_OFICIAL}"* ]]; then
  ok "ORCAMENTO_PUBLIC_BASE_URL=$ORC_URL"
else
  warn "ORCAMENTO_PUBLIC_BASE_URL=$ORC_URL (oficial desta instalação: https://${HOST_OFICIAL})"
fi

if [[ -n "$FRONT" && "$FRONT" == *"flexorc.triggerti.com"* && "$STAGE" == "production" ]]; then
  bad "FRONTEND_URL no flexorc em production — use https://${HOST_OFICIAL}"
elif [[ -n "$FRONT" && "$FRONT" == *"${HOST_OFICIAL}"* ]]; then
  ok "FRONTEND_URL=$FRONT"
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

# --- Envio da proposta (ORC): e-mail + ViaZap — git não leva estes segredos ---
MAILER="$(get MAIL_MAILER)"
MAIL_HOST_V="$(get MAIL_HOST)"
MAIL_USER="$(get MAIL_USERNAME)"
MAIL_PASS="$(get MAIL_PASSWORD)"
MAIL_FROM="$(get MAIL_FROM_ADDRESS)"
VIAZAP_URL="$(get VIAZAP_BASE_URL)"
VIAZAP_TOK="$(get VIAZAP_TOKEN)"
EMAIL_AUTO="$(get ORCAMENTO_EMAIL_AUTO)"
ZAP_AUTO="$(get ORCAMENTO_WHATSAPP_AUTO)"

echo
echo "--- Envio proposta (ORC) ---"

if [[ -z "$EMAIL_AUTO" || "$EMAIL_AUTO" == "true" ]]; then
  if [[ "$MAILER" == "smtp" ]]; then
    if [[ -n "$MAIL_HOST_V" && -n "$MAIL_USER" && -n "$MAIL_PASS" && -n "$MAIL_FROM" ]]; then
      ok "MAIL smtp configurado (host/user/from presentes)"
    else
      bad "MAIL_MAILER=smtp mas faltam MAIL_HOST / MAIL_USERNAME / MAIL_PASSWORD / MAIL_FROM_ADDRESS"
    fi
  elif [[ -z "$MAILER" || "$MAILER" == "log" || "$MAILER" == "array" ]]; then
    if [[ "$STAGE" == "production" ]]; then
      bad "MAIL_MAILER=${MAILER:-vazio} — em production o e-mail da proposta não sai (use smtp)"
    else
      warn "MAIL_MAILER=${MAILER:-vazio} — e-mail da proposta só no log (homolog ok para ensaio; copie SMTP do local)"
    fi
  else
    ok "MAIL_MAILER=$MAILER"
  fi
else
  warn "ORCAMENTO_EMAIL_AUTO=false — e-mail automático desligado"
fi

if [[ -z "$ZAP_AUTO" || "$ZAP_AUTO" == "true" ]]; then
  if [[ -n "$VIAZAP_URL" && -n "$VIAZAP_TOK" ]]; then
    ok "VIAZAP configurado (URL + token)"
  else
    if [[ "$STAGE" == "production" ]]; then
      bad "VIAZAP_BASE_URL / VIAZAP_TOKEN ausentes — WhatsApp automático da proposta fica desligado"
    else
      warn "VIAZAP_* ausente — WhatsApp automático desligado (clipboard/wa.me seguem)"
    fi
  fi
else
  warn "ORCAMENTO_WHATSAPP_AUTO=false — WhatsApp automático desligado"
fi

echo
if [[ "$FAIL" -ne 0 ]]; then
  echo "RESULTADO: NÃO PRONTO — corrija os FAIL acima."
  exit 1
fi

echo "RESULTADO: pronto para make up-aws (com --env-file $ENV_FILE)."
echo "Lembretes host: swap (scripts/lightsail-setup-swap.sh), só 80/443, snapshot antes da virada."
echo "Smoke envio: curl -sS https://SEU_HOST/api/v1/health | jq .envio_proposta"
exit 0
