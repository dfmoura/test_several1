#!/usr/bin/env bash
# Sobe só o front (SPA) para a Lightsail e recria o container web.
# Não mexe em .env, banco, APP_KEY nem PHP.
#
# Uso:
#   ./scripts/aws-deploy-web.sh
#   SSH_KEY=… AWS_HOST=… AWS_REMOTE=… ./scripts/aws-deploy-web.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SSH_KEY="${SSH_KEY:-$HOME/Downloads/LightsailDefaultKey-sa-east-1.pem}"
AWS_HOST="${AWS_HOST:-ubuntu@54.20.102.133}"
AWS_REMOTE="${AWS_REMOTE:-/home/ubuntu/flexoerp}"
STAGE="${AWS_DIST_STAGE:-/home/ubuntu/spa-dist-staging}"
SSH=(ssh -i "$SSH_KEY" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30)
RSH="ssh -i $SSH_KEY -o StrictHostKeyChecking=accept-new"

if [[ ! -f "$SSH_KEY" ]]; then
  echo "Chave não encontrada: $SSH_KEY" >&2
  exit 1
fi

echo "==> build local"
cd "$ROOT"
# dist é o que importa; falha do docker local recreate é ignorável
make web-build || test -f apps/web/dist/index.html

echo "==> sync sources (referência no host)"
rsync -avz -e "$RSH" \
  "$ROOT/apps/web/src/lib/producaoPick.ts" \
  "$AWS_HOST:$AWS_REMOTE/apps/web/src/lib/producaoPick.ts"
rsync -avz -e "$RSH" \
  "$ROOT/apps/web/src/components/" \
  "$AWS_HOST:$AWS_REMOTE/apps/web/src/components/"
rsync -avz -e "$RSH" \
  "$ROOT/apps/web/src/pages/" \
  "$AWS_HOST:$AWS_REMOTE/apps/web/src/pages/"
rsync -avz -e "$RSH" \
  "$ROOT/apps/web/src/styles/global.css" \
  "$AWS_HOST:$AWS_REMOTE/apps/web/src/styles/global.css"

echo "==> stage dist (home) + install com sudo se dist for root"
"${SSH[@]}" "$AWS_HOST" "mkdir -p '$STAGE' && rm -rf '$STAGE'/*"
rsync -avz -e "$RSH" --delete \
  "$ROOT/apps/web/dist/" \
  "$AWS_HOST:$STAGE/"

echo "==> recreate web container"
"${SSH[@]}" "$AWS_HOST" bash -s <<REMOTE
set -euo pipefail
cd "$AWS_REMOTE"
COMPOSE='docker compose -f docker-compose.yml -f docker-compose.aws.yml --env-file .env.aws'
if touch apps/web/dist/.wtest 2>/dev/null; then
  rm -f apps/web/dist/.wtest
  rsync -a --delete "$STAGE"/ apps/web/dist/
else
  sudo rsync -a --delete "$STAGE"/ apps/web/dist/
  sudo chown -R ubuntu:ubuntu apps/web/dist || true
fi
make stage-web-context
\$COMPOSE build web
\$COMPOSE up -d --force-recreate --no-deps web
curl -sS -o /dev/null -w "SPA HTTP %{http_code}\\n" -m 15 https://flexoerp001.triggerti.com/ || true
echo DONE_DEPLOY_WEB
REMOTE
