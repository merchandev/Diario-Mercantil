#!/bin/bash
# Backend database initialization script
# This script runs inside the backend container to initialize the database

set -e

echo "=== Database Initialization Script ==="

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
max_retries=30
counter=0

until mysql -h db -u mercantil_user -psecure_password_2025 -e "SELECT 1" > /dev/null 2>&1; do
    counter=$((counter+1))
    if [ $counter -gt $max_retries ]; then
        echo "ERROR: MySQL did not become ready in time"
        exit 1
    fi
    echo "Waiting for database... ($counter/$max_retries)"
    sleep 2
done

echo "✓ Database is ready"

# Check if tables exist
TABLE_COUNT=$(mysql -h db -u mercantil_user -psecure_password_2025 -D diario_mercantil -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'diario_mercantil'" 2>/dev/null || echo "0")

echo "Found $TABLE_COUNT tables in database"

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo "Database is empty. Running migrations..."
    mysql -h db -u mercantil_user -psecure_password_2025 diario_mercantil < /var/www/html/migrations/init.sql
    
    echo "✓ Migrations completed successfully"
    
    echo "Seeding initial data..."
    php /var/www/html/scripts/seed_users.php
    
    echo "✓ Database initialized successfully"
else
    echo "✓ Database already initialized (found $TABLE_COUNT tables)"
fi

# Verify admin user exists
echo "Checking for admin user..."
php /var/www/html/scripts/add_merchandev_user.php || true

echo "=== Initialization Complete ==="
