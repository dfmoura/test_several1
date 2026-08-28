#!/bin/sh
set -e
cd /var/www/html

if [ ! -f vendor/autoload.php ]; then
  composer config audit.block-insecure false >/dev/null 2>&1 || true
  composer install --no-interaction --prefer-dist
fi

if [ ! -f .env ]; then
  cp .env.example .env 2>/dev/null || true
fi

# Só gera chave se o arquivo ainda estiver sem APP_KEY válida
if ! grep -qE '^APP_KEY=base64:[A-Za-z0-9+/=]{20,}$' .env 2>/dev/null; then
  # limpa linha quebrada
  sed -i 's/^APP_KEY=.*/APP_KEY=/' .env 2>/dev/null || true
  php artisan key:generate --force --no-interaction || true
fi

# Compose pode injetar APP_KEY vazio e sobrescrever o .env do volume — restaura a chave do arquivo.
# Sem isso o worker `queue` quebra Crypt ("No application encryption key has been specified").
ENV_KEY="$(grep -E '^APP_KEY=' .env 2>/dev/null | head -1 | cut -d= -f2-)"
if printf '%s' "$ENV_KEY" | grep -qE '^base64:[A-Za-z0-9+/=]{20,}$'; then
  case "${APP_KEY:-}" in
    ''|'null'|null) export APP_KEY="$ENV_KEY" ;;
  esac
  if ! printf '%s' "${APP_KEY:-}" | grep -qE '^base64:[A-Za-z0-9+/=]{20,}$'; then
    export APP_KEY="$ENV_KEY"
  fi
fi

# Garante MySQL do Compose (evita cair no sqlite do skeleton)
if [ -n "$DB_CONNECTION" ]; then
  sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=${DB_CONNECTION}/" .env
fi
if [ -n "$DB_HOST" ]; then
  sed -i "s/^DB_HOST=.*/DB_HOST=${DB_HOST}/" .env || echo "DB_HOST=${DB_HOST}" >> .env
fi
if [ -n "$DB_DATABASE" ]; then
  sed -i "s/^DB_DATABASE=.*/DB_DATABASE=${DB_DATABASE}/" .env || echo "DB_DATABASE=${DB_DATABASE}" >> .env
fi
if [ -n "$DB_USERNAME" ]; then
  sed -i "s/^DB_USERNAME=.*/DB_USERNAME=${DB_USERNAME}/" .env || echo "DB_USERNAME=${DB_USERNAME}" >> .env
fi
if [ -n "$DB_PASSWORD" ]; then
  sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=${DB_PASSWORD}/" .env || echo "DB_PASSWORD=${DB_PASSWORD}" >> .env
fi

# Estágio canônico: local | homolog | production (docs/DEPLOY_LOCAL_AWS.md)
ERP_STAGE="${ERP_STAGE:-local}"
case "$ERP_STAGE" in
  local|homolog|production) ;;
  *)
    echo "ERP_STAGE inválido: '$ERP_STAGE' (use local|homolog|production)" >&2
    exit 1
    ;;
esac

# Guarda: produção/homolog nunca semeiam no boot (evita resetar dados na reinicialização).
if [ "$ERP_STAGE" = "production" ] || [ "$ERP_STAGE" = "homolog" ]; then
  if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
    echo "AVISO: SEED_ON_BOOT ignorado em ERP_STAGE=$ERP_STAGE (use seed manual se banco vazio)." >&2
  fi
  SEED_ON_BOOT=false
fi

# Guarda: debug ligado em produção é erro de configuração.
if [ "$ERP_STAGE" = "production" ] && [ "${APP_DEBUG:-false}" = "true" ]; then
  echo "ERRO: APP_DEBUG=true com ERP_STAGE=production — recusando boot." >&2
  exit 1
fi

php artisan config:clear || true
php artisan migrate --force --no-interaction

if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
  php artisan db:seed --force --no-interaction
fi

# Sempre reaplicar RBAC de ORC (bancos já existentes / seed parcial / cache Spatie).
php artisan orcamento:ensure-rbac --no-interaction || true

# Mapa de facas: importa itens ausentes do JSON oficial (idempotente).
php artisan facas:ensure-mapa --no-interaction || true

# Condições de pagamento: RBAC + sugestões canônicas por EMP (idempotente).
php artisan condicao-pagamento:ensure-rbac --no-interaction || true
php artisan condicao-pagamento:ensure-sugestoes --no-interaction || true

php artisan storage:link 2>/dev/null || true

exec "$@"
