#!/usr/bin/env bash
# Sobe/atualiza SPA da Caixa de NF-e (chrome denso: sync + filtros) e deixa pronto para testar.
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

echo "== Rebuild SPA (Caixa de NF-e + NF-e vinculadas) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

CSS=$(curl -sfS -m 10 http://localhost:8043/ | sed -n 's/.*href="\([^"]*\.css\)".*/\1/p' | head -1)
JS=$(curl -sfS -m 10 http://localhost:8043/ | sed -n 's/.*src="\([^"]*\.js\)".*/\1/p' | head -1)
if curl -sfS -m 10 "http://localhost:8043${CSS}" | grep -q 'nfe-destinadas-chrome'; then
  echo "Chrome CSS: ok (${CSS})"
else
  echo "AVISO: nfe-destinadas-chrome não encontrado no CSS servido — faça Ctrl+Shift+R"
fi
if [[ -n "${JS}" ]] && curl -sfS -m 10 "http://localhost:8043${JS}" | grep -q 'Caixa de NF-e'; then
  echo "Rótulos UX: ok (Caixa de NF-e no bundle)"
else
  echo "AVISO: rótulo Caixa de NF-e não encontrado no JS — faça Ctrl+Shift+R"
fi
if [[ -n "${JS}" ]] && curl -sfS -m 10 "http://localhost:8043${JS}" | grep -q 'NF-e vinculadas'; then
  echo "Rótulos UX: ok (NF-e vinculadas no bundle)"
else
  echo "AVISO: rótulo NF-e vinculadas não encontrado no JS — faça Ctrl+Shift+R"
fi

cat <<'EOF'

Pronto para testar Caixa de NF-e / NF-e vinculadas
  Caixa:      http://localhost:8043/compras/nfe-destinadas
  Vinculadas: http://localhost:8043/compras/nfe-recebidas

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Login (compras.ler / compras.escrever)
  3. Compras → Caixa de NF-e  e  Compras → NF-e vinculadas
  4. Confira títulos, menu e links cruzados entre as duas telas

EOF
