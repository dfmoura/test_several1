#!/usr/bin/env bash
# Sobe stack local + SPA com ficha de chão unificada (máquina + prateleira).
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

echo "== Rebuild SPA (ficha de chão) =="
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

Pronto para testar — Ficha de chão
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  OPs:     http://localhost:8043/ordens-producao

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Ordens de produção → abrir uma OP de etiqueta
  3. Toolbar: Imprimir lista + Ficha de chão
  4. Abrir: Identidade → Impressão → Acabamento → Retirada · prateleira
  5. Imprimir / conferir paisagem A4
  6. URLs antigas (impressão/acabamento/materiais/retirada) redirecionam para /ficha-chao

Confirmar saída continua só em Estoque · A buscar.

EOF
