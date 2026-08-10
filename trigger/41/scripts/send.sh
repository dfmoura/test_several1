#!/usr/bin/env bash
# Envia mensagem via gateway com external_id dinâmico e aguarda status final.
#
# Uso:
#   ./scripts/send.sh "553493141230" "oi joia"
#   TO=553493141230 BODY="oi joia" ./scripts/send.sh
#   API_KEY=zpg_live_... ./scripts/send.sh 553493141230 "oi joia"
set -euo pipefail
cd "$(dirname "$0")/.."

BASE_URL="${BASE_URL:-http://localhost:8141}"
API_KEY="${API_KEY:-zpg_live_VAihrrRA6_4e26kkp2aLJNChnGiTVw35U8ZFT2MK2f0}"
ADMIN_TOKEN="${ADMIN_TOKEN:-dev-admin-token-zap-gateway-41}"
TO="${1:-${TO:-553493141230}}"
BODY="${2:-${BODY:-oi joia}}"
EXT_ID="${EXTERNAL_ID:-msg-$(date +%Y%m%d%H%M%S)-$RANDOM}"
MAX_WAIT="${MAX_WAIT:-45}"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq é necessário (sudo apt install jq)" >&2
  exit 1
fi

echo "==> Garantindo worker no ar..."
docker compose up -d worker >/dev/null

echo "==> Fila antes do envio:"
curl -sS "${BASE_URL}/v1/admin/queue/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq '{total_queued, senders}'

echo
echo "==> Enviando external_id=${EXT_ID} → ${TO}"
RESP=$(curl -sS -X POST "${BASE_URL}/v1/messages" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg e "$EXT_ID" --arg t "$TO" --arg b "$BODY" \
    '{external_id:$e, to:$t, type:"text", body:$b}')")
echo "$RESP" | jq .
STATUS=$(echo "$RESP" | jq -r .status)

echo
echo "==> Aguardando entrega (até ${MAX_WAIT}s)..."
for i in $(seq 1 "$MAX_WAIT"); do
  CUR=$(curl -sS "${BASE_URL}/v1/messages/by-external/${EXT_ID}" \
    -H "Authorization: Bearer ${API_KEY}")
  STATUS=$(echo "$CUR" | jq -r .status)
  ATTEMPTS=$(echo "$CUR" | jq -r .attempts)
  ERR=$(echo "$CUR" | jq -r '.last_error // empty')
  printf "\r[%02ds] status=%s attempts=%s %s" "$i" "$STATUS" "$ATTEMPTS" "${ERR:+err=$ERR}"
  case "$STATUS" in
    sent|failed|dead)
      echo
      echo
      echo "$CUR" | jq .
      if [[ "$STATUS" == "sent" ]]; then
        echo
        echo "OK — entregue (external_id=${EXT_ID})"
        exit 0
      fi
      echo
      echo "FALHOU — status=${STATUS}" >&2
      exit 2
      ;;
  esac
  sleep 1
done

echo
echo
echo "TIMEOUT — ainda em status=${STATUS}. Fila:" >&2
curl -sS "${BASE_URL}/v1/admin/queue/stats" \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" | jq . >&2
echo "logs do worker: docker logs zap-gateway-worker --tail 80" >&2
exit 3
