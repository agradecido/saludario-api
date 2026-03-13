FROM php:8.3-cli

RUN apt-get update && apt-get install -y \
    libpq-dev \
    unzip \
    && docker-php-ext-install pdo pdo_pgsql

COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html
COPY . .

RUN composer install --optimize-autoloader

EXPOSE 3000
CMD ["php", "-S", "0.0.0.0:3000", "-t", "public", "public/index.php"]
