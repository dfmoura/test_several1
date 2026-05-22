#!/usr/bin/env bash
# Instalacao — Linux / macOS
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=common.sh
source "$(dirname "$0")/common.sh"

if ! command -v python3 &>/dev/null; then
  echo "Erro: Python 3 nao encontrado. Instale Python 3.10 ou superior."
  exit 1
fi

USE_VENV=0

# Remove venv quebrado de tentativa anterior
if [[ -d .venv ]] && [[ ! -f .venv/bin/activate ]]; then
  echo "Removendo .venv incompleto..."
  rm -rf .venv
fi

if python3 -m venv .venv 2>/dev/null && [[ -f .venv/bin/activate ]]; then
  # shellcheck source=/dev/null
  source .venv/bin/activate
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  USE_VENV=1
  echo "venv" > .install-mode
else
  rm -rf .venv 2>/dev/null || true
  echo ""
  echo "Aviso: ambiente virtual nao criado (falta python3-venv)."
  echo "  Debian/Ubuntu: sudo apt install python3.12-venv"
  echo ""
  echo "Instalando dependencias para o usuario (--user)..."
  contratos_pip_user "$ROOT"
  echo "user" > .install-mode
fi

export PYTHONPATH="$ROOT/src:${PYTHONPATH:-}"

echo ""
echo "Instalacao concluida."
if [[ "$USE_VENV" -eq 1 ]]; then
  echo "  Modo: ambiente virtual (.venv)"
else
  echo "  Modo: Python do sistema (pacotes em ~/.local)"
fi
echo "  Interface web:  ./scripts/run_web.sh"
echo "  Linha de comando: ./scripts/run_cli.sh list --public-only"
