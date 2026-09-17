#!/usr/bin/env bash
# Sobe stack + SPA: Tamanho na faca do ORC · sem campo Medida no mapa (ORC/Mapa).
# Uso (no host, com Docker): make pronto-orc-faca-tamanho
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

echo "== Regressão FacasComposicao =="
$COMPOSE exec -T app php vendor/bin/phpunit --filter FacasComposicaoTest

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'TXT'

Pronto para testar
  App:  http://localhost:8043

Roteiro
  1. Mapa de facas → lista/detalhe/prévia: Largura + Tamanho; sem "Medida" / "Identidade".
  2. Orçamentos → ORC salvo: desenho com Largura + Tamanho (ou Diâmetro); sem chip Medida.
  3. Editar ORC → lista da faca com Tamanho; sem string crua de medida.
  4. Novo ORC → escolher faca no mapa → Tamanho aparece; salvar e reabrir.

TXT
