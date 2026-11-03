#!/usr/bin/env bash
# Stack local + SPA + ensaio OP pronta para Fechar por modelo.
# Uso: bash scripts/pronto-op-fecho-modelos.sh
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

echo "== SPA (fecho por modelo) =="
if [[ ! -f apps/web/dist/index.html ]] || ! grep -q 'ordens-producao/:id/fechar\|/fechar' apps/web/dist/assets/*.js 2>/dev/null; then
  (cd apps/web && npm run build)
fi
"${COMPOSE[@]}" up -d --force-recreate --no-build web

echo "== Ensaio OP fecho =="
ENSAIO_OUT="$("${COMPOSE[@]}" exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_op_fecho_modelos.php');")"
echo "$ENSAIO_OUT"
OP_ID="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^OP .* id=\([0-9][0-9]*\).*/\1/p' | head -1)"
OP_PATH="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^Fechar \(.*\)/\1/p' | head -1)"

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
curl -sfS -o /dev/null -w "API HTTP %{http_code}\n" -m 10 http://localhost:8040/api/v1/health

cat <<EOF

Pronto — Fechar a ordem por modelo
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  OP:      http://localhost:8043/ordens-producao/${OP_ID:-}
  Fechar:  http://localhost:8043${OP_PATH:-/ordens-producao/${OP_ID:-}/fechar}

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Login (EMP RETA) — admin ou lab.producao
  3. Abrir a OP → card Fechar a ordem → botão
  4. Conferir grade Maçã 5000 · Abacate 3000 · Limão 2000
  5. Ajustar boas/refugo → Fechar a ordem
  6. Volta na OP → Resultado com a grade

EOF
