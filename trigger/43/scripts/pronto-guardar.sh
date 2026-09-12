#!/usr/bin/env bash
# Sobe/atualiza SPA Guardar (volume ↔ local, duas ordens) e deixa pronto para testar.
# Uso (no host, com Docker): bash scripts/pronto-guardar.sh
#     ou: make pronto-guardar
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (Guardar no local) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar Guardar no local
  App:     http://localhost:8043/estoque/guardar

Roteiro
  1. Login (estoque.escrever)
  2. Estoque → guia Guardar
  3. Aba "Volume → local" (padrão): lê VOL, depois END
  4. Aba "Local → volume": lê END (local fica fixo), depois vários VOL
  5. Hard refresh (Ctrl+Shift+R) se não ver as abas

EOF
