#!/usr/bin/env bash
# Servidor estático local. Raiz = site/ (mesmas URLs que em produção)
# Porta padrão 8081 (8080 costuma estar ocupada por outros serviços locais).
# Se 8081 estiver ocupada, tenta 8082-8090 automaticamente.
# Para forçar uma porta: PORT=3000 ./serve-local.sh
set -euo pipefail

BASE="$(cd "$(dirname "$0")" && pwd)"
ROOT="${BASE}/site"
DEFAULT_PORT=8081
PORT_EXPLICIT="${PORT:-}"

port_in_use() {
  python3 - "$1" <<'PY'
import socket, sys
port = int(sys.argv[1])
s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
try:
    s.bind(("127.0.0.1", port))
except OSError:
    sys.exit(0)  # em uso
finally:
    s.close()
sys.exit(1)  # livre
PY
}

find_free_port() {
  local start="$1" end="$2" p
  for ((p = start; p <= end; p++)); do
    if ! port_in_use "$p"; then
      echo "$p"
      return 0
    fi
  done
  return 1
}

PORT="${PORT_EXPLICIT:-$DEFAULT_PORT}"

if port_in_use "$PORT"; then
  if [[ -n "$PORT_EXPLICIT" ]]; then
    echo "Erro: a porta ${PORT} já está em uso nesta máquina." >&2
    echo "Escolha outra porta, por exemplo:" >&2
    echo "  PORT=8082 $0" >&2
    exit 1
  fi
  if ! PORT="$(find_free_port "$DEFAULT_PORT" $((DEFAULT_PORT + 9)))"; then
    echo "Erro: nenhuma porta livre entre ${DEFAULT_PORT} e $((DEFAULT_PORT + 9))." >&2
    echo "Encerre o servidor antigo ou defina PORT manualmente." >&2
    exit 1
  fi
  echo "Porta ${DEFAULT_PORT} ocupada. Usando ${PORT}." >&2
fi

cd "$ROOT"
echo "Site Trigger: http://localhost:${PORT}"
echo "  Empresa:     http://localhost:${PORT}/"
echo "  Consultoria: http://localhost:${PORT}/consultoria/"
echo "  Estoque:     http://localhost:${PORT}/estoque-sankhya/"
echo "  Produto:     http://localhost:${PORT}/gestao-condominial/"
echo "Ctrl+C para encerrar."
exec python3 -m http.server "$PORT" --bind 127.0.0.1
