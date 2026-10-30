#!/usr/bin/env bash
# Sobe stack local + SPA com ficha de chão unificada (máquina + prateleira).
# Uso (no host, com Docker): bash scripts/pronto-ficha-chao.sh
#     ou: make pronto-ficha-chao
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
if ! docker info >/dev/null 2>&1; then
  echo "FAIL: Docker API indisponível (sem /var/run/docker.sock)."
  echo "No host: sudo systemctl restart docker"
  echo "Depois: make pronto-ficha-chao"
  exit 1
fi
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (ficha de chão) =="
make web-build

echo "== Health =="
for i in 1 2 3 4 5 6 7 8 9 10 12 15; do
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

Pronto para testar — Ficha de chão (modelos + retirada)
  App:     http://localhost:8043
  Login:   http://localhost:8043/login
  OPs:     http://localhost:8043/ordens-producao

Roteiro
  1. Hard refresh (Ctrl+Shift+R) — SPA nova (dist bind-mount)
  2. Ordens de produção → OP de etiqueta com N modelos
  3. Toolbar → Ficha de chão
  4. Identidade: 1 linha/modelo com Quant em todas
  5. Impressão · máquina: coluna Modelo + N linhas (rolos rateados)
  6. Acabamento · rebobinação: coluna Modelo + N linhas
  7. Retirada · prateleira:
       Levado · Local · Volume · QR · Material · Dimensão · Levar · M² · Validade
       Bobina: Levar = metro linear (m); M² e Dimensão L×C; QR do volume
       Tubete/caixa: Levar = qtde+un; M²/Dimensão/QR = —
  8. Imprimir / conferir A4 paisagem
  9. URLs antigas → /ficha-chao

Confirmar saída continua só em Estoque · A buscar (ficha é guia).

EOF
