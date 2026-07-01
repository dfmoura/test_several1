#!/usr/bin/env bash
# Imprime série histórica de preços (COTAHIST oficial B3) na tela.
# Uso: ./precos-por-ticker.sh PETR4
#      ./precos-por-ticker.sh PETR4 2024
#      ./precos-por-ticker.sh VALE3 2020 2024

set -euo pipefail

TICKER="${1:?Informe o ticker. Ex.: ./precos-por-ticker.sh PETR4}"
ANO_INI="${2:-$(date +%Y)}"
ANO_FIM="${3:-$ANO_INI}"
BASE_URL="https://bvmf.bmfbovespa.com.br/InstDados/SerHist"

parse_cotahist() {
  awk -v t="$TICKER" '
    function trim(s) { sub(/ +$/, "", s); return s }
    substr($0, 1, 2) == "01" && trim(substr($0, 13, 12)) == t && substr($0, 25, 3) == "010" {
      printf "%s  abert=%8.2f  max=%8.2f  min=%8.2f  med=%8.2f  fech=%8.2f\n",
        substr($0, 3, 8),
        substr($0, 57, 13) / 100,
        substr($0, 70, 13) / 100,
        substr($0, 83, 13) / 100,
        substr($0, 96, 13) / 100,
        substr($0, 109, 13) / 100
    }'
}

echo "Ticker: ${TICKER}  |  anos: ${ANO_INI}..${ANO_FIM}"
echo "Fonte: curl → COTAHIST (B3 SerHist)"
echo "data       abert      max        min        med        fech"
echo "------------------------------------------------------------------"

tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

for ((ano = ANO_INI; ano <= ANO_FIM; ano++)); do
  zip="${tmpdir}/COTAHIST_A${ano}.ZIP"
  if ! curl -fsS "${BASE_URL}/COTAHIST_A${ano}.ZIP" -o "$zip"; then
    echo "Aviso: arquivo COTAHIST_A${ano}.ZIP não encontrado." >&2
    continue
  fi
  unzip -p "$zip" | parse_cotahist
done
