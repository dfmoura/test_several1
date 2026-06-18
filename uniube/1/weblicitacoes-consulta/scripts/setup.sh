#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
source "$(dirname "$0")/common.sh"

if ! command -v python3 &>/dev/null; then
  echo "Erro: Python 3.10+ necessário."
  exit 1
fi

USE_VENV=0
if [[ -d .venv ]] && [[ ! -f .venv/bin/activate ]]; then
  rm -rf .venv
fi

if python3 -m venv .venv 2>/dev/null && [[ -f .venv/bin/activate ]]; then
  source .venv/bin/activate
  python -m pip install --upgrade pip
  pip install -r requirements.txt
  python -m playwright install chromium
  USE_VENV=1
  echo "venv" > .install-mode
else
  rm -rf .venv 2>/dev/null || true
  echo "Instalando com pip --user (sem venv)..."
  wl_pip_user "$ROOT"
  wl_playwright_install
  echo "user" > .install-mode
fi

export PYTHONPATH="$ROOT/src:${PYTHONPATH:-}"
mkdir -p data output
echo ""
echo "Instalação concluída."
echo "  Web:  ./scripts/run_web.sh"
echo "  CLI:  ./scripts/run_cli.sh stats"
