#!/usr/bin/env bash
# Stack + SPA + ensaio kit etiquetas BOB/CX (única e multipla na expedição).
# Uso (no host): bash scripts/pronto-pa-embalagem.sh  |  make pronto-pa-embalagem
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (kit etiquetas multipla + guarda embId) =="
make web-build

echo "== Migrate (pa_embalagens) =="
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction

echo "== Clear caches =="
"${COMPOSE[@]}" exec -T app php artisan optimize:clear
"${COMPOSE[@]}" restart app queue >/dev/null
sleep 2

echo "== PHPUnit PaEmbalagem (incl. resumo multipla) =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter PaEmbalagemTest

echo "== Ensaio PED-2026-EMBNF02 (1 embalagem → NF) =="
"${COMPOSE[@]}" exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_embalagem_nfe.php');"

echo "== Ensaio PED-2026-EMBKIT (2 embalagens → kit expedição) =="
"${COMPOSE[@]}" exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_embalagem_kit_expedicao.php');"

echo "== Health / doctor =="
for i in 1 2 3 4 5; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/
make doctor

cat <<'EOF'

Pronto 100% — etiquetas embalagem PA (kit expedição sem undefined)
  App:     http://localhost:8043
  Login:   admin@retaetiquetas.com.br  /  Admin@123

Teste do bug (multipla — o que quebrava)
  1. Hard refresh (Ctrl+Shift+R)
  2. Expedição → PED-2026-EMBKIT  (ou /expedicao/pedido/<id>)
  3. Documentos da saída → 2 botões "Etiquetas EMB…"
  4. Abrir cada um → faces BOB/CX · sem erro "PaEmbalagem undefined"

Regressão (1 embalagem)
  · OP-2026-EMBNF02 → Imprimir etiquetas BOB/CX
  · ou faturar PED-2026-EMBNF02 e abrir kit (1 botão)

Impressora: Elgin L42 Pro Full · 50×40 mm · escala 100%

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md · docs/ADR_ENTREGA_EXPEDICAO.md
EOF
