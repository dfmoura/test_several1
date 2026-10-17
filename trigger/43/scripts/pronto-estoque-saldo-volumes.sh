#!/usr/bin/env bash
# Sobe stack local + SPA Estoque: Saldos = item sem volume e cada volume na mesma tabela.
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

echo "== Rebuild SPA (Saldos: item e cada volume na tabela) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — Estoque / Saldos
  App:     http://localhost:8043
  Estoque: http://localhost:8043/estoque
  Login:   http://localhost:8043/login
           (acesso desta instalação — a senha do .env pode não ser a da conta)

Roteiro
  1. Login → Estoque → Saldos
  2. Uma tabela: produto, volume, dimensão, quantidade, situação, local
  3. Cada bobina já está na lista: código, validade, etiqueta, guardar e rastreio
  4. Item sem volume: quantidade e código do local na linha. Marcar local fica no Mapa
  5. Extrato na linha abre o kardex. Movimento não é guia desta tela.

Hard refresh no browser (Ctrl+Shift+R) se a SPA antiga aparecer.
EOF
