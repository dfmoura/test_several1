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

php artisan config:clear || true
php artisan migrate --force --no-interaction

if [ "${SEED_ON_BOOT:-true}" = "true" ]; then
  php artisan db:seed --force --no-interaction
fi

# Sempre reaplicar RBAC de ORC (bancos já existentes / seed parcial / cache Spatie).
php artisan orcamento:ensure-rbac --no-interaction || true

php artisan storage:link 2>/dev/null || true

exec "$@"
