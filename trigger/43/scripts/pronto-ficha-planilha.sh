#!/usr/bin/env bash
# Sobe stack local + SPA com Ficha planilha (qtde/comissão por modelo).
# Uso (no host, com Docker): bash scripts/pronto-ficha-planilha.sh
#     ou: make pronto-ficha-planilha
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (ficha planilha) =="
make web-build

echo "== Ensaio PED-2026-PLAN01 (3 modelos) =="
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env"
ENSAIO_OUT="$($COMPOSE exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_ficha_planilha.php');")"
echo "$ENSAIO_OUT"
PED_ID="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^PED .* id=\([0-9][0-9]*\).*/\1/p' | head -1)"

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

cat <<EOF

Pronto para testar — Ficha planilha (Pedidos)
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  Pedido:  http://localhost:8043/pedidos/${PED_ID:-}
  Ficha:   http://localhost:8043/pedidos/${PED_ID:-}/ficha-planilha

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir PED-2026-PLAN01 → Ficha planilha
  3. Conferir grade comercial (3 modelos: 5000 / 3000 / 2000):
     - Quant. por modelo (não só na 1ª linha)
     - Comissão rateada por modelo (fecha em R$ 175,00)
     - Matriz R$ 340 e faca R$ 180 só na 1ª linha do item
     - Frete R$ 120 e Desc. R$ 50 só na 1ª linha do documento
     - Vlr. rolo = taxa unitária (repete)
     - Sub-Total = etiquetas do modelo (Σ R$ 3.500,00)
     - Rodapé: Subtotal etiquetas + matriz + faca + artes · Total comercial R$ 4.170,00
  4. Imprimir / Salvar PDF (A4 paisagem)
  5. Fechamento: frete fora do total; desconto no documento

EOF
