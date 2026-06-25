#!/usr/bin/env bash
# Gera TXT com proventos pagos via curl (API B3 listedCompaniesProxy)
# Uso: ./proventos-por-ticker.sh PETR4
#      ./proventos-por-ticker.sh VALE3

set -euo pipefail

TICKER="${1:-PETR4}"
BASE_URL="https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)"
OUT_FILE="${OUT_DIR}/proventos-${TICKER}.txt"
PAGE_SIZE=100

b64params() {
  printf '%s' "$1" | base64 -w0
}

curl_json() {
  curl -sS "${BASE_URL}/${1}/${2}"
}

echo "Ticker: ${TICKER}"

# 1) Resolver tradingName
P1=$(printf '{"language":"pt-br","pageNumber":1,"pageSize":20,"company":"%s"}' "$TICKER")
B1=$(b64params "$P1")
COMPANY_JSON=$(curl_json "GetInitialCompanies" "$B1")

TRADING=$(echo "$COMPANY_JSON" | jq -r '.results[0].tradingName // empty' | tr -d '/.')
if [[ -z "$TRADING" ]]; then
  echo "Erro: ticker '${TICKER}' não encontrado." >&2
  exit 1
fi

echo "Empresa: ${TRADING}"

# 2) Primeira página de proventos (metadados)
P2=$(printf '{"language":"pt-br","pageNumber":1,"pageSize":%s,"tradingName":"%s"}' "$PAGE_SIZE" "$TRADING")
B2=$(b64params "$P2")
PAGE1=$(curl_json "GetListedCashDividends" "$B2")

TOTAL_PAGES=$(echo "$PAGE1" | jq -r '.page.totalPages')
TOTAL_RECORDS=$(echo "$PAGE1" | jq -r '.page.totalRecords')

ALL_JSON="$PAGE1"

# 3) Demais páginas
for (( page=2; page<=TOTAL_PAGES; page++ )); do
  PN=$(printf '{"language":"pt-br","pageNumber":%s,"pageSize":%s,"tradingName":"%s"}' "$page" "$PAGE_SIZE" "$TRADING")
  BN=$(b64params "$PN")
  curl_json "GetListedCashDividends" "$BN" > "/tmp/proventos-page-${page}.json"
  ALL_JSON=$(jq -s '.[0] as $a | .[1] as $b | $a | .results += $b.results' \
    <(echo "$ALL_JSON") "/tmp/proventos-page-${page}.json")
done

# 4) Montar TXT
{
  echo "PROVENTOS EM DINHEIRO — ${TICKER} (${TRADING})"
  echo "Fonte: curl → GetListedCashDividends (B3 listedCompaniesProxy)"
  echo "Total API: ${TOTAL_RECORDS} registros | Páginas: ${TOTAL_PAGES}"
  echo ""
  printf "   #  DATA EX      APROVAÇÃO    TIPO AÇÃO EVENTO              VALOR/ AÇÃO    FECH. EX\n"
  printf "%s\n" "-------------------------------------------------------------------------------------"

  echo "$ALL_JSON" | jq -r '
    .results
    | unique_by([.typeStock, .corporateAction, .dateApproval, .lastDatePriorEx, .valueCash])
    | sort_by(.lastDateTimePriorEx // .lastDatePriorEx) | reverse
    | to_entries[]
    | "\((.key+1)|tonumber|if .<10 then "  "+(.|tostring) elif .<100 then " "+(.|tostring) else (.|tostring) end)  \(.value.lastDatePriorEx)   \(.value.dateApproval)   \(.value.typeStock)       \(.value.corporateAction)      \(.value.valueCash)       \(.value.closingPricePriorExDate)"
  '
} > "$OUT_FILE"

echo "Arquivo gerado: ${OUT_FILE}"
wc -l < "$OUT_FILE" | xargs echo "Linhas:"
