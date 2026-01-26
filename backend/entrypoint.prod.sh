#!/bin/sh
# Ultra-simplified entrypoint - ONLY start PHP-FPM
# NO database initialization, NO waiting, NO complexity

echo "Creating storage directories..."
mkdir -p /var/www/html/storage/uploads
mkdir -p /var/www/html/storage/results  
mkdir -p /var/www/html/storage/database
mkdir -p /var/www/html/storage/cache

echo "Setting permissions..."
chown -R www-data:www-data /var/www/html/storage
chmod -R 775 /var/www/html/storage

echo "========================================="
echo "Starting PHP-FPM on port 9000..."
echo "========================================="

# Start PHP-FPM in foreground - NOTHING ELSE
exec php-fpm -F -R
