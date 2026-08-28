#!/usr/bin/env bash
# Extrai do apps/api/.env local o bloco MAIL_*/VIAZAP_* para colar no .env.aws da Lightsail.
# Não imprime valores na tela por padrão — grava em arquivo destino.
# Uso:
#   ./scripts/export-envio-proposta-env.sh              # → /tmp/flexoerp-envio-proposta.env
#   ./scripts/export-envio-proposta-env.sh .env.aws.append
# Depois, na AWS: cat .env.aws.append >> .env.aws  (ou mescle à mão) + make aws-check && make up-aws
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ERP_ENVIO_SRC:-$ROOT/apps/api/.env}"
OUT="${1:-/tmp/flexoerp-envio-proposta.env}"

if [[ ! -f "$SRC" ]]; then
  echo "FAIL: origem não encontrada: $SRC" >&2
  exit 1
fi

KEYS=(
  ORCAMENTO_EMAIL_AUTO
  MAIL_MAILER
  MAIL_HOST
  MAIL_PORT
  MAIL_USERNAME
  MAIL_PASSWORD
  MAIL_SCHEME
  MAIL_FROM_ADDRESS
  MAIL_FROM_NAME
  ORCAMENTO_WHATSAPP_AUTO
  VIAZAP_BASE_URL
  VIAZAP_TOKEN
  VIAZAP_TIMEOUT_SEC
)

{
  echo "# Bloco envio proposta ORC — gerado em $(date -Iseconds) a partir de $SRC"
  echo "# Cole/mescle em .env.aws na Lightsail. NÃO commitareste arquivo."
  for key in "${KEYS[@]}"; do
    line="$(grep -E "^${key}=" "$SRC" 2>/dev/null | head -1 || true)"
    if [[ -n "$line" ]]; then
      printf '%s\n' "$line"
    else
      printf '%s=\n' "$key"
    fi
  done
} > "$OUT"

chmod 600 "$OUT" 2>/dev/null || true

missing=0
for key in MAIL_MAILER MAIL_HOST MAIL_USERNAME MAIL_PASSWORD MAIL_FROM_ADDRESS VIAZAP_BASE_URL VIAZAP_TOKEN; do
  val="$(grep -E "^${key}=" "$OUT" | head -1 | cut -d= -f2- | tr -d '\r' || true)"
  if [[ -z "$val" ]]; then
    echo "WARN: $key vazio na origem" >&2
    missing=1
  fi
done

echo "OK: bloco escrito em $OUT (permisões restritas)."
echo "Na AWS: mescle no .env.aws → ./scripts/aws-ready-check.sh .env.aws → make up-aws"
echo "Smoke: curl -sS https://SEU_HOST/api/v1/health  (campo envio_proposta)"
if [[ "$missing" -ne 0 ]]; then
  echo "Atenção: alguns campos estão vazios — complete antes do up-aws." >&2
  exit 1
fi
exit 0
