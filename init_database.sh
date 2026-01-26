#!/bin/bash
set -e

echo "============================================"
echo "DIARIO MERCANTIL - Database Initialization"
echo "============================================"

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until docker exec diario-mercantil-db-1 mysqladmin ping -h localhost -u root -proot_secure_password_2025 --silent; do
    echo "MySQL not ready yet, waiting..."
    sleep 2
done

echo "✅ MySQL is ready"
echo ""

# Initialize database with clean script
echo "Initializing database..."
cat backend/migrations/CLEAN_INIT.sql | docker exec -i diario-mercantil-db-1 mysql -u root -proot_secure_password_2025

echo ""
echo "✅ Database initialized successfully"
echo ""

# Verify initialization
echo "Verifying database..."
echo ""

docker exec -i diario-mercantil-db-1 mysql -u root -proot_secure_password_2025 diario_mercantil -e "
SELECT 'Superadmins:' AS info, COUNT(*) AS count FROM superadmins
UNION ALL
SELECT 'Users:', COUNT(*) FROM users
UNION ALL  
SELECT 'Tables:', COUNT(*) FROM information_schema.tables WHERE table_schema = 'diario_mercantil';
"

echo ""
echo "============================================"
echo "✅ Initialization Complete"
echo "============================================"
echo ""
echo "Credentials:"
echo "- Superadmin: merchandev / G0ku*1896"
echo "- Admin: V12345678 / Admin#2025!"
echo "- Solicitante: J000111222 / Test#2025!"
echo ""
