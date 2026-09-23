#!/usr/bin/env bash
# Sobe stack + SPA DANFE e garante PED PRODUZIDO com matriz (BL-112).
# Uso (no host, com Docker): bash scripts/pronto-nfe-pa.sh
#     ou: make pronto-nfe-pa
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (DANFE A4) =="
make web-build

echo "== Ensaio PED-2026-NFPA01 =="
docker compose --env-file .env -f docker-compose.yml -f docker-compose.local.yml exec -T app \
  php artisan tinker --execute="require base_path('database/ensaios/preparar_ped_nfe_pa.php');"

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

CSS=$(curl -sfS -m 10 http://localhost:8043/ | sed -n 's/.*href="\([^"]*\.css\)".*/\1/p' | head -1)
if [[ -n "${CSS}" ]] && curl -sfS -m 10 "http://localhost:8043${CSS}" | grep -q 'danfe-a4'; then
  echo "DANFE CSS: ok (${CSS})"
else
  echo "AVISO: @page danfe-a4 não encontrado — faça Ctrl+Shift+R"
fi

cat <<'EOF'

Pronto para testar — NF-e só com PA (matriz no unitário)

  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  Pedido:  Pedidos → PED-2026-NFPA01  (ou o URL impresso acima)
  Permissão: faturamento.escrever  ·  EMP-00001

Roteiro
  1. Hard refresh (Ctrl+Shift+R)
  2. Abrir PED-2026-NFPA01 → Faturar
  3. No FAT: ainda aparece a linha “Matriz / clichê” (R$ 340) — comercial
  4. Abrir a prévia / ficha da NF-e
     • 1 item = etiqueta (sem “Matriz / clichê”)
     • valor do item e da nota = R$ 3.840,00
     • dados adicionais: “Valor inclui matriz/clichê e ferramental do job”
  5. Imprimir (Ctrl+P): A4, cabeçalho da grade se quebrar página

Não concluir OP-2026-00001 neste ensaio. Sem inventar saldo.

EOF
