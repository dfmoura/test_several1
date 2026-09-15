#!/usr/bin/env bash
# Sobe stack local + SPA com etiquetas Elgin L42 Pro Full 50×40 mm.
# Uso (no host, fora do sandbox): bash scripts/pronto-etiquetas-volume.sh
#     ou: make pronto-etiquetas-volume
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== Docker =="
docker info >/dev/null
echo "ok"

echo "== Stack up =="
make up

echo "== Rebuild SPA (etiquetas 50×40 / Elgin L42 Pro Full) =="
make web-build

echo "== Health =="
curl -sfS -m 15 http://localhost:8043/api/v1/health
echo
curl -sfS -o /dev/null -w "SPA HTTP %{http_code}\n" -m 10 http://localhost:8043/

cat <<'EOF'

Pronto 100% para testar etiquetas de volume (QR + Código VOL:…)
  App:      http://localhost:8043
  Lote:     http://localhost:8043/estoque/lotes/etiquetas
  Unitária: Estoque → lote → Etiqueta
  Guardar:  http://localhost:8043/estoque/guardar

Impressora / driver
  · Elgin L42 Pro Full
  · Etiqueta 50 × 40 mm
  · Escala 100% — sem “ajustar à página”

Roteiro
  1. Login → Estoque → Reimprimir volumes (ou unitária)
  2. Preview 50×40: QR + rodapé “Código VOL:…” legível
  3. Tela: “Copiar código” → colar em Guardar (resolve sem leitor)
  4. Imprimir (Ctrl+P) na L42 · escala 100%
  5. Ler QR impresso em Guardar · conferir mesmo VOL:… do rodapé
EOF
