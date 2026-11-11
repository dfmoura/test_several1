#!/usr/bin/env bash
# Stack local + SPA + OP com 2 bobinas medida exata (Passa multi-volume).
# Uso: bash scripts/pronto-op-passa-bobinas.sh
#     ou: make pronto-op-passa-bobinas
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack =="
"${COMPOSE[@]}" up -d
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction
"${COMPOSE[@]}" exec -T app php artisan optimize:clear

echo "== SPA (force rebuild) =="
(cd apps/web && npm run build)
make stage-web-context
"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d --force-recreate --no-build web

echo "== Endereços de estoque =="
"${COMPOSE[@]}" exec -T app php artisan erp:seed-estoque-enderecos --no-interaction 2>/dev/null || true

echo "== Regressão rápida =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter 'PartidaBobinaTest|test_passa_mesma_medida|test_partida_grava_plano' >/tmp/passa-phpunit.txt
tail -8 /tmp/passa-phpunit.txt

echo "== Ensaio OP Passa 2 bobinas (155×1000) =="
ENSAIO_OUT="$("${COMPOSE[@]}" exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_op_passa_duas_bobinas.php');")"
echo "$ENSAIO_OUT"
OP_ID="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^OP .* id=\([0-9][0-9]*\).*/\1/p' | head -1)"
BOBINAS_N="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/.*bobinas=\([0-9][0-9]*\).*/\1/p' | head -1)"

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

if [[ "${BOBINAS_N:-0}" != "2" ]]; then
  echo "FALHA: esperava 2 bobinas de retorno, veio ${BOBINAS_N:-?}." >&2
  exit 1
fi
echo "Gate ensaio: 2 bobinas OK"

cat <<EOF

Pronto — Passa / 2 bobinas medida exata
  App:       http://localhost:8043
  Login:     http://localhost:8043/login
  OP:        http://localhost:8043/ordens-producao/${OP_ID:-}

Login: admin@retaetiquetas.com.br  /  Admin@123
       (EMP-00001 RETA)

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir a OP → «O que sai do estoque» → Papel (Já saiu)
  3. Medida dos baixados: 155 mm × 1000 m (não × 0 m)
  4. «O que volta»: 2 linhas — ≈735,41 m + 1.000 m
  5. Local em cada linha → Confirmar devolução → Imprimir etiquetas
  6. Fechar OP só depois (fecho bloqueia com pendente)

EOF
