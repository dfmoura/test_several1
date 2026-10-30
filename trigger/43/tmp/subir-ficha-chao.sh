#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.." || cd /home/dfmoura/Documents/test_several1/trigger/43
echo "== Docker daemon =="
if ! docker info >/dev/null 2>&1; then
  echo "Docker API indisponível (sem /var/run/docker.sock)."
  echo "No host: sudo systemctl restart docker"
  echo "Depois rode de novo: make pronto-ficha-chao"
  exit 1
fi
exec make pronto-ficha-chao
