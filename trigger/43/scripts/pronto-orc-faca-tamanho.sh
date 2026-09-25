#!/usr/bin/env bash
# Sobe stack + SPA: Medida na leitura; Tamanho só no cadastro da faca nova.
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
  1. Mapa de facas → lista/detalhe/ficha: Medida + Largura; sem coluna/campo Tamanho.
  2. Orçamentos → ficha operacional, ficha do cliente e proposta: Medida; sem Tamanho.
  3. Detalhe/lista do ORC → desenho com Medida + Largura; sem chip Tamanho.
  4. Cadastro de faca nova (mapa e picker) → Tamanho (cm) / Diâmetro (cm) continua.

TXT
