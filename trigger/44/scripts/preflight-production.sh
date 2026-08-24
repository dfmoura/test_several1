#!/usr/bin/env bash
# Valida .env e pré-requisitos de produção SEM subir a stack.
# Saída 0 = pronto para ./scripts/up-production.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

fail() { echo "FAIL  $*" >&2; exit 1; }
warn() { echo "WARN  $*"; }
ok() { echo "OK    $*"; }

[[ -f .env ]] || fail ".env ausente — rode ./scripts/new-prod-env.sh <dominio> <email>"

# shellcheck disable=SC1091
set -a
source .env
set +a

[[ "${APP_ENV:-}" == "production" ]] || fail "APP_ENV deve ser production"
[[ -n "${DOMAIN:-}" ]] || fail "DOMAIN vazio"
[[ -n "${ACME_EMAIL:-}" ]] || fail "ACME_EMAIL vazio"
[[ "${PUBLIC_BASE_URL:-}" == https://* ]] || fail "PUBLIC_BASE_URL deve ser https://..."
[[ "${PUBLIC_BASE_URL}" == "https://${DOMAIN}" || "${PUBLIC_BASE_URL}" == "https://${DOMAIN}/"* ]] \
  || warn "PUBLIC_BASE_URL ($PUBLIC_BASE_URL) não bate com DOMAIN ($DOMAIN)"

mode="${REGISTRATION_MODE:-open}"
[[ "$mode" == "bootstrap" || "$mode" == "closed" ]] \
  || fail "REGISTRATION_MODE deve ser bootstrap ou closed (agora: $mode)"

[[ "${DEPLOYMENT_MODE:-}" == "private" ]] || warn "DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-} (esperado: private)"
[[ "${BILLING_PROVIDER:-sandbox}" == "sandbox" ]] || fail "Instância privada usa BILLING_PROVIDER=sandbox"

[[ "${JWT_SECRET:-}" != *change-me* && ${#JWT_SECRET} -ge 32 ]] || fail "JWT_SECRET fraco"
[[ "${APP_ENCRYPTION_KEY:-}" != *change-me* && ${#APP_ENCRYPTION_KEY} -ge 24 ]] \
  || fail "APP_ENCRYPTION_KEY fraco"
[[ "${ADMIN_TOKEN:-}" != *change-me* ]] || fail "ADMIN_TOKEN placeholder"
[[ "${EVOLUTION_KEY:-}" != *change-me* ]] || fail "EVOLUTION_KEY placeholder"
[[ "${WEBHOOK_SECRET:-}" != *change-me* && -n "${WEBHOOK_SECRET:-}" ]] || fail "WEBHOOK_SECRET fraco"
[[ "${POSTGRES_PASSWORD:-zapvia}" != "zapvia" ]] || fail "POSTGRES_PASSWORD padrão de dev"
[[ "${RABBITMQ_PASSWORD:-zapvia}" != "zapvia" ]] || fail "RABBITMQ_PASSWORD padrão de dev"

command -v docker >/dev/null || fail "Docker CLI ausente"
docker info >/dev/null 2>&1 || fail "Docker daemon parado"
docker compose version >/dev/null 2>&1 || fail "plugin docker compose ausente"

mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
mem_gb=$((mem_kb / 1024 / 1024))
if (( mem_gb < 4 )); then
  fail "RAM ${mem_gb}G — mínimo 4G (Evolution + Postgres + Rabbit). Prefira 8G."
elif (( mem_gb < 8 )); then
  warn "RAM ${mem_gb}G — ok para 1–2 números; 8G recomendado com vários QR"
else
  ok "RAM ${mem_gb}G"
fi

disk_avail_kb="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
disk_avail_gb=$((disk_avail_kb / 1024 / 1024))
if (( disk_avail_gb < 10 )); then
  warn "Disco livre ~${disk_avail_gb}G — reserve ≥20G (volumes + backups)"
else
  ok "Disco livre ~${disk_avail_gb}G"
fi

[[ -f docker-compose.yml && -f docker-compose.prod.yml ]] || fail "compose de produção incompleto"
[[ -f deploy/Caddyfile ]] || fail "deploy/Caddyfile ausente"
grep -q 'evolution_public' deploy/Caddyfile || warn "Caddyfile sem bloqueio público do webhook Evolution"

ok "APP_ENV=production DOMAIN=$DOMAIN"
ok "cadastro=$mode billing=sandbox"
echo
echo "Pronto para deploy: ./scripts/up-production.sh"
echo "Após o up: crie A SUA conta imediatamente (bootstrap)."
echo "Backup diário: ./scripts/backup-postgres.sh  (cron)"
