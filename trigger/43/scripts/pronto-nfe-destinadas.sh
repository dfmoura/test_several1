#!/usr/bin/env bash
# Sobe/atualiza SPA da caixa NF-e destinadas (chrome denso: sync + filtros) e deixa pronto para testar.
# Uso (no host, com Docker): bash scripts/pronto-nfe-destinadas.sh
#     ou: make pronto-nfe-destinadas
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (NF-e destinadas chrome) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

CSS=$(curl -sfS -m 10 http://localhost:8043/ | sed -n 's/.*href="\([^"]*\.css\)".*/\1/p' | head -1)
if curl -sfS -m 10 "http://localhost:8043${CSS}" | grep -q 'nfe-destinadas-chrome'; then
  echo "Chrome CSS: ok (${CSS})"
else
  echo "AVISO: nfe-destinadas-chrome não encontrado no CSS servido — faça Ctrl+Shift+R"
fi

cat <<'EOF'

Pronto para testar NF-e destinadas
  App:     http://localhost:8043/compras/nfe-destinadas

Roteiro
  1. Login (compras.ler / compras.escrever)
  2. Compras → NF-e destinadas
  3. Confira o chrome compacto (sync + filtros numa faixa) e a tabela logo abaixo
  4. Hard refresh (Ctrl+Shift+R) se ainda ver os dois cards altos

EOF
