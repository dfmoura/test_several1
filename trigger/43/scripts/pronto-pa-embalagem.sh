#!/usr/bin/env bash
# Stack + SPA + ensaio PED com embalagem PA confirmada (bobinas → NF infAdProd detalhado).
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

echo "== Migrate (pa_embalagens / nfe_qtde_modo) =="
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction

echo "== Clear caches =="
"${COMPOSE[@]}" exec -T app php artisan optimize:clear
"${COMPOSE[@]}" restart app queue >/dev/null
sleep 2

echo "== PHPUnit PaEmbalagem + NF volumes/infAd =="
"${COMPOSE[@]}" exec -T app php vendor/bin/phpunit --filter \
  'PaEmbalagemTest|test_volumes_caixas_na_nfe_quando_embalagem_confirmada'

echo "== Ensaio PED-2026-EMBNF02 (embalagem confirmada + spec rica) =="
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

Pronto 100% — embalagem PA → NF (ROLO ou ETIQUETA) com obs. detalhada
  App:     http://localhost:8043
  Login:   admin@retaetiquetas.com.br  (senha do lab)
  Pedido:  Pedidos → PED-2026-EMBNF02
  OP:      Ordens de produção → OP-2026-EMBNF02 (já CONCLUIDA + embalada)

Roteiro rápido
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir PED-2026-EMBNF02 → Faturar
     • default quantidade NF = ROLO (5 RL) se embalagem confirmada
     • pode trocar para ETIQUETA no FAT enquanto NF não autorizada
  3. Abrir prévia / ficha da NF-e
     • modo ROLO: qCom = 5 RL; volumes = 1 CAIXA
     • obs. item (infAdProd), ex.:
       "5.000 UN · med 100X50 · Couchê Brilho · 4 cor(es) · Verniz UV · modelo Frente A/Verso B · 1 CX · tubete 3\" · saida ESQUERDA · caixa 500x300 · comp: 5x1000UN"
  4. (Opcional) OP-2026-EMBNF02 → imprimir etiquetas BOB/CX

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md (emendas 2026-09-28 / 09-29)
EOF
