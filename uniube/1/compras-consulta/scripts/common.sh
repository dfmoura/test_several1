#!/usr/bin/env bash
# Funções compartilhadas (Linux/macOS)

_compras_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/.." && pwd
}

compras_env() {
  local root="${1:-$(_compras_root)}"
  export PYTHONPATH="$root/src:${PYTHONPATH:-}"

  if [[ -f "$root/.venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "$root/.venv/bin/activate"
    return 0
  fi

  if [[ -d "$root/.venv" ]]; then
    echo "Aviso: .venv incompleta. Usando Python do sistema."
    echo "  Corrigir: rm -rf .venv && sudo apt install python3.12-venv && ./scripts/setup.sh"
  fi
  return 1
}

compras_pip_user() {
  local root="$1"
  cd "$root"
  if python3 -m pip install --user -r requirements.txt; then
    return 0
  fi
  python3 -m pip install --user --break-system-packages -r requirements.txt
}
