#!/bin/sh
set -e

BACKUP_DIR="backups"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)

mkdir -p "$BACKUP_DIR"

cp database.json "$BACKUP_DIR/database-$TIMESTAMP.json"
cp users.json "$BACKUP_DIR/users-$TIMESTAMP.json"

# Delete backups older than 14 days
find "$BACKUP_DIR" -type f -name 'database-*.json' -mtime +14 -delete
find "$BACKUP_DIR" -type f -name 'users-*.json' -mtime +14 -delete

echo "Backup complete: $TIMESTAMP" 