#!/usr/bin/env bash
# Aplica mapa_facas.json com segurança (seed aditivo + metadados; sem force de geometria na EMP).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
COMPOSE="docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Aplicar catálogo =="
$COMPOSE exec -T app php artisan facas:aplicar-catalogo "$@"

echo "== Health =="
curl -sfS -m 10 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'TXT'

Pronto para testar
  App:  http://localhost:8043/mapa-facas
  Login: /login  ·  admin@retaetiquetas.com.br (EMP-00001)

Roteiro rápido
  1. Mapa de facas → buscar "JOSE OLIMPIO" / "SUPERBIJOU" / "REI DA PIMENTA" (novas).
  2. Conferir fonte no meta: MAPA DE FACAS 20261103 XLSX.
  3. Filtro por máquina 250 / MODULAR — novas linhas ativas.
  4. Não usar facas:ensure-mapa --force (geometria da EMP).

TXT
