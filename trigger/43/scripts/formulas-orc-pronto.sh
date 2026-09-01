#!/usr/bin/env bash
# Prepara fórmulas ORC parametrizadas para teste manual (stack local).
# Uso: ./scripts/formulas-orc-pronto.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE="docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env"

echo "== Docker =="
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker parado. Suba o daemon e rode: make up"
  exit 1
fi

if ! $COMPOSE ps --status running 2>/dev/null | grep -qE 'erp43_app|app'; then
  echo "Containers fora do ar — subindo (make up)…"
  make up
  # aguarda app healthy
  for i in 1 2 3 4 5 6 7 8 9 10; do
    if $COMPOSE exec -T app php -v >/dev/null 2>&1; then
      break
    fi
    sleep 3
  done
fi

echo ""
echo "== Sync catálogo ORC a partir do xlsm oficial (rv4) =="
XLSM_DEFAULT="$ROOT/apps/api/resources/data/orcamento/ORcAMENTO_OFICIAL_rv4.xlsm"
if [[ -z "${ORC_XLSM:-}" && -f "$XLSM_DEFAULT" ]]; then
  ORC_XLSM="$XLSM_DEFAULT"
elif [[ -z "${ORC_XLSM:-}" ]]; then
  ORC_XLSM="/home/dfmoura/Downloads/ORcAMENTO_OFICIAL_rv4.xlsm"
fi
python3 scripts/sync_orcamento_from_xlsm.py --xlsm "$ORC_XLSM"

echo ""
echo "== Seed catálogo ORC (parâmetros do motor em todas as EMPs) =="
$COMPOSE exec -T app php artisan orcamento:ensure-catalogo --force

echo ""
echo "== Seed mapa de facas (rv4 → todas as EMPs) =="
$COMPOSE exec -T app php artisan facas:ensure-mapa --force

echo ""
echo "== Testes regressão ORC (motor v2 + catálogo + frete + API) =="
$COMPOSE exec -T app php vendor/bin/phpunit --filter 'Orcamento' || {
  echo "WARN: phpunit falhou — confira o log acima antes de testar na UI."
  exit 1
}

echo ""
echo "== Rebuild SPA =="
make web-build

echo ""
echo "Pronto para testar:"
echo "  http://localhost:8043/orcamento-catalogo?tab=tinta"
echo "  http://localhost:8043/orcamento-catalogo?tab=perdas"
echo "  http://localhost:8043/orcamento-catalogo?tab=embalagem"
echo "  http://localhost:8043/orcamentos/como-calcula"
echo "  http://localhost:8043/orcamentos/novo             (Calcular → Composição do custo → Como chegou neste valor)"
echo ""
echo "Hard refresh no browser: Ctrl+Shift+R"
echo "Permissão: orcamento.catalogo.gerir (catálogo) · orcamento.ler (como calcula)"
