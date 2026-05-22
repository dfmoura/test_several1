#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"
# shellcheck source=common.sh
source "$SCRIPT_DIR/common.sh"
contratos_env "$ROOT" || true
exec python3 -m contratos_consulta.cli "$@"
