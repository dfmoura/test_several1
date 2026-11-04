#!/usr/bin/env bash
# Stack local + SPA + OP ensaio do gate (papel/acabamento antes de Confirmar saída).
# Uso: bash scripts/pronto-op-gate-saida-critica.sh
#     ou: make pronto-op-gate-saida-critica
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

echo "== SPA (gate Confirmar saída) =="
if [[ ! -f apps/web/dist/index.html ]] || ! grep -q 'Escolha o papel antes de confirmar a saída' apps/web/dist/assets/*.js 2>/dev/null; then
  (cd apps/web && npm run build)
fi
make stage-web-context
"${COMPOSE[@]}" up -d --force-recreate --no-build web

echo "== Endereços de estoque (se faltarem) =="
"${COMPOSE[@]}" exec -T app php artisan erp:seed-estoque-enderecos --no-interaction 2>/dev/null || true

echo "== Ensaio OP gate =="
ENSAIO_OUT="$("${COMPOSE[@]}" exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_op_gate_saida_critica.php');")"
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

cat <<EOF

Pronto — gate Confirmar saída (papel + acabamento)
  App:       http://localhost:8043
  Login:     http://localhost:8043/login
  OP:        http://localhost:8043/ordens-producao/${OP_ID:-}
  A buscar:  http://localhost:8043/estoque/retiradas/${OP_ID:-}

Login: admin@retaetiquetas.com.br  /  Admin@123
       (EMP-00001 RETA)

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir a OP → seção «O que sai do estoque»
  3. Papel e Acabamento em Sem estoque / escolher item; Caixa em Falta pegar
  4. Botão Confirmar saída desabilitado + texto do motivo
  5. Escolher bobina MP-FLM-003 no papel e no acabamento
  6. Confirmar saída libera (baixa junto com a caixa)
  7. Opcional: mesma OP em Estoque → A buscar (mesmo motor)

EOF
