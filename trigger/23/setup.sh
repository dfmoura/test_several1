#!/usr/bin/env bash
# Configura ambiente virtual local (evita erro PEP 668 / externally-managed-environment).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV="$ROOT/.venv"

if ! command -v python3 >/dev/null 2>&1; then
  echo "python3 não encontrado." >&2
  exit 1
fi

if ! python3 -m venv "$VENV" 2>/dev/null; then
  echo "python3-venv não instalado; criando venv sem pip…"
  echo "Recomendado (uma vez): sudo apt install python3.12-venv"
  python3 -m venv "$VENV" --without-pip
  curl -sS https://bootstrap.pypa.io/get-pip.py | "$VENV/bin/python"
fi

"$VENV/bin/pip" install -r "$ROOT/requirements.txt"

echo
echo "Ambiente pronto. Para subir o Observatório de Licitações:"
echo "  ./run.sh"
echo
echo "Ou manualmente:"
echo "  source .venv/bin/activate"
echo "  uvicorn app.main:app --reload --host 0.0.0.0 --port 8096"
