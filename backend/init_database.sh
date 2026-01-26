#!/bin/bash
# Backend database initialization script
# This script runs inside the backend container to initialize the database

echo "=== Database Initialization Script ==="

# Wait for MySQL to be ready using PHP Database class
echo "Waiting for MySQL to be ready..."
max_retries=30
counter=0

until php -r "require '/var/www/html/src/Database.php'; try { Database::pdo(); exit(0); } catch (Exception \$e) { exit(1); }" 2>/dev/null
do
    counter=$((counter+1))
    if [ $counter -gt $max_retries ]; then
        echo "ERROR: MySQL did not become ready in time"
        exit 1
    fi
    echo "Waiting for database... ($counter/$max_retries)"
    sleep 2
done

echo "✓ Database is ready"

# Check if tables exist using PHP
TABLE_COUNT=$(php -r "
require '/var/www/html/src/Database.php';
try {
    \$pdo = Database::pdo();
    \$result = \$pdo->query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'diario_mercantil'\");
    echo \$result->fetchColumn();
} catch (Exception \$e) {
    echo '0';
}
" 2>/dev/null)

echo "Found $TABLE_COUNT tables in database"

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "Database is empty. Running migrations..."
    php -r "
    require '/var/www/html/src/Database.php';
    \$pdo = Database::pdo();
    \$sql = file_get_contents('/var/www/html/migrations/init.sql');
    \$pdo->exec(\$sql);
    echo 'Migrations completed successfully' . PHP_EOL;
    "
    
    echo "Seeding initial data..."
    php /var/www/html/scripts/seed_users.php || true
    
    echo "✓ Database initialized successfully"
else
    echo "✓ Database already initialized (found $TABLE_COUNT tables)"
fi

# Verify admin user exists
echo "Verifying admin user..."
php /var/www/html/scripts/add_merchandev_user.php 2>/dev/null || true

echo "=== Initialization Complete ==="
