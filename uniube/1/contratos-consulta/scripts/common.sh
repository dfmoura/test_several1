#!/usr/bin/env bash
# Funcoes compartilhadas pelos scripts (Linux/macOS)
# shellcheck shell=bash

_contratos_root() {
  local script_dir
  script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  cd "$script_dir/.." && pwd
}

# Configura PYTHONPATH e ativa venv apenas se estiver completo
contratos_env() {
  local root="${1:-$(_contratos_root)}"
  export PYTHONPATH="$root/src:${PYTHONPATH:-}"

  if [[ -f "$root/.venv/bin/activate" ]]; then
    # shellcheck source=/dev/null
    source "$root/.venv/bin/activate"
    return 0
  fi

  # venv incompleto (ex.: sem python3-venv / ensurepip)
  if [[ -d "$root/.venv" ]]; then
    echo "Aviso: pasta .venv incompleta (sem activate). Usando Python do sistema."
    echo "  Para corrigir: rm -rf .venv && sudo apt install python3.12-venv && ./scripts/setup.sh"
  fi
  return 1
}

# Instala dependencias sem venv
contratos_pip_user() {
  local root="$1"
  cd "$root"
  if python3 -m pip install --user -r requirements.txt; then
    return 0
  fi
  python3 -m pip install --user --break-system-packages -r requirements.txt
}
