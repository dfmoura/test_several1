#!/bin/bash
set -euo pipefail

if [ "${SCRAPER_HEADLESS:-false}" = "true" ]; then
  echo "Worker: modo headless"
  exec python -m app.worker
fi

echo "Worker: modo headed com Xvfb (:99)"
# -ac = sem controle de acesso; Playwright herda DISPLAY para subprocessos
Xvfb :99 -ac -screen 0 1920x1080x24 -nolisten tcp &
export DISPLAY=:99
sleep 1
exec python -m app.worker
