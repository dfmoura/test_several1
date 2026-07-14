#!/bin/bash
set -euo pipefail

PORT="${APP_PORT:-8096}"

exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
