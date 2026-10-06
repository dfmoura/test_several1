#!/bin/sh
set -e
cd /var/www/html

php -r '
$host = getenv("DB_HOST") ?: "postgres";
$db = getenv("DB_DATABASE") ?: "cliente";
$user = getenv("DB_USERNAME") ?: "cliente";
$pass = getenv("DB_PASSWORD") ?: "";
for ($i = 0; $i < 30; $i++) {
    try {
        new PDO("pgsql:host={$host};dbname={$db}", $user, $pass);
        exit(0);
    } catch (Throwable $e) {
        sleep(1);
    }
}
fwrite(STDERR, "Postgres indisponível\n");
exit(1);
'

mkdir -p storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs storage/app/anexos bootstrap/cache
chown -R www-data:www-data storage bootstrap/cache || true

if ! grep -q '^APP_KEY=base64:' .env 2>/dev/null; then
    php artisan key:generate --force --ansi
fi

if [ "${MIGRATE_ON_BOOT:-false}" = "true" ]; then
    php artisan migrate --force --ansi
    php artisan db:seed --force --ansi
fi

touch /tmp/app-ready
exec "$@"
