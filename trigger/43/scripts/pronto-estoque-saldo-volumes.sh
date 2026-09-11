#!/usr/bin/env bash
# Sobe stack local + SPA com coluna Volumes na aba Saldo (Estoque).
# Uso (no host, com Docker): bash scripts/pronto-estoque-saldo-volumes.sh
#     ou: make pronto-estoque-saldo-volumes
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (Saldo + Volumes) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar volumes no Saldo
  App:     http://localhost:8043
  Estoque: http://localhost:8043/estoque

Roteiro
  1. Login → Estoque → aba Por produto
  2. Conferir coluna Volumes ao lado de Saldo / Unidade (ex. M²)
  3. Clicar no número → abre aba Volumes filtrada no SKU
  4. Abrir extrato do SKU → KPI "Volumes com saldo"

Hard refresh no browser (Ctrl+Shift+R) se a coluna não aparecer.
EOF
