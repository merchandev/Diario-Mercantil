#!/bin/sh
set -e

echo "Starting backend initialization..."

# Ensure storage directories exist
mkdir -p /var/www/html/storage/uploads
mkdir -p /var/www/html/storage/results
mkdir -p /var/www/html/storage/database
mkdir -p /var/www/html/storage/cache

# Set proper ownership
chown -R www-data:www-data /var/www/html/storage
chmod -R 775 /var/www/html/storage

echo "Storage directories ready"

# Run database initialization in background (non-blocking)
echo "Starting database initialization in background..."
bash /var/www/html/init_database.sh > /var/www/html/storage/init.log 2>&1 &

echo "PHP-FPM starting immediately..."

# Execute PHP-FPM in foreground mode - THIS IS CRITICAL
# The exec command replaces the shell with php-fpm, keeping the container alive
exec php-fpm -F -R
