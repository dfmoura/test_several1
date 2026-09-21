#!/usr/bin/env bash
# Publica SPA + garante stack local com identidade Cliente/Emitente nas fichas comerciais.
# Uso (no host, com Docker): bash scripts/pronto-ficha-cliente-identidade.sh
#     ou: make pronto-ficha-cliente-identidade
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (fichas comerciais) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/
ASSET=$(rg -o 'assets/index-[A-Za-z0-9_-]+\.js' apps/web/dist/index.html | head -1)
echo "SPA asset: ${ASSET}"

cat <<EOF

Pronto — ficha do cliente com identidade completa
  App:  http://localhost:8043

Onde ver
  1. Orçamento → Ficha do cliente  (/orcamentos/{id}/ficha-cliente)
  2. Hard refresh (Ctrl+Shift+R) — asset novo: ${ASSET}
  3. Head da proposta: emitente compacto (CNPJ · tel · e-mail · endereço)
  4. Card Cliente: identidade completa do PAR
  5. Pedido → Ficha do cliente — mesmo padrão

Conferir API (login + X-Empresa-Id):
  GET /api/v1/orcamentos/{id}/proposta-comercial
  → data.cliente.razao_social / cnpj_cpf / logradouro / …

EOF
