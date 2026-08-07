#!/bin/sh
set -eu

UPLOAD_DIR="${UPLOAD_DIR:-/var/www/html/storage/uploads}"
RESULT_DIR="${RESULT_DIR:-/var/www/html/storage/results}"

mkdir -p "$UPLOAD_DIR" "$RESULT_DIR"
chown -R www-data:www-data /var/www/html/storage
find /var/www/html/storage -type d -exec chmod 0750 {} \;
find /var/www/html/storage -type f -exec chmod 0640 {} \;

if [ "${1:-}" = "php-fpm" ] || [ "${1:-}" = "php-fpm8" ]; then
  echo "[entrypoint] Aplicando migraciones seguras..."
  php /var/www/html/bin/migrate.php
fi

exec "$@"
