#!/usr/bin/env bash
# Stack local + SPA + ensaio OP com N modelos.
# Cobre: Ficha da OP (medida/largura/puxada em todos) + Fechar por modelo (planejado imutável).
# Uso: bash scripts/pronto-op-ficha-modelos.sh
#      make pronto-op-ficha-modelos
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

echo "== Docker =="
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker API indisponível (sem /var/run/docker.sock)."
  echo "No host: sudo systemctl start docker"
  echo "Depois: make pronto-op-ficha-modelos"
  exit 1
fi
echo "ok"

echo "== Stack =="
cp -n .env.example .env 2>/dev/null || true
make stage-web-context
"${COMPOSE[@]}" up -d --build
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction
"${COMPOSE[@]}" exec -T app php artisan optimize:clear

echo "== SPA (Ficha da OP + fecho por modelo) =="
(cd apps/web && npm run build)
"${COMPOSE[@]}" up -d --force-recreate --no-build web

echo "== PHPUnit fecho (planejado carimbado) =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit \
  --filter test_conclusao_por_modelo_persiste_resultado_e_soma_totais \
  || {
    echo "WARN: phpunit falhou — confira o log acima antes do teste manual."
  }

echo "== Ensaio OP (3 modelos · Maçã/Abacate/Limão) =="
ENSAIO_OUT="$("${COMPOSE[@]}" exec -T app php artisan tinker --execute="require base_path('database/ensaios/preparar_op_fecho_modelos.php');")"
echo "$ENSAIO_OUT"
OP_ID="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^OP .* id=\([0-9][0-9]*\).*/\1/p' | head -1)"
OP_PATH="$(printf '%s\n' "$ENSAIO_OUT" | sed -n 's/^Fechar \(.*\)/\1/p' | head -1)"

echo "== Health =="
for i in 1 2 3 4 5 6 7 8 9 10 12 15; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/
make doctor

cat <<EOF

Pronto 100% — Ficha da OP + quantidade travada
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  OP:      http://localhost:8043/ordens-producao/${OP_ID:-}
  Ficha:   http://localhost:8043/ordens-producao/${OP_ID:-}/ficha-chao
  Fechar:  http://localhost:8043${OP_PATH:-/ordens-producao/${OP_ID:-}/fechar}

Roteiro A — Ficha da OP (medida em todos os modelos)
  1. Hard refresh (Ctrl+Shift+R)
  2. Login (EMP RETA) — admin ou lab.producao
  3. Abrir a OP → toolbar → Ficha da OP
  4. Identidade: 3 linhas (Maçã · Abacate · Limão)
     Medida 100X50 · Largura 10 · Puxada 5 · Material em TODAS
  5. Impressão / Acabamento: 1 linha por modelo
  6. Imprimir / conferir A4 paisagem

Roteiro B — Quantidade imutável até o fecho
  1. Na OP: planejado 10000 (5000+3000+2000) — só leitura
  2. Fechar a ordem → grade planejado só leitura · digitar boas/refugo
  3. Fechar → Resultado: boas/refugo; planejado = canônico da OP
  4. Pedido: pedida continua 10000; faturável = Σ boas (±tol)

EOF
