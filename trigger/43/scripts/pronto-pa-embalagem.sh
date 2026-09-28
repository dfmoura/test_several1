#!/usr/bin/env bash
# Stack + SPA + ensaio PED com embalagem PA confirmada (bobinas → NF infAdProd).
# Uso (no host): bash scripts/pronto-pa-embalagem.sh  |  make pronto-pa-embalagem
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migrate (pa_embalagens) =="
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction

echo "== Clear caches =="
"${COMPOSE[@]}" exec -T app php artisan optimize:clear
"${COMPOSE[@]}" restart app queue >/dev/null
sleep 2

echo "== PHPUnit PaEmbalagem + NF volumes/infAd =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter \
  'PaEmbalagemTest|test_volumes_caixas_na_nfe_quando_embalagem_confirmada'

echo "== Ensaio PED-2026-EMBNF01 (embalagem confirmada) =="
"${COMPOSE[@]}" exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_embalagem_nfe.php');"

echo "== Health =="
for i in 1 2 3 4 5; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto 100% — embalagem PA → NF com bobinas nas observações
  App:     http://localhost:8043
  Login:   admin@retaetiquetas.com.br  (senha do lab)
  Pedido:  Pedidos → PED-2026-EMBNF01
  OP:      Ordens de produção → OP-2026-EMBNF01 (já CONCLUIDA + embalada)

Roteiro rápido
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir PED-2026-EMBNF01 → Faturar
     • aviso: embalagem com bobinas/caixas; item NF em etiquetas
  3. Abrir prévia / ficha da NF-e
     • qCom = 5000 etiquetas (NÃO bobinas)
     • volumes = 1 CAIXA
     • obs. do item (infAdProd): "5 BOB · 1 CX · tubete 3\" · saida ESQUERDA · … · comp: 5x1000UN"
  4. (Opcional) OP-2026-EMBNF01 → imprimir etiquetas BOB/CX

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md (emenda 2026-09-28)
EOF
