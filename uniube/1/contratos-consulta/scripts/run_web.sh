#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"
contratos_env "$ROOT" || true
mkdir -p output
exec python3 -m streamlit run src/contratos_consulta/app.py --server.headless true
