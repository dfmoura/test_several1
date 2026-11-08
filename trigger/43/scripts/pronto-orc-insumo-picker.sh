#!/usr/bin/env bash
# Sobe stack + SPA: overlay papel/acabamento no ORC (cadastro ativo, saldo informativo).
# Uso (no host, com Docker): make pronto-orc-insumo-picker
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA =="
make web-build

echo "== Regressão OrcamentoInsumoEstoque =="
$COMPOSE exec -T app php vendor/bin/phpunit --filter OrcamentoInsumoEstoqueTest

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'TXT'

Pronto para testar
  App:  http://localhost:8043

Roteiro
  1. Orçamentos → Novo (ou editar rascunho).
  2. Seção 3 · Especificação técnica → Papel → Buscar.
  3. Overlay lista MP-PAP/MP-FLM ativos, inclusive saldo 0; escolher um sem estoque.
  4. Acabamento → Buscar → mesma lógica (MP-LAM/MP-CLD); opcional “Sem filme”.
  5. Calcular/salvar: não deve barrar por “sem saldo”; falta de preço no catálogo ORC ainda bloqueia.
  6. Revenda / caixa / OP retirada: inalterados (ainda pedem saldo onde a norma exige).

TXT
