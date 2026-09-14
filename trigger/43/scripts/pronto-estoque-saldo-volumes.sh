#!/usr/bin/env bash
# Sobe stack local + SPA Estoque: ficha Por produto com volumes por faixa.
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

echo "== Rebuild SPA (Saldos → ficha → volumes por faixa) =="
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
  2. Selecionar um SKU com volumes (coluna Volumes > 0)
  3. Na ficha abaixo: consolidado por faixa (qtde × L×C)
  4. Em cada faixa: ícone ▾ (expande volumes) · olho (guia Volumes filtrada)
  5. Conferir lote, dimensão, entrada, vencimento, qtde, situação, local
  6. Atalhos etiqueta / Guardar / rastreio nos volumes abertos

Hard refresh no browser (Ctrl+Shift+R) se a ficha antiga aparecer.
EOF
