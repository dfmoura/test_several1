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
  3. Comercial · etiqueta (3 modelos: 5000 / 3000 / 2000):
     - Quant. por modelo; rodapé Quant. = 10.000
     - Matriz R\$ 340 rateada (170 / 102 / 68) · total sob a coluna
     - Arte (80 / 50 / 20) · total sob a coluna
     - Faca R\$ 180 rateada (90 / 54 / 36) · total sob a coluna
     - Comissão R\$ 175 rateada (87,50 / 52,50 / 35) · total sob a coluna
     - Sub-Total = etiquetas do modelo (Σ R\$ 3.500,00) · permanece
     - Coluna Total por linha (etiqueta+matriz+arte+faca); rodapé Total = R\$ 4.170,00
     - Sem linhas "Total matriz" / "Total comercial" (só rodapé alinhado)
     - Sem Frete / Desc. na grade (só no fechamento)
  4. Produção: 3 linhas (1 por modelo); setup (metragem/m²/larg. papel/etiq/rolo/m/rolo…)
     repete em cada modelo; Rolos rateados (ex. 5 / 3 / 2); m/rolo = 1000×5÷100 = 50
  5. Imprimir / Salvar PDF (A4 paisagem)
  6. Fechamento: Frete R\$ 120 (fora do total) · Desc. R\$ 50 · Total do pedido

EOF
