#!/bin/bash
set -e

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/www/html/storage/backups"
mkdir -p "$BACKUP_DIR"

echo "Backing up database..."
# Use environment variables available in backend container
mysqldump -h "${DB_HOST:-db}" -P "${DB_PORT:-3306}" -u "${DB_USERNAME:-diario}" -p"${DB_PASSWORD}" "${DB_DATABASE:-diario_mercantil}" > "$BACKUP_DIR/db_$TIMESTAMP.sql"

echo "Backing up uploads..."
if [ -d "/var/www/html/storage/uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_$TIMESTAMP.tar.gz" -C /var/www/html/storage uploads
fi

# Rotate: Keep last 7 backups
find "$BACKUP_DIR" -type f -name "*.sql" -mtime +7 -delete 2>/dev/null || true
find "$BACKUP_DIR" -type f -name "*.tar.gz" -mtime +7 -delete 2>/dev/null || true

echo "Backup complete: $TIMESTAMP"
