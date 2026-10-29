#!/usr/bin/env bash
# =============================================================================
# coleta_exercito_lula.sh
# Coleta dados públicos de https://www.exercitodolula.org/ via curl + ferramentas
# nativas do shell (grep / sed / awk).
#
# Extrai:
#   - Código de status HTTP
#   - Título e meta description da página inicial
#   - Todos os links (href) encontrados no HTML
#
# Requisitos atendidos:
#   - HTML salvo em arquivo temporário
#   - Tratamento de erro se status != 200
#   - User-Agent de navegador
#   - Até 3 tentativas com intervalo crescente
#   - Saída no terminal e em exercito_lula_output.txt
# =============================================================================

set -euo pipefail

# --- Configuração ------------------------------------------------------------
readonly URL="https://www.exercitodolula.org/"
readonly OUTPUT_FILE="exercito_lula_output.txt"
readonly MAX_ATTEMPTS=3
readonly CONNECT_TIMEOUT_SEC=10
readonly TOTAL_TIMEOUT_SEC=30

# User-Agent simulando um navegador comum (Chrome em Linux)
readonly USER_AGENT="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

# Arquivo temporário para o HTML (limpo automaticamente ao sair)
TMP_HTML="$(mktemp "${TMPDIR:-/tmp}/exercito_lula_XXXXXX.html")"
cleanup() {
  rm -f "$TMP_HTML"
}
trap cleanup EXIT

# --- Funções auxiliares ------------------------------------------------------

die() {
  printf 'Erro: %s\n' "$1" >&2
  exit 1
}

require_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    die "curl não está instalado. Instale-o (ex.: apt install curl) e tente novamente."
  fi
}

# Intervalo crescente entre tentativas: 2s, 4s, 6s (tentativa N → N*2 segundos)
backoff_seconds() {
  local attempt="$1"
  echo $((attempt * 2))
}

# --- Requisição com até 3 tentativas -----------------------------------------
# Salva o corpo em TMP_HTML e retorna o código HTTP via variável HTTP_CODE.

fetch_page() {
  local attempt=1
  local http_code="000"
  local curl_exit=0

  while (( attempt <= MAX_ATTEMPTS )); do
    printf 'Tentativa %d/%d: GET %s\n' "$attempt" "$MAX_ATTEMPTS" "$URL" >&2

    # -sS: silencioso, mas mostra erros do curl
    # -L: segue redirecionamentos
    # -A: User-Agent de navegador
    # -o: salva o HTML no arquivo temporário
    # -w: imprime só o código HTTP no stdout
    set +e
    http_code="$(
      curl -sS -L \
        -A "$USER_AGENT" \
        --connect-timeout "$CONNECT_TIMEOUT_SEC" \
        --max-time "$TOTAL_TIMEOUT_SEC" \
        -o "$TMP_HTML" \
        -w '%{http_code}' \
        "$URL"
    )"
    curl_exit=$?
    set -e

    # Falha de transporte (timeout, DNS, etc.)
    if (( curl_exit != 0 )); then
      printf '  curl falhou (exit=%d). Código HTTP parcial: %s\n' \
        "$curl_exit" "${http_code:-000}" >&2
    elif [[ "$http_code" == "200" ]]; then
      printf '  Sucesso: HTTP %s\n' "$http_code" >&2
      HTTP_CODE="$http_code"
      return 0
    else
      printf '  Resposta HTTP %s (esperado 200).\n' "$http_code" >&2
    fi

    # Se ainda há tentativas, aguarda intervalo crescente e tenta de novo
    if (( attempt < MAX_ATTEMPTS )); then
      local wait_sec
      wait_sec="$(backoff_seconds "$attempt")"
      printf '  Aguardando %ds antes da próxima tentativa...\n' "$wait_sec" >&2
      sleep "$wait_sec"
    fi

    ((attempt++)) || true
  done

  # Esgotou as tentativas sem HTTP 200
  HTTP_CODE="${http_code:-000}"
  return 1
}

# --- Extração com grep / sed / awk -------------------------------------------

# Título da página (<title>...</title>)
extract_title() {
  # Junta o HTML em uma linha lógica, captura o conteúdo de <title>
  tr '\n' ' ' <"$TMP_HTML" \
    | grep -oiE '<title[^>]*>[^<]*</title>' \
    | head -n1 \
    | sed -E 's/<\/?title[^>]*>//Ig' \
    | sed -E 's/^[[:space:]]+|[[:space:]]+$//g' \
    || true
}

# Meta description (name="description" content="...")
extract_description() {
  tr '\n' ' ' <"$TMP_HTML" \
    | grep -oiE '<meta[^>]+name=["'\'']description["'\''][^>]*>' \
    | head -n1 \
    | sed -E 's/.*content=["'\'']([^"'\'']*)["'\''].*/\1/I' \
    | sed -E 's/^[[:space:]]+|[[:space:]]+$//g' \
    || true
}

# Todos os href de âncoras e links; normaliza e remove vazios/duplicatas
extract_links() {
  # Extrai atributos href="..." ou href='...'
  grep -oiE 'href=["'\''][^"'\'']+["'\'']' "$TMP_HTML" \
    | sed -E 's/^href=["'\'']//I; s/["'\'']$//' \
    | awk '
        # Descarta âncoras vazias, javascript: e mailto:
        $0 == "" || $0 ~ /^#/ || $0 ~ /^javascript:/ || $0 ~ /^mailto:/ { next }
        # Absolute URL already
        $0 ~ /^https?:\/\// { print; next }
        # Protocol-relative //host/path
        $0 ~ /^\/\// { print "https:" $0; next }
        # Root-relative /path
        $0 ~ /^\// { print base $0; next }
        # Relative path
        { print base "/" $0 }
      ' base="${URL%/}" \
    | sed 's|/\./|/|g' \
    | awk '!seen[$0]++' \
    || true
}

# Texto visível aproximado da página (remove tags e scripts/styles)
extract_text_snippet() {
  # Extrai trechos de texto entre tags; filtra ruído de JS/Next.js
  grep -oE '>[^<]{15,}' "$TMP_HTML" \
    | sed 's/^>//' \
    | sed -E 's/&nbsp;/ /g; s/&amp;/\&/g; s/&lt;/</g; s/&gt;/>/g; s/&quot;/"/g; s/&#39;/'"'"'/g' \
    | grep -vE '^(self\.|\$R|requestAnimation|function\(|\{|\[|null|undefined)' \
    | grep -vE '_next|__NEXT|chunk' \
    | sed -E 's/^[[:space:]]+|[[:space:]]+$//g' \
    | awk 'NF && !seen[$0]++' \
    | head -n 25 \
    | tr '\n' ' ' \
    | sed -E 's/[[:space:]]+/ /g; s/^ //; s/ $//' \
    | cut -c1-500 \
    || true
}

# --- Montagem do relatório ---------------------------------------------------

build_report() {
  local title description text_snippet
  local -a links=()

  title="$(extract_title)"
  description="$(extract_description)"
  text_snippet="$(extract_text_snippet)"

  # Lê links em array (mapfile é portável em bash)
  mapfile -t links < <(extract_links)

  {
    # Usar printf -- para textos que começam com "-" (evita interpretação como opção)
    printf -- '========================================\n'
    printf -- ' Coleta: %s\n' "$URL"
    printf -- ' Data:   %s\n' "$(date '+%Y-%m-%d %H:%M:%S')"
    printf -- '========================================\n\n'

    printf -- '--- Status HTTP ---\n'
    printf -- '%s\n\n' "$HTTP_CODE"

    printf -- '--- Título ---\n'
    printf -- '%s\n\n' "${title:-"(não encontrado)"}"

    printf -- '--- Meta description ---\n'
    printf -- '%s\n\n' "${description:-"(não encontrada)"}"

    printf -- '--- Trecho de texto da página inicial (até 500 chars) ---\n'
    printf -- '%s\n\n' "${text_snippet:-"(vazio)"}"

    printf -- '--- Links encontrados (%d) ---\n' "${#links[@]}"
    if ((${#links[@]} == 0)); then
      printf -- '(nenhum link encontrado)\n'
    else
      local i=1
      local link
      for link in "${links[@]}"; do
        printf -- '%4d. %s\n' "$i" "$link"
        ((i++)) || true
      done
    fi

    printf -- '\n========================================\n'
  }
}

# --- Main --------------------------------------------------------------------

main() {
  require_curl

  HTTP_CODE="000"

  if ! fetch_page; then
    die "Falha após ${MAX_ATTEMPTS} tentativas. Último status HTTP: ${HTTP_CODE} (esperado 200)."
  fi

  # Garante que o arquivo temporário tem conteúdo
  if [[ ! -s "$TMP_HTML" ]]; then
    die "HTML temporário vazio após HTTP 200."
  fi

  # Gera relatório, imprime no terminal e grava no arquivo de saída
  local report
  report="$(build_report)"

  printf '%s\n' "$report"
  printf '%s\n' "$report" >"$OUTPUT_FILE"

  printf '\nResultados salvos em: %s\n' "$OUTPUT_FILE" >&2
}

main "$@"
