#!/usr/bin/env bash
# =============================================================================
# http_diagnostic.sh
# Diagnóstico HTTP sequencial: disponibilidade e tempos de resposta via curl.
#
# Limites de segurança (fixos):
#   - Uma requisição por vez (sem paralelismo)
#   - Intervalo mínimo de 2 segundos entre requisições
#   - Timeout de conexão: 5s | Timeout total: 15s
#   - Redirecionamentos limitados (máx. 5)
#   - Sem proxies, spoofing ou técnicas de evasão
# =============================================================================

set -euo pipefail

# --- Constantes de segurança / política --------------------------------------
readonly MIN_INTERVAL_SEC=2
readonly CONNECT_TIMEOUT_SEC=5
readonly TOTAL_TIMEOUT_SEC=15
readonly MAX_REDIRECTS=5
readonly DEFAULT_CHECKS=5
readonly MAX_CHECKS=100   # teto para evitar tráfego excessivo sem autorização

# --- Variáveis de estado (estatísticas) --------------------------------------
total_requests=0
count_2xx=0
count_3xx=0
count_4xx=0
count_5xx=0
count_other_http=0
count_conn_errors=0

# Tempos de resposta bem-sucedidos (em segundos, ponto flutuante)
declare -a response_times=()

interrupted=0
csv_file=""

# --- Utilitários -------------------------------------------------------------

usage() {
  cat <<'EOF'
Uso:
  ./http_diagnostic.sh [opções] [URL] [QUANTIDADE]

Argumentos:
  URL         URL a diagnosticar (padrão: https://www.exercitodolula.org/)
  QUANTIDADE  Número de verificações sequenciais (padrão: 5, máx: 100)

Opções:
  -y, --yes   Confirma o aviso pré-teste sem perguntar (útil em automação)
  -h, --help  Exibe esta ajuda

Exemplos:
  ./http_diagnostic.sh
  ./http_diagnostic.sh https://www.exercitodolula.org/ 10
  ./http_diagnostic.sh -y https://example.com/ 1

Saída:
  - Relatório no terminal
  - Arquivo CSV em results/http_diagnostic_YYYYMMDD_HHMMSS.csv
EOF
}

die() {
  printf 'Erro: %s\n' "$1" >&2
  exit 1
}

require_curl() {
  if ! command -v curl >/dev/null 2>&1; then
    die "curl não está instalado. Instale-o (ex.: apt install curl / brew install curl) e tente novamente."
  fi
}

# Valida URL básica: deve começar com http:// ou https://
validate_url() {
  local url="$1"
  if [[ ! "$url" =~ ^https?:// ]]; then
    die "URL inválida: '$url'. Use http:// ou https://."
  fi
}

# Valida quantidade: inteiro positivo dentro do teto
validate_count() {
  local n="$1"
  if [[ ! "$n" =~ ^[1-9][0-9]*$ ]]; then
    die "Quantidade inválida: '$n'. Informe um inteiro positivo."
  fi
  if (( n > MAX_CHECKS )); then
    die "Quantidade $n excede o máximo permitido ($MAX_CHECKS). Reduza para evitar tráfego excessivo."
  fi
}

# Timestamp local legível (CSV / log)
now_iso() {
  date '+%Y-%m-%d %H:%M:%S'
}

# Timestamp para nome de arquivo
now_file() {
  date '+%Y%m%d_%H%M%S'
}

# Classifica código HTTP em faixa (2xx/3xx/4xx/5xx/outro)
classify_http() {
  local code="$1"
  if [[ ! "$code" =~ ^[0-9]+$ ]]; then
    return
  fi
  if (( code >= 200 && code <= 299 )); then
    ((count_2xx++)) || true
  elif (( code >= 300 && code <= 399 )); then
    ((count_3xx++)) || true
  elif (( code >= 400 && code <= 499 )); then
    ((count_4xx++)) || true
  elif (( code >= 500 && code <= 599 )); then
    ((count_5xx++)) || true
  else
    ((count_other_http++)) || true
  fi
}

# --- Tratamento de interrupção (Ctrl+C) --------------------------------------

on_interrupt() {
  interrupted=1
  printf '\n\n[!] Interrompido pelo usuário (Ctrl+C). Encerrando com segurança...\n' >&2
  # Evita nova requisição; estatísticas parciais serão impressas no final
}

trap on_interrupt INT TERM

# --- Requisição individual ---------------------------------------------------
# Usa curl com write-out estruturado; não segue redirects indefinidamente.
# Retorno: preenche variáveis via stdout parseável (campos separados por |).

run_one_request() {
  local url="$1"
  local out
  local curl_exit=0

  # Formato write-out (campos separados por |):
  # http_code | time_total | time_connect | time_namelookup | remote_ip | errormsg
  # Nota: %{errormsg} exige curl >= 7.75; se vazio, usamos código de saída.
  local err_file
  err_file="$(mktemp "${TMPDIR:-/tmp}/http_diag_err.XXXXXX")"

  set +e
  out="$(
    curl -sS -L \
      --max-redirs "$MAX_REDIRECTS" \
      --connect-timeout "$CONNECT_TIMEOUT_SEC" \
      --max-time "$TOTAL_TIMEOUT_SEC" \
      -o /dev/null \
      -w '%{http_code}|%{time_total}|%{time_connect}|%{time_namelookup}|%{remote_ip}|%{errormsg}' \
      "$url" 2>"$err_file"
  )"
  curl_exit=$?
  set -e

  local stderr_msg=""
  if [[ -s "$err_file" ]]; then
    stderr_msg="$(tr '\n' ' ' <"$err_file" | sed 's/[[:space:]]*$//')"
  fi
  rm -f "$err_file"

  # Se curl falhou cedo, out pode estar incompleto
  local http_code time_total time_connect time_dns remote_ip errormsg
  IFS='|' read -r http_code time_total time_connect time_dns remote_ip errormsg <<<"${out:-}"

  http_code="${http_code:-000}"
  time_total="${time_total:-0}"
  time_connect="${time_connect:-0}"
  time_dns="${time_dns:-0}"
  remote_ip="${remote_ip:-}"
  errormsg="${errormsg:-$stderr_msg}"

  # Normaliza IP vazio
  if [[ -z "$remote_ip" ]]; then
    remote_ip="N/A"
  fi

  printf '%s|%s|%s|%s|%s|%s|%s|%s\n' \
    "$curl_exit" "$http_code" "$time_total" "$time_connect" "$time_dns" "$remote_ip" "$errormsg" "$stderr_msg"
}

# --- Estatísticas finais -----------------------------------------------------

print_stats() {
  local avg="N/A"
  local min_t="N/A"
  local max_t="N/A"

  if ((${#response_times[@]} > 0)); then
    # Cálculo com awk para precisão decimal portável
    read -r avg min_t max_t < <(
      printf '%s\n' "${response_times[@]}" | awk '
        BEGIN { min = ""; max = ""; sum = 0; n = 0 }
        {
          v = $1 + 0
          sum += v
          n++
          if (min == "" || v < min) min = v
          if (max == "" || v > max) max = v
        }
        END {
          if (n == 0) { print "N/A N/A N/A"; exit }
          printf "%.6f %.6f %.6f\n", sum / n, min, max
        }
      '
    )
  fi

  cat <<EOF

========================================
  ESTATÍSTICAS FINAIS
========================================
Total de requisições:     $total_requests
HTTP 2xx:                 $count_2xx
HTTP 3xx:                 $count_3xx
HTTP 4xx:                 $count_4xx
HTTP 5xx:                 $count_5xx
Outros códigos HTTP:      $count_other_http
Erros de conexão:         $count_conn_errors
Tempo médio de resposta:  ${avg} s
Menor tempo de resposta:  ${min_t} s
Maior tempo de resposta:  ${max_t} s
Arquivo CSV:              ${csv_file:-'(não gerado)'}
EOF

  if (( interrupted )); then
    printf 'Status: interrompido antecipadamente (resultados parciais).\n'
  else
    printf 'Status: concluído.\n'
  fi
  printf '========================================\n'
}

# --- Main --------------------------------------------------------------------

main() {
  local url="https://www.exercitodolula.org/"
  local checks="$DEFAULT_CHECKS"
  local auto_yes=0
  local positional=()

  while [[ $# -gt 0 ]]; do
    case "$1" in
      -h|--help)
        usage
        exit 0
        ;;
      -y|--yes)
        auto_yes=1
        shift
        ;;
      --)
        shift
        positional+=("$@")
        break
        ;;
      -*)
        usage >&2
        die "Opção desconhecida: $1"
        ;;
      *)
        positional+=("$1")
        shift
        ;;
    esac
  done

  if ((${#positional[@]} >= 1)); then
    url="${positional[0]}"
  fi
  if ((${#positional[@]} >= 2)); then
    checks="${positional[1]}"
  fi
  if ((${#positional[@]} > 2)); then
    usage >&2
    die "Argumentos em excesso."
  fi

  require_curl
  validate_url "$url"
  validate_count "$checks"

  local results_dir
  results_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/results"
  mkdir -p "$results_dir"
  csv_file="${results_dir}/http_diagnostic_$(now_file).csv"

  # Aviso obrigatório antes de qualquer teste ativo
  cat <<EOF
========================================
  DIAGNÓSTICO HTTP — AVISO PRÉ-TESTE
========================================
Destino:              $url
Verificações:         $checks (sequenciais)
Intervalo mínimo:     ${MIN_INTERVAL_SEC}s entre requisições
Timeout de conexão:   ${CONNECT_TIMEOUT_SEC}s
Timeout total:        ${TOTAL_TIMEOUT_SEC}s
Redirecionamentos:    no máximo ${MAX_REDIRECTS}
Paralelismo:          desabilitado (1 requisição por vez)
CSV de saída:         $csv_file

Esta ferramenta avalia disponibilidade e latência.
Não realiza carga, não usa proxies/evasão e não
deve ser usada contra sistemas sem autorização.
========================================
EOF

  if (( ! auto_yes )); then
    local answer=""
    printf '\nDigite SIM para iniciar o diagnóstico (ou Ctrl+C para cancelar): '
    read -r answer || true
    if [[ "$answer" != "SIM" ]]; then
      printf 'Cancelado (confirmação não foi SIM).\n'
      exit 0
    fi
  else
    printf '\nConfirmação automática (-y/--yes).\n'
  fi

  printf 'Iniciando em 3 segundos... (Ctrl+C para cancelar)\n'

  # Contagem regressiva cancelável
  local i
  for i in 3 2 1; do
    if (( interrupted )); then
      printf 'Cancelado antes do início.\n'
      exit 130
    fi
    sleep 1
  done

  if (( interrupted )); then
    printf 'Cancelado antes do início.\n'
    exit 130
  fi

  # Cabeçalho CSV
  printf '%s\n' \
    'datetime,request_number,http_code,time_total_s,time_connect_s,time_dns_s,remote_ip,curl_exit,error' \
    >"$csv_file"

  printf '\n%-4s %-19s %-6s %-10s %-10s %-10s %-16s %s\n' \
    '#' 'Data/Hora' 'HTTP' 'Total(s)' 'Conn(s)' 'DNS(s)' 'IP remoto' 'Obs'
  printf '%s\n' '--------------------------------------------------------------------------------'

  local n=1
  while (( n <= checks )); do
    if (( interrupted )); then
      break
    fi

    local ts result
    ts="$(now_iso)"

    local curl_exit http_code time_total time_connect time_dns remote_ip errormsg stderr_msg
    result="$(run_one_request "$url")"
    IFS='|' read -r curl_exit http_code time_total time_connect time_dns remote_ip errormsg stderr_msg <<<"$result"

    ((total_requests++)) || true

    local note=""
    # curl_exit != 0 => erro de transporte / timeout / DNS etc.
    if [[ "$curl_exit" != "0" ]]; then
      ((count_conn_errors++)) || true
      note="ERRO curl=${curl_exit}"
      if [[ -n "$errormsg" ]]; then
        note="$note ${errormsg}"
      elif [[ -n "$stderr_msg" ]]; then
        note="$note ${stderr_msg}"
      fi
      # Ainda assim classifica código se houver (ex.: parcial)
      if [[ "$http_code" =~ ^[1-9][0-9]{2}$ ]]; then
        classify_http "$http_code"
      fi
    else
      classify_http "$http_code"
      response_times+=("$time_total")
      if (( http_code >= 300 && http_code <= 399 )); then
        note="redirect (não seguido além de max-redirs)"
      fi
    fi

    # Escapa aspas no campo de erro para CSV
    local err_csv="${note//\"/\"\"}"

    printf '%s,%s,%s,%s,%s,%s,%s,%s,"%s"\n' \
      "$ts" "$n" "$http_code" "$time_total" "$time_connect" "$time_dns" \
      "$remote_ip" "$curl_exit" "$err_csv" >>"$csv_file"

    printf '%-4s %-19s %-6s %-10s %-10s %-10s %-16s %s\n' \
      "$n" "$ts" "$http_code" "$time_total" "$time_connect" "$time_dns" \
      "$remote_ip" "${note:0:40}"

    # Intervalo mínimo entre requisições (não espera após a última)
    if (( n < checks )) && (( ! interrupted )); then
      sleep "$MIN_INTERVAL_SEC"
    fi

    ((n++)) || true
  done

  print_stats

  if (( interrupted )); then
    exit 130
  fi
}

main "$@"
