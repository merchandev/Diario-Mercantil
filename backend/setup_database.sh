#!/bin/bash
# Manual database setup script
# Run this AFTER the backend container is healthy and responding

echo "========================================="
echo "Database Setup Script"
echo "========================================="

echo "Waiting for database connection..."
php -r "
require '/var/www/html/src/Database.php';
\$max = 30;
for (\$i = 0; \$i < \$max; \$i++) {
    try {
        Database::pdo();
        echo \"✓ Connected to database\n\";
        exit(0);
    } catch (Exception \$e) {
        echo \"Attempt \" . (\$i+1) . \"/\$max failed, retrying...\n\";
        sleep(2);
    }
}
echo \"ERROR: Could not connect to database\n\";
exit(1);
"

if [ $? -ne 0 ]; then
    echo "Failed to connect to database"
    exit 1
fi

echo ""
echo "Checking if database is initialized..."

TABLE_COUNT=$(php -r "
require '/var/www/html/src/Database.php';
\$pdo = Database::pdo();
\$result = \$pdo->query(\"SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'diario_mercantil'\");
echo \$result->fetchColumn();
")

echo "Found $TABLE_COUNT tables"

if [ "$TABLE_COUNT" -eq "0" ]; then
    echo ""
    echo "Initializing database schema..."
    php -r "
    require '/var/www/html/src/Database.php';
    \$pdo = Database::pdo();
    \$sql = file_get_contents('/var/www/html/migrations/init.sql');
    \$pdo->exec(\$sql);
    echo \"✓ Schema created\n\";
    "
    
    echo ""
    echo "Creating default users..."
    php /var/www/html/scripts/seed_users.php
    
    echo ""
    echo "✓ Database initialization complete!"
else
    echo "✓ Database already initialized"
fi

echo ""
echo "Ensuring admin user exists..."
php /var/www/html/scripts/add_merchandev_user.php

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "You can now login with:"
echo "  Username: merchandev"
echo "  Password: G0ku*1896"
echo ""
