#!/bin/sh
set -e

echo "Starting backend initialization..."

# Ensure storage directories exist
mkdir -p /var/www/html/storage/uploads
mkdir -p /var/www/html/storage/results
mkdir -p /var/www/html/storage/database

# Set proper ownership
chown -R www-data:www-data /var/www/html/storage
chmod -R 775 /var/www/html/storage

# Create database file if it doesn't exist
if [ ! -f /var/www/html/storage/database.sqlite ]; then
    echo "Creating database file..."
    touch /var/www/html/storage/database.sqlite
    chown www-data:www-data /var/www/html/storage/database.sqlite
    chmod 664 /var/www/html/storage/database.sqlite
fi

echo "Initialization complete. Starting PHP-FPM..."

# Execute PHP-FPM in foreground mode - THIS IS CRITICAL
# The exec command replaces the shell with php-fpm, keeping the container alive
exec php-fpm -F -R
