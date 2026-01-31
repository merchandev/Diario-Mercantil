#!/bin/bash
# Diagnostic script to check storage permissions

echo "=== CHECKING STORAGE DIRECTORY ==="
echo "Current directory:"
pwd

echo -e "\n=== Directory listing of /var/www/html ==="
ls -la /var/www/html

echo -e "\n=== Checking storage directory ==="
if [ -d "/var/www/html/storage" ]; then
    echo "✓ storage directory exists"
    ls -la /var/www/html/storage
else
    echo "✗ storage directory DOES NOT EXIST"
fi

echo -e "\n=== Checking storage/uploads directory ==="
if [ -d "/var/www/html/storage/uploads" ]; then
    echo "✓ storage/uploads directory exists"
    ls -la /var/www/html/storage/uploads
else
    echo "✗ storage/uploads directory DOES NOT EXIST"
fi

echo -e "\n=== Current user and permissions ==="
whoami
id

echo -e "\n=== Testing write permissions ==="
touch /var/www/html/storage/test_file.txt 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Can write to storage"
    rm /var/www/html/storage/test_file.txt
else
    echo "✗ CANNOT write to storage"
fi

echo -e "\n=== Fixing permissions NOW ==="
chown -R www-data:www-data /var/www/html/storage
chmod -R 777 /var/www/html/storage
echo "Permissions fixed!"

ls -la /var/www/html/storage
