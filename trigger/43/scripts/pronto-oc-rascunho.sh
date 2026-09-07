#!/usr/bin/env bash
# Sobe stack local + migration OC rascunho/envio + rebuild do SPA.
# Uso (no host, fora do sandbox): bash scripts/pronto-oc-rascunho.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Migration =="
make migrate

echo "== Rebuild SPA (web) =="
# API monta volume — código PHP já vale. Web é imagem nginx: precisa rebuild.
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env build web
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env up -d web

echo "== Health =="
curl -sfS -m 10 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar:
  http://localhost:8043

Roteiro rápido:
  1. Compras → A repor → Preparar OC
  2. Ficha da OC (Rascunho) → Editar / Excluir se quiser
  3. Enviar ao fornecedor (e-mail do PAR; Reply-To = e-mail da EMP)
  4. Depois: Receber e conferir

Checklist cadastro:
  · Fornecedor com e-mail
  · EMP com e-mail (contato) para Reply-To
EOF
