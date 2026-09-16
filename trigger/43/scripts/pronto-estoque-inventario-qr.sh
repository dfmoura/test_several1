#!/usr/bin/env bash
# Sobe stack local + migration INV leituras + SPA Inventários (QR volume+local).
# Uso (no host, com Docker): bash scripts/pronto-estoque-inventario-qr.sh
#     ou: make pronto-estoque-inventario-qr
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migration (estoque_inventario_leituras) =="
make migrate

echo "== Locais do almoxarifado (gabarito idempotente) =="
make seed-estoque-enderecos

echo "== Rebuild SPA (Inventários QR) =="
make web-build

echo "== Health =="
# Nginx recém recriado pode demorar 1–2s a aceitar conexão.
for i in 1 2 3 4 5; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

# Confirma tabela no banco da app (não é o phpunit).
echo "== Schema INV leituras =="
docker compose --env-file .env -f docker-compose.yml -f docker-compose.local.yml exec -T app \
  php artisan tinker --execute="echo Schema::hasTable('estoque_inventario_leituras') ? 'OK tabela estoque_inventario_leituras' : 'FALHA tabela ausente';"

cat <<'EOF'

Pronto para testar — Estoque / Inventários (QR)
  App:          http://localhost:8043
  Inventários:  http://localhost:8043/estoque/inventarios
  Guardar:      http://localhost:8043/estoque/guardar
  Login:        http://localhost:8043/login

Pré-requisitos no chão
  • Usuário com estoque.ler + estoque.escrever
  • SKU MP com volume (qtde > 0) e etiqueta VOL impressa / QR conhecido
  • Volume amarrado a um local (via Guardar) — ou teste LOCAL_ERRADO de propósito
  • QR do local (END) impresso ou copiado do Mapa / etiquetas de endereço

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Estoque → Inventários → Abrir inventário (marque SKUs com volume)
  3. Painel Contagem por QR: confirmar local (END) → ler volumes (VOL)
  4. Fechar 1ª contagem por QR → conferir confrontação na tabela SKU
  5. Se divergir: 2ª contagem com outro usuário → Gerar AJU se Δ de qtde
  6. Local errado: não gera AJU — corrija em Guardar
  7. SKU sem volume: Continua Contar 1ª decimal na tabela

EOF
