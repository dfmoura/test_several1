#!/usr/bin/env bash
# Stack + ensaio PED embalado → faturar ROLO/ETIQUETA (NF-e).
# Uso no HOST (precisa do Docker socket): make pronto-faturamento-rolo
# Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env)

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migrate + caches =="
"${COMPOSE[@]}" exec -T app php artisan migrate --force --no-interaction
"${COMPOSE[@]}" exec -T app php artisan optimize:clear

echo "== Parceiro apto NF-e (pré-requisito do ensaio) =="
"${COMPOSE[@]}" exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_nfe_pa.php');" \
  || true

echo "== Ensaio PED-2026-EMBNF02 (embalagem confirmada → FAT pendente, default ROLO) =="
"${COMPOSE[@]}" exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_embalagem_nfe.php');"

echo "== Health / doctor =="
for i in 1 2 3 4 5; do
  if curl -sfS -m 15 http://localhost:8043/api/v1/health >/dev/null; then
    break
  fi
  sleep 1
done
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/
make doctor

cat <<'EOF'

Pronto 100% — faturar etiqueta sob medida por ROLO (padrão) ou ETIQUETA

  App:    http://localhost:8043
  Login:  admin@retaetiquetas.com.br
  Senha:  Admin@123
  EMP:    EMP-00001 (RETA ETIQUETAS)

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Pedidos → PED-2026-EMBNF02  (status PRODUZIDO · embalagem já confirmada)
  3. Faturar
  4. No FAT → card «Quantidade na NF-e»
       · Por rolo (bobina)  ← padrão
       · Por etiqueta (UN)  ← override (amostra / sem rebobinar)
  5. Salvar quantidade NF → abrir prévia / DANFE
       · ROLO: qCom = bobinas · uCom = RL · infAdProd com total UN
       · ETIQUETA: qCom = UN · infAdProd com BOB

Se ROLO bloquear: Ordens de produção → OP-2026-EMBNF02 → Embalar → voltar ao PED.

Cobrança / TIT / estoque continuam em etiquetas — só a NF muda a unidade.

Norma: docs/ADR_PA_EMBALAGEM_BOBINA_CAIXA.md · docs/MAPA_FATURAMENTO.md
EOF
