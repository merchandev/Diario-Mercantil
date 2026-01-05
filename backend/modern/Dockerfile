# Multi-stage build for new backend
FROM composer:2 AS deps
WORKDIR /app
COPY composer.json ./
RUN composer install --no-dev --no-scripts --no-progress --prefer-dist || true
# Copy full source and regenerate optimized autoload
COPY . .
RUN composer dump-autoload --optimize || true

FROM php:8.2-cli AS runtime
WORKDIR /app
# Install sqlite extension
RUN apt-get update && apt-get install -y libsqlite3-dev \
    && docker-php-ext-install pdo pdo_sqlite \
    && rm -rf /var/lib/apt/lists/*
COPY --from=deps /app /app
ENV APP_ENV=local APP_DEBUG=1 DB_PATH=/app/storage/database.sqlite
EXPOSE 8080
CMD ["php","-S","0.0.0.0:8080","public/index.php"]
