#!/usr/bin/env bash
# Lista todas as empresas listadas na B3 via curl (API listedCompaniesProxy)
# Uso: ./empresas-b3.sh

set -euo pipefail

BASE_URL="https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_FILE="${OUT_DIR}/empresas-b3.txt"
PAGE_SIZE=100

b64params() {
  printf '%s' "$1" | base64 -w0
}

curl_json() {
  curl -sS "${BASE_URL}/${1}/${2}"
}

# 1) Primeira página (metadados)
P1=$(printf '{"language":"pt-br","pageNumber":1,"pageSize":%s}' "$PAGE_SIZE")
B1=$(b64params "$P1")
PAGE1=$(curl_json "GetInitialCompanies" "$B1")

TOTAL_PAGES=$(echo "$PAGE1" | jq -r '.page.totalPages')
TOTAL_RECORDS=$(echo "$PAGE1" | jq -r '.page.totalRecords')

ALL_JSON="$PAGE1"

# 2) Demais páginas
for (( page=2; page<=TOTAL_PAGES; page++ )); do
  PN=$(printf '{"language":"pt-br","pageNumber":%s,"pageSize":%s}' "$page" "$PAGE_SIZE")
  BN=$(b64params "$PN")
  curl_json "GetInitialCompanies" "$BN" > "/tmp/empresas-b3-page-${page}.json"
  ALL_JSON=$(jq -s '.[0] as $a | .[1] as $b | $a | .results += $b.results' \
    <(echo "$ALL_JSON") "/tmp/empresas-b3-page-${page}.json")
done

# 3) Montar TXT
{
  echo "EMPRESAS LISTADAS NA B3"
  echo "Fonte: curl → GetInitialCompanies (B3 listedCompaniesProxy)"
  echo "Total API: ${TOTAL_RECORDS} registros | Páginas: ${TOTAL_PAGES}"
  echo ""
  printf "   #  EMISSOR    RAZÃO SOCIAL                              NEGOCIAÇÃO       CNPJ            MERCADO   SEGMENTO\n"
  printf "%s\n" "------------------------------------------------------------------------------------------------------------------------"

  echo "$ALL_JSON" | jq -r '
    .results
    | sort_by(.tradingName)
    | to_entries[]
    | "\((.key+1)|tonumber|if .<10 then "  "+(.|tostring) elif .<100 then " "+(.|tostring) elif .<1000 then (.|tostring) else (.|tostring) end)  \(.value.issuingCompany)       \(.value.companyName[0:40])  \(.value.tradingName[0:16])  \(.value.cnpj)  \(.value.market // "-")        \(.value.segment[0:30])"
  '
} > "$OUT_FILE"

echo "Arquivo gerado: ${OUT_FILE}"
wc -l < "$OUT_FILE" | xargs echo "Linhas:"
