#!/usr/bin/env bash
# Sobe stack local + migration contagem_evidencia + SPA Ajustes QR (volume+local).
# Uso (no host, com Docker): bash scripts/pronto-estoque-ajuste-qr.sh
#     ou: make pronto-estoque-ajuste-qr
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migration (estoque_ajustes.contagem_evidencia) =="
make migrate

echo "== Locais do almoxarifado (gabarito idempotente) =="
make seed-estoque-enderecos

echo "== Rebuild SPA (Estoque → Ajustes → QR volume+local) =="
make web-build

echo "== PHPUnit contagem QR + regressão AJU / A03 =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php vendor/bin/phpunit --filter \
  'EstoqueAjusteContagemQrTest|EstoqueAjusteViradaVolumesTest|EstoqueReposicaoAjusteTest::test_ajuste'

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

echo "== Schema contagem_evidencia =="
docker compose --env-file .env -f docker-compose.yml -f docker-compose.local.yml exec -T app \
  php artisan tinker --execute="echo Schema::hasColumn('estoque_ajustes', 'contagem_evidencia') ? 'OK coluna contagem_evidencia' : 'FALHA coluna ausente';"

cat <<'EOF'

Pronto para testar — Estoque / Ajustes / contagem por QR
  App:       http://localhost:8043
  Ajustes:   http://localhost:8043/estoque/ajustes
  Guardar:   http://localhost:8043/estoque/guardar
  Login:     http://localhost:8043/login

Pré-requisitos no chão
  • Dois usuários (SoD): estoque.escrever (solicitar) + estoque.aprovar (conferir)
  • SKU MP com controla_lote e volumes etiquetados (VOL) com qtde > 0
  • QR do local (END) — Mapa / etiquetas de endereço
  • Hard refresh (Ctrl+Shift+R) se a tela antiga aparecer

Roteiro
  1. Login com estoque.escrever
  2. Estoque → Ajustes → aba «Por QR (volume + local)»
  3. (Opcional) escolha o produto — ou deixe o 1º VOL inferir o SKU
  4. Motivo A01 (ou outro ≠ A03) · confirme END · leia 1+ VOL na fila
  5. Qtde contada = soma da fila · checklist → Solicitar AJU
  6. Logout → login com aprovador → Conferir (vê volumes/local) → Aprovar
  7. Local errado na fila: quantidade entra; endereço corrige em Guardar
  8. A03 continua manual (volumes de abertura) — sem QR de volumes existentes

EOF
