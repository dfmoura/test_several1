#!/usr/bin/env bash
# Smoke test do ambiente de desenvolvimento (gov mock).
# Não altera dados de configuração nem remove volumes.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

API_PORT="${NFSE_HOST_PORT_API:-18100}"
WEB_PORT="${NFSE_HOST_PORT_WEB:-18102}"
API_BASE="${NFSE_SMOKE_API_BASE:-http://127.0.0.1:${API_PORT}}"
WEB_BASE="${NFSE_SMOKE_WEB_BASE:-http://127.0.0.1:${WEB_PORT}}"

# Carrega só a API key do .env (sem imprimir)
if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  set -a
  # Extrai apenas NFSE_API_KEY sem source completo (evita side effects)
  API_KEY_LINE="$(grep -E '^NFSE_API_KEY=' .env | tail -n1 || true)"
  if [[ -n "${API_KEY_LINE}" ]]; then
    API_KEY="${API_KEY_LINE#NFSE_API_KEY=}"
    API_KEY="${API_KEY%\"}"
    API_KEY="${API_KEY#\"}"
  fi
  set +a
fi
API_KEY="${NFSE_API_KEY:-${API_KEY:-dev-api-key-change-in-production}}"

PASS=0
FAIL=0
SKIP=0

ok()   { PASS=$((PASS + 1)); printf '  OK   %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf '  FAIL %s — %s\n' "$1" "$2"; }
skip() { SKIP=$((SKIP + 1)); printf '  SKIP %s — %s\n' "$1" "$2"; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Comando obrigatório ausente: $1" >&2
    exit 2
  }
}

need_cmd curl
need_cmd docker

echo "== NFS-e Nacional — smoke test (dev) =="
echo "API: $API_BASE"
echo "WEB: $WEB_BASE"
echo

# --- Compose status ---
echo "[1/5] Containers (profile dev)"
if ! docker compose --profile dev ps --status running --format '{{.Service}}' 2>/dev/null | grep -q .; then
  fail "compose running" "nenhum serviço up — rode: docker compose --profile dev up -d"
else
  REQUIRED=(postgres redis rabbitmq minio nfse-api nfse-web nfse-danfse nfse-worker nfse-sync traefik)
  RUNNING="$(docker compose --profile dev ps --status running --format '{{.Service}}' 2>/dev/null || true)"
  for svc in "${REQUIRED[@]}"; do
    if echo "$RUNNING" | grep -qx "$svc"; then
      ok "service $svc"
    else
      fail "service $svc" "não está running"
    fi
  done
fi
echo

# --- Health ---
echo "[2/5] Health da API"
LIVE_CODE="$(curl -sS -o /tmp/nfse-smoke-live.json -w '%{http_code}' --connect-timeout 5 --max-time 15 \
  "${API_BASE}/health/live" || echo 000)"
if [[ "$LIVE_CODE" == "200" ]]; then
  ok "GET /health/live ($LIVE_CODE)"
else
  fail "GET /health/live" "HTTP $LIVE_CODE"
fi

READY_CODE="$(curl -sS -o /tmp/nfse-smoke-ready.json -w '%{http_code}' --connect-timeout 5 --max-time 20 \
  -H "X-API-Key: ${API_KEY}" \
  "${API_BASE}/health/ready" || echo 000)"
if [[ "$READY_CODE" == "200" ]]; then
  ok "GET /health/ready ($READY_CODE)"
else
  fail "GET /health/ready" "HTTP $READY_CODE (body em /tmp/nfse-smoke-ready.json)"
fi
echo

# --- Auth gate ---
echo "[3/5] Autenticação"
UNAUTH_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 15 \
  "${API_BASE}/v1/nfse?limit=1" || echo 000)"
if [[ "$UNAUTH_CODE" == "401" || "$UNAUTH_CODE" == "403" ]]; then
  ok "API exige X-API-Key ($UNAUTH_CODE)"
else
  fail "API exige X-API-Key" "esperado 401/403, obteve $UNAUTH_CODE"
fi
echo

# --- Fluxo mínimo emissão (mock) ---
echo "[4/5] Emissão mock + consulta"
IDEM_KEY="smoke-$(date +%s)-$$"
EMIT_BODY='{
  "tomador": { "tipo": "PJ", "cpfCnpj": "98765432000100", "razaoSocial": "Tomador Smoke Test SA" },
  "servico": { "codigoServico": "010701", "descricao": "Smoke test NFS-e Nacional", "codigoMunicipioIncidencia": "3550308" },
  "valores": { "valorServico": 10.00 }
}'

EMIT_CODE="$(curl -sS -o /tmp/nfse-smoke-emit.json -w '%{http_code}' --connect-timeout 5 --max-time 60 \
  -X POST "${API_BASE}/v1/nfse" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: ${API_KEY}" \
  -H "X-Idempotency-Key: ${IDEM_KEY}" \
  -d "$EMIT_BODY" || echo 000)"

if [[ "$EMIT_CODE" == "200" || "$EMIT_CODE" == "201" || "$EMIT_CODE" == "202" ]]; then
  ok "POST /v1/nfse ($EMIT_CODE)"
  CHAVE="$(python3 -c "import json; print(json.load(open('/tmp/nfse-smoke-emit.json')).get('chaveAcesso') or json.load(open('/tmp/nfse-smoke-emit.json')).get('chave') or '')" 2>/dev/null || true)"
  if [[ -z "$CHAVE" ]]; then
    CHAVE="$(grep -oE '[0-9]{50}' /tmp/nfse-smoke-emit.json | head -n1 || true)"
  fi
  if [[ -n "$CHAVE" ]]; then
    ok "chaveAcesso presente (${#CHAVE} dígitos)"
    GET_CODE="$(curl -sS -o /tmp/nfse-smoke-get.json -w '%{http_code}' --connect-timeout 5 --max-time 20 \
      -H "X-API-Key: ${API_KEY}" \
      "${API_BASE}/v1/nfse/${CHAVE}" || echo 000)"
    if [[ "$GET_CODE" == "200" ]]; then
      ok "GET /v1/nfse/{chave} ($GET_CODE)"
    else
      fail "GET /v1/nfse/{chave}" "HTTP $GET_CODE"
    fi
  else
    fail "chaveAcesso" "não encontrada na resposta de emissão"
  fi
else
  fail "POST /v1/nfse" "HTTP $EMIT_CODE (body em /tmp/nfse-smoke-emit.json)"
fi
echo

# --- Console web ---
echo "[5/5] Console web"
WEB_CODE="$(curl -sS -o /dev/null -w '%{http_code}' --connect-timeout 5 --max-time 15 \
  "${WEB_BASE}/" || echo 000)"
if [[ "$WEB_CODE" == "200" || "$WEB_CODE" == "302" || "$WEB_CODE" == "303" ]]; then
  ok "GET console / ($WEB_CODE)"
else
  fail "GET console /" "HTTP $WEB_CODE"
fi
echo

echo "Resumo: ${PASS} ok, ${FAIL} fail, ${SKIP} skip"
if [[ "$FAIL" -gt 0 ]]; then
  echo "Ambiente NÃO está pronto para teste."
  exit 1
fi
echo "Ambiente pronto para teste (dev / gov mock)."
echo "Console: ${WEB_BASE}  (senha: valor de NFSE_WEB_PASSWORD no .env)"
echo "API:     ${API_BASE}"
exit 0
