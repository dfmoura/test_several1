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

Pronto para testar — ficha da etiqueta + kit (OP → estoque → produção)
  App:           http://localhost:8043
  Menu:          Produção → Ordens · Retiradas · Apontamentos
  OP aberta:     http://localhost:8043/ordens-producao
  Retiradas:     http://localhost:8043/estoque/retiradas
  Produção:      http://localhost:8043/ordens-producao/apontamentos
  Painel:        http://localhost:8043/
  Login:         http://localhost:8043/login

Pré-requisitos
  • Usuário com producao.ler (Retiradas também aceita estoque.ler)
  • Confirmar saída: producao.escrever ou estoque.escrever
  • Receber / devolver sobra / fechar: producao.escrever
  • OP ABERTA/EM_ANDAMENTO com kit
  • SKU com lote: volume (qtde > 0) e QR VOL:

Roteiro
  1. Hard refresh (Ctrl+Shift+R) — a SPA nova tem de mostrar «O que produzir» e «Kit desta ordem»
  2. Abrir a OP: herói da etiqueta + 5 passos + kit (falta pegar / já saiu / sem estoque) + um CTA
  3. Ir buscar no estoque → lista de retirada → QR VOL: ou quantidade → Confirmar: saiu do estoque
  4. Se rasgou: Registrar perda → Pegar de novo
  5. Produção → receber o kit → devolver sobra → etiquetas boas → Fechar a ordem
  6. Imprimir ficha: ordem + kit (não tabela de 9 colunas)
  7. Na OP concluída: resultado + embalagem

Não inventar saldo. Entrada só via OC/receber ou AJU/INV aprovado.

EOF
