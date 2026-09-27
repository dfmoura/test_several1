#!/usr/bin/env bash
# Sobe stack local + SPA Estoque: Posição = produto · dimensão · quantidade (soma).
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

echo "== Rebuild SPA (Saldos → Posição plana) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — Estoque / Posição
  App:     http://localhost:8043
  Estoque: http://localhost:8043/estoque
  Login:   http://localhost:8043/login

Roteiro
  1. Login → Estoque → aba Posição
  2. Uma linha = produto + dimensão + quantidade somada
  3. Clique na linha → Volumes daquele produto + L×C
  4. Bobina / etiqueta / local: aba Volumes · documento: aba Movimentos

Hard refresh no browser (Ctrl+Shift+R) se a SPA antiga aparecer.
EOF
