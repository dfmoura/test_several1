#!/usr/bin/env bash
# Higiene lab/homolog na Lightsail: PED/OP/FAT/receber → ORCs em preparação.
# Uso (no host AWS, na raiz do repo):
#   ./scripts/limpar-cadeia-pos-orc-aws.sh                 # dry-run EMP-00001
#   ./scripts/limpar-cadeia-pos-orc-aws.sh --exec          # aplica
#   ./scripts/limpar-cadeia-pos-orc-aws.sh --exec EMP-00002
#   ./scripts/limpar-cadeia-pos-orc-aws.sh --exec --com-ledger EMP-00001
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

EXEC=0
COM_LEDGER=0
EMPRESA="EMP-00001"

for arg in "$@"; do
  case "$arg" in
    --exec) EXEC=1 ;;
    --com-ledger) COM_LEDGER=1 ;;
    EMP-*) EMPRESA="$arg" ;;
    *)
      echo "Uso: $0 [--exec] [--com-ledger] [EMP-xxxxx]"
      exit 1
      ;;
  esac
done

APP_CTR="$(docker ps --format '{{.Names}}' | grep -E '_app$|^erp43_app$' | head -1 || true)"
if [[ -z "$APP_CTR" ]]; then
  echo "Container app não encontrado (erp43_app)."
  exit 1
fi

STAGE="$(docker exec "$APP_CTR" php -r "echo getenv('ERP_STAGE') ?: getenv('APP_ENV') ?: 'unknown';")"
echo "container=$APP_CTR  stage=$STAGE  empresa=$EMPRESA"

if [[ "$STAGE" == "production" ]]; then
  echo "Recusado: stage=production. Use homolog/lab."
  exit 1
fi

echo "=== dry-run ==="
docker exec "$APP_CTR" php artisan erp:limpar-cadeia-pos-orc --empresa="$EMPRESA" --dry-run

if [[ "$EXEC" -ne 1 ]]; then
  echo
  echo "Dry-run ok. Para aplicar:"
  echo "  $0 --exec $EMPRESA"
  echo "Com ledger zerado depois:"
  echo "  $0 --exec --com-ledger $EMPRESA"
  exit 0
fi

echo "=== aplicar cadeia pós-ORC ==="
docker exec "$APP_CTR" php artisan erp:limpar-cadeia-pos-orc --empresa="$EMPRESA" --force

if [[ "$COM_LEDGER" -eq 1 ]]; then
  echo "=== zerar ledger estoque ==="
  docker exec "$APP_CTR" php artisan erp:limpar-estoque --empresa="$EMPRESA" --force
fi

echo "=== contagens pós ==="
docker exec "$APP_CTR" php artisan tinker --execute="
\$e = \\App\\Models\\Empresa::query()->where('codigo', '$EMPRESA')->first();
if (!\$e) { echo 'EMP não encontrada'; exit(1); }
\$id = \$e->id;
echo 'pedidos=' . \\Illuminate\\Support\\Facades\\DB::table('pedidos')->where('empresa_id', \$id)->count() . PHP_EOL;
echo 'ops=' . \\Illuminate\\Support\\Facades\\DB::table('ordens_producao')->where('empresa_id', \$id)->count() . PHP_EOL;
echo 'fats=' . \\Illuminate\\Support\\Facades\\DB::table('faturamentos')->where('empresa_id', \$id)->count() . PHP_EOL;
echo 'tit_receber=' . \\Illuminate\\Support\\Facades\\DB::table('titulos')->where('empresa_id', \$id)->where('tipo','RECEBER')->where(function(\$q){\$q->whereNotNull('orcamento_id')->orWhereNotNull('pedido_id')->orWhereNotNull('faturamento_id');})->count() . PHP_EOL;
echo 'orcs_prep=' . \\Illuminate\\Support\\Facades\\DB::table('orcamentos')->where('empresa_id', \$id)->whereIn('status',['RASCUNHO','CALCULADO'])->count() . PHP_EOL;
echo 'orcs_outros=' . \\Illuminate\\Support\\Facades\\DB::table('orcamentos')->where('empresa_id', \$id)->whereNotIn('status',['RASCUNHO','CALCULADO'])->count() . PHP_EOL;
"

echo "Pronto. Smoke UI: Pedidos / OP / Faturamentos / a receber vazios da cadeia; ORCs Em preparação."
