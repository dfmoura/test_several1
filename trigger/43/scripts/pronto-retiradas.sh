#!/usr/bin/env bash
# Sobe stack local + migration handoff + SPA Retiradas (coleta dirigida A–C).
# Uso (no host, com Docker): bash scripts/pronto-retiradas.sh
#     ou: make pronto-retiradas
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migration (OP insumos_entregues_*) =="
make migrate

echo "== Rebuild SPA (Retiradas + OP + Painel) =="
make web-build

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

echo "== Schema handoff =="
docker compose --env-file .env -f docker-compose.yml -f docker-compose.local.yml exec -T app \
  php artisan tinker --execute="echo Schema::hasColumn('ordens_producao','insumos_entregues_em') ? 'OK insumos_entregues_em' : 'FALHA coluna ausente';"

cat <<'EOF'

Pronto para testar — três portas + faturamento
  App:           http://localhost:8043
  Login:         http://localhost:8043/login
  Painel:        http://localhost:8043/
  OP (cesta):    http://localhost:8043/ordens-producao
  A buscar:      http://localhost:8043/estoque/retiradas
  Na máquina:    http://localhost:8043/ordens-producao/apontamentos
  Faturamentos:  http://localhost:8043/faturamentos
  Legado FAT:    http://localhost:8043/financeiro/faturamentos  (redireciona)

Personas (EMP RETA, mesma senha do admin@retaetiquetas.com.br)
  • admin@retaetiquetas.com.br — vê tudo
  • lab.estoque@retaetiquetas.com.br — prateleira (A buscar); sem Na máquina / FAT
  • lab.producao@retaetiquetas.com.br — máquina; A buscar 403; FAT só leitura

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Admin: menu Faturamento entre Produção e Expedição; Financeiro = pagar/receber
  3. Estoque: A buscar da OP aberta — bobina em volumes e metros; confirmar baixa
  4. Produção: Na máquina — receber, produzir, sobra; sem item A buscar
  5. Faturar PED produzido em /faturamentos

Não inventar saldo. Entrada só via OC/receber ou AJU/INV aprovado.

EOF
