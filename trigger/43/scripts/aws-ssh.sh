#!/usr/bin/env bash
# SSH pronto para a Lightsail desta instalação (flexoerp001).
# Uso:
#   ./scripts/aws-ssh.sh                  # shell interativo
#   ./scripts/aws-ssh.sh 'hostname'       # comando remoto
#   SSH_KEY=… AWS_HOST=… ./scripts/aws-ssh.sh
set -euo pipefail

SSH_KEY="${SSH_KEY:-$HOME/Downloads/LightsailDefaultKey-sa-east-1.pem}"
AWS_HOST="${AWS_HOST:-ubuntu@54.20.102.133}"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Chave não encontrada: $SSH_KEY" >&2
  exit 1
fi

chmod 400 "$SSH_KEY" 2>/dev/null || true

exec ssh -i "$SSH_KEY" \
  -o StrictHostKeyChecking=accept-new \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  "$AWS_HOST" "$@"
