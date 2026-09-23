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

Pronto para testar — coleta + apontamento (OP → estoque → chão)
  App:           http://localhost:8043
  Menu:          Produção → Retiradas · Apontamentos
  Retiradas:     http://localhost:8043/estoque/retiradas
  Apontamentos:  http://localhost:8043/ordens-producao/apontamentos
  Painel:        http://localhost:8043/
  Login:         http://localhost:8043/login

Pré-requisitos
  • Usuário com producao.ler (Retiradas também aceita estoque.ler)
  • Confirmar baixa: producao.escrever ou estoque.escrever
  • Receber / apontar / concluir: producao.escrever
  • OP ABERTA/EM_ANDAMENTO com material pendente
  • SKU com lote: volume (qtde > 0) e QR VOL:

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Produção → Retiradas → ficha da OP → QR VOL: ou quantidade → Confirmar
  3. Avaria na mesa (opcional) → Registrar → Requisitar de novo
  4. Produção → Apontamentos → receber na máquina → retorno/perda → qtde boa → Concluir OP
  5. Na OP: resultado + embalagem (sem formulário de conclusão)
  6. Tubete: um clique, sem QR

Não inventar saldo. Entrada só via OC/receber ou AJU/INV aprovado.

EOF
