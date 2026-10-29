#!/usr/bin/env bash
# Verifica se uma porta TCP está disponível no host Linux (sem Python).
set -euo pipefail

TARGET_PORT="${1:-${PORT:-18765}}"

if ! [[ "$TARGET_PORT" =~ ^[0-9]+$ ]] || (( TARGET_PORT < 1 || TARGET_PORT > 65535 )); then
  echo "Porta inválida: $TARGET_PORT" >&2
  exit 2
fi

port_is_busy() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltn | awk '{print $4}' | grep -E "(:|\\.)${port}$" >/dev/null 2>&1
    return $?
  fi
  if command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>/dev/null | awk '{print $4}' | grep -E "(:|\\.)${port}$" >/dev/null 2>&1
    return $?
  fi
  echo "Aviso: utilitário 'ss' não encontrado. Instale iproute2 para verificação confiável." >&2
  return 1
}

suggest_port() {
  local start="$1"
  local candidate
  local -a extras=(18766 18767 19000 19001 19100)
  for candidate in $(seq "$start" $((start + 50))) "${extras[@]}"; do
    if [[ "$candidate" == "$start" ]]; then
      continue
    fi
    if ! port_is_busy "$candidate"; then
      echo "$candidate"
      return 0
    fi
  done
  return 1
}

if port_is_busy "$TARGET_PORT"; then
  echo "A porta ${TARGET_PORT} está ocupada no host."
  echo "Nenhum serviço existente será interrompido."
  if alt="$(suggest_port "$TARGET_PORT")"; then
    echo "Sugestão de porta alternativa disponível: ${alt}"
    echo "Exemplo:"
    echo "  PORT=${alt} docker compose up -d"
  else
    echo "Não foi possível sugerir automaticamente uma porta livre próxima."
    echo "Verifique com: ss -ltn"
  fi
  exit 1
fi

echo "A porta ${TARGET_PORT} está disponível no host."
exit 0
