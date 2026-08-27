# Imagem PHP CLI — Lightsail enxuto (artisan serve, ≤10 users)
FROM php:8.4-cli-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
        git unzip curl libzip-dev libpng-dev libjpeg62-turbo-dev libfreetype6-dev libicu-dev libonig-dev \
    && docker-php-ext-configure intl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo_mysql bcmath intl zip gd opcache pcntl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer
COPY php.ini /usr/local/etc/php/conf.d/99-erp.ini
RUN mkdir -p /usr/local/etc/ssl
COPY openssl.cnf /usr/local/etc/ssl/openssl-erp.cnf
COPY entrypoint.sh /usr/local/bin/erp-entrypoint
ENV OPENSSL_CONF=/usr/local/etc/ssl/openssl-erp.cnf
RUN chmod +x /usr/local/bin/erp-entrypoint \
    && usermod -u 1000 www-data && groupmod -g 1000 www-data

WORKDIR /var/www/html
EXPOSE 8000
ENTRYPOINT ["erp-entrypoint"]
CMD ["php", "artisan", "serve", "--host=0.0.0.0", "--port=8000"]
