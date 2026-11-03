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

Pronto 100% — etiquetas PA (1 bobina = 1 modelo · caixa com conteúdo)
  App:     http://localhost:8043
  Login:   admin@retaetiquetas.com.br  /  Admin@123

Teste principal (grupo físico legível)
  1. Hard refresh (Ctrl+Shift+R)
  2. OP-2026-EMBNF02 → Embalagem PA → ver "Por modelo" · Imprimir BOB/CX
     · BOBINA: hero = Frente A ou Verso B (não "A / B" em todo rolo)
     · CAIXA: MISTA + linha Frente A: N bob · … | Verso B: …
  3. Expedição → PED-2026-EMBKIT → «Etiquetas da embalagem»
     · faces na ordem item → caixa → bobinas
     · Item 1/2 e Item 2/2 visíveis · artes A/B e X/Y

Regressão
  · Faturar PED-2026-EMBNF02 (modo ROLO) se ainda PRODUZIDO
  · Kit multipla sem "undefined"

Impressora: Elgin L42 Pro Full · 50×40 mm · escala 100%

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md · docs/ADR_ENTREGA_EXPEDICAO.md
EOF
