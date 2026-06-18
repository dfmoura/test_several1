#!/usr/bin/env bash
# Abre o Chrome visível para a coleta Compras.gov (Docker + CDP).
set -euo pipefail

URL="https://cnetmobile.estaleiro.serpro.gov.br/comprasnet-web/public/compras"
DIR="${HOME}/.compras-hub-chrome"
PORT=9222

mkdir -p "$DIR"

FLAGS=(
  --remote-debugging-port="$PORT"
  --remote-allow-origins="*"
  --user-data-dir="$DIR"
)

if command -v google-chrome >/dev/null 2>&1; then
  exec google-chrome "${FLAGS[@]}" "$URL"
elif command -v google-chrome-stable >/dev/null 2>&1; then
  exec google-chrome-stable "${FLAGS[@]}" "$URL"
elif command -v chromium >/dev/null 2>&1; then
  exec chromium "${FLAGS[@]}" "$URL"
elif command -v chromium-browser >/dev/null 2>&1; then
  exec chromium-browser "${FLAGS[@]}" "$URL"
else
  echo "Instale google-chrome ou chromium." >&2
  exit 1
fi
