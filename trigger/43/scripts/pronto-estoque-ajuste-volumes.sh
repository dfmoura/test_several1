#!/usr/bin/env bash
# Sobe stack local + SPA Ajustes com volumes (entrada/baixa no padrão do receber).
# Uso (no host, com Docker): bash scripts/pronto-estoque-ajuste-volumes.sh
#     ou: make pronto-estoque-ajuste-volumes
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (Estoque → Ajustes → volumes entrada/baixa) =="
make web-build

echo "== PHPUnit volumes AJU (A03/A08/baixa) + QR + regressão =="
docker compose -f docker-compose.yml -f docker-compose.local.yml --env-file .env \
  exec -T app php vendor/bin/phpunit --filter \
  'EstoqueAjusteViradaVolumesTest|EstoqueAjusteContagemQrTest|EstoqueReposicaoAjusteTest::test_ajuste'

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

Pronto para testar — Estoque / Ajustes / volumes (padrão receber)
  App:      http://localhost:8043
  Ajustes:  http://localhost:8043/estoque/ajustes
  Login:    http://localhost:8043/login

Hard refresh (Ctrl+Shift+R) se a tela antiga aparecer.

Conferir na UI (lacuna fechada — só leitura)
  · Lista: sob Δ / Valor (R$) → «N volume(s) · entrada|baixa» (ou QR evidência)
  · Conferir / Ver → tabela Código · L×C · Qtde do volume
  · Aprovado/rejeitado: botão Ver abre o mesmo painel (sem mexer no saldo)

Roteiro — dois usuários (SoD: estoque.escrever ≠ estoque.aprovar)

A) Entrada de volumes (qualquer motivo +Δ, ex. A08 / A03)
  1. Login com estoque.escrever
  2. Estoque → Ajustes → aba «Por volumes»
  3. SKU com controla_lote (Exact / MP-PAP)
  4. Motivo A03 (saldo 0) ou A08 (sobra) · Movimento = Entrada
  5. N linhas: código, L mm, Comp. m (M² preenche qtde) · checklist → Solicitar
  6. Na lista: confira «N volume(s) · entrada» sob o Δ
  7. Logout → aprovador → Conferir tabela de volumes (Qtde do volume) → Aprovar
  8. CTA etiquetas Elgin 50×40 · filtro Aprovados → Ver → mesmos volumes · opcional Guardar

B) Baixa por volume (−Δ, ex. A04 avaria)
  1. SKU com volumes já em saldo
  2. Movimento = Baixa · informe qtde a debitar em 1+ bobinas (soma = |Δ|)
  3. Solicitar → lista mostra «N volume(s) · baixa» → outro usuário aprova → confira saldo/lotes

C) QR (evidência) — inalterado
  Aba «Por QR (evidência)» · END + VOL · não mistura com lote_payload
  Lista: «N volume(s) · QR evidência» · Ver/Conferir mostra qtde por volume

EOF
