#!/usr/bin/env bash
# Sobe stack local + SPA Estoque: Por produto = saldo oficial (sem ficha ao clicar).
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

echo "== Rebuild SPA (Saldos → Por produto limpo) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — Estoque / Por produto
  App:     http://localhost:8043
  Estoque: http://localhost:8043/estoque
  Login:   http://localhost:8043/login

Roteiro
  1. Login → Estoque → aba Por produto
  2. Grade = só posição oficial (sem detalhe ao clicar na linha)
  3. Na linha: olho → Volumes filtrado · documento → Extrato · caixa → Cadastro
  4. Faixas físicas: aba Consolidado
  5. Bobinas / etiqueta / local: aba Volumes

Hard refresh no browser (Ctrl+Shift+R) se a SPA antiga aparecer.
EOF
