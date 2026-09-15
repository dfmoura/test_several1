#!/usr/bin/env bash
# Sobe/atualiza SPA “Novo a partir deste” (produto modelo) e deixa pronto para testar.
# Uso (no host, com Docker): bash scripts/pronto-produto-modelo.sh
#     ou: make pronto-produto-modelo
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (Novo a partir deste) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — Novo produto a partir do modelo
  App:     http://localhost:8043/produtos

Roteiro
  1. Login (produto.escrever)
  2. Cadastros → Produtos
  3. Na linha de um SKU, ícone “Novo a partir deste” (ou abra a ficha → mesmo botão)
  4. Confira o banner azul; foque Nome no estoque + Descrição fiscal (+ código se quiser)
  5. Criar novo SKU → deve nascer com código novo, saldo/de-para separados do modelo
  6. Hard refresh (Ctrl+Shift+R) se a UI antiga ainda aparecer

EOF
