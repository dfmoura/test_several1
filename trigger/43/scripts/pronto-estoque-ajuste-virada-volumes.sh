#!/usr/bin/env bash
# Sobe stack local + SPA Ajustes A03 com volumes de abertura (implantação).
# Uso (no host, com Docker): bash scripts/pronto-estoque-ajuste-virada-volumes.sh
#     ou: make pronto-estoque-ajuste-virada-volumes
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (Estoque → Ajustes → A03 volumes) =="
make web-build

echo "== PHPUnit A03 multi-volume + regressão AJU =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php vendor/bin/phpunit --filter 'EstoqueAjusteViradaVolumesTest|EstoqueReposicaoAjusteTest::test_ajuste'

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto para testar — Estoque / Ajustes / saldo inicial (A03)
  App:      http://localhost:8043
  Ajustes:  http://localhost:8043/estoque/ajustes
  Login:    http://localhost:8043/login

Roteiro (dois usuários — SoD)
  1. Login com usuário que tenha estoque.escrever
  2. Estoque → aba Ajustes
  3. Produto com controla_lote (ex. Exact / MP-PAP) e saldo 0 (ou conte o total real)
  4. Motivo A03 — Saldo inicial / implantação
  5. Informe N volumes (código, L mm, Comp. m) — em M² a área preenche a qtde
  6. Checklist → Solicitar AJU
  7. Logout → login com outro usuário (estoque.aprovar)
  8. Conferir → ver tabela de volumes → Aprovar
  9. CTA «Imprimir etiquetas dos volumes» → Imprimir (1 ou N faces Elgin 50×40)
 10. Opcional: Guardar no local · ou botão Etiquetas na fila (AJU aprovado)

Hard refresh (Ctrl+Shift+R) se a tela antiga aparecer.
EOF
