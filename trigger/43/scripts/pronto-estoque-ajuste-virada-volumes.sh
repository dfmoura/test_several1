#!/usr/bin/env bash
# Sobe stack local + SPA Ajustes A03 com volumes de abertura (implantação).
# Uso (no host, com Docker): bash scripts/pronto-estoque-ajuste-virada-volumes.sh
#     ou: make pronto-estoque-ajuste-virada-volumes
#
# Preferir o alvo completo (entrada + baixa em qualquer motivo):
#     make pronto-estoque-ajuste-volumes
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

exec bash "$ROOT/scripts/pronto-estoque-ajuste-volumes.sh"
