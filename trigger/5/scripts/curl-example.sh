#!/usr/bin/env sh
# Exemplo de chamada ao endpoint de linhas de crédito (mock por padrão no Docker).

BASE_URL="${BASE_URL:-http://localhost:3000}"

RESP="$(curl -sS -X POST "${BASE_URL}/credit-lines" \
  -H "Content-Type: application/json" \
  -d '{
    "cpf": "52998224725",
    "consentId": "550e8400-e29b-41d4-a716-446655440000"
  }')"
if command -v jq >/dev/null 2>&1; then
  echo "$RESP" | jq .
else
  echo "$RESP"
fi
