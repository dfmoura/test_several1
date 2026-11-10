#!/usr/bin/env bash
# Stack local + SPA + OP com Passa/partida já baixada (grade bobinas a devolver).
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

echo "== SPA (Bobinas a devolver) =="
if [[ ! -f apps/web/dist/index.html ]] || ! grep -q 'Bobinas a devolver' apps/web/dist/assets/*.js 2>/dev/null; then
  (cd apps/web && npm run build)
fi
make stage-web-context
"${COMPOSE[@]}" build web
"${COMPOSE[@]}" up -d --force-recreate --no-build web

echo "== Endereços de estoque =="
"${COMPOSE[@]}" exec -T app php artisan erp:seed-estoque-enderecos --no-interaction 2>/dev/null || true

echo "== Regressão rápida =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter 'PartidaBobinaTest|test_passa_mesma_medida|test_partida_grava_plano' >/tmp/passa-phpunit.txt
tail -5 /tmp/passa-phpunit.txt

echo "== Ensaio OP Passa =="
ENSAIO_OUT="$("${COMPOSE[@]}" exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_op_passa_bobinas.php');")"
echo "$ENSAIO_OUT"
OP_ID="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^OP .* id=\([0-9][0-9]*\).*/\1/p' | head -1)"

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
# Confirma bundle com a grade
if docker compose --env-file .env exec -T web sh -c 'grep -q "Bobinas a devolver" /var/www/web/assets/*.js'; then
  echo "SPA bundle: Bobinas a devolver OK"
else
  echo "AVISO: texto da grade não encontrado no bundle web" >&2
fi

cat <<EOF

Pronto — Passa / bobinas a devolver
  App:       http://localhost:8043
  Login:     http://localhost:8043/login
  OP:        http://localhost:8043/ordens-producao/${OP_ID:-}

Login: admin@retaetiquetas.com.br  /  Admin@123
       (EMP-00001 RETA)

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir a OP → «O que sai do estoque» → Papel (já saiu)
  3. Grade «Bobinas a devolver»: Refile + Sobra (Passa)
  4. Escolher local em cada linha → Confirmar devolução
  5. Imprimir etiquetas → Guardar se precisar
  6. Fechar OP só depois (fecho bloqueia com pendente)

EOF
