#!/usr/bin/env bash
# Sobe stack local + SPA com ficha de chão unificada (Impressão e acabamento).
# Uso (no host, com Docker): bash scripts/pronto-ficha-chao.sh
#     ou: make pronto-ficha-chao
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (ficha-chao unificada) =="
make web-build

echo "== Health =="
for i in 1 2 3 4 5 6 7 8; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — ficha Impressão e acabamento
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  OPs:     http://localhost:8043/ordens-producao

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Ordens de produção → abrir uma OP de etiqueta
  3. Toolbar: um botão "Impressão e acabamento" (não há mais Impressão e Acabamento separados)
  4. Abrir a ficha: Identidade → Impressão · máquina → Acabamento · rebobinação (só exclusivos)
  5. Imprimir / conferir paisagem A4
  6. URLs antigas /ficha-impressao e /ficha-acabamento redirecionam para /ficha-chao

Sem mexer em Imprimir lista (flexo) nem Materiais · retirada.

EOF
