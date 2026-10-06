FROM php:8.4-fpm-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip curl libzip-dev libicu-dev libpq-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_pgsql pgsql bcmath intl zip gd opcache pcntl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY php.ini /usr/local/etc/php/conf.d/99-cliente.ini
COPY www.conf /usr/local/etc/php-fpm.d/www.conf
COPY entrypoint.sh /usr/local/bin/cliente-entrypoint
COPY worker.sh /usr/local/bin/cliente-worker
RUN chmod +x /usr/local/bin/cliente-entrypoint /usr/local/bin/cliente-worker

WORKDIR /var/www/html
ENTRYPOINT ["cliente-entrypoint"]
CMD ["php-fpm"]
