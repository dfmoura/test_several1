#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
source "$(dirname "$0")/common.sh"
wl_env "$ROOT" || true
export PYTHONPATH="$ROOT/src:${PYTHONPATH:-}"
mkdir -p data output
exec python -m weblicitacoes_consulta.cli "$@"
