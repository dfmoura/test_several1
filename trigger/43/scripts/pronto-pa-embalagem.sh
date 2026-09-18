#!/usr/bin/env bash
# Stack + SPA com embalagem PA (bobina → caixa → etiquetas BOB/CX).
# Uso (no host): bash scripts/pronto-pa-embalagem.sh  |  make pronto-pa-embalagem
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migrate (pa_embalagens) =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php artisan migrate --force --no-interaction

echo "== Clear caches =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php artisan optimize:clear

echo "== PHPUnit PaEmbalagem =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php vendor/bin/phpunit --filter PaEmbalagemTest

echo "== Rebuild SPA =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto 100% para testar embalagem PA (bobina → caixa)
  App:  http://localhost:8043
  OP:   Ordens de produção → OP concluída → bloco Embalagem PA

Roteiro rápido (há OP aberta no lab)
  1. Login (produção / admin)
  2. Abrir OP-2026-00001 (ou outra OP do PED)
  3. Requisitar materiais → Concluir com qtde boa
  4. No bloco Embalagem PA: conferir sugestão → Confirmar embalagem
  5. Imprimir etiquetas BOB/CX (Elgin 50×40, escala 100%)
  6. Pedido → Faturar (aviso com bobinas/caixas; item = etiquetas)
  7. Expedir (volumes já sugeridos = nº de caixas)

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md
EOF
