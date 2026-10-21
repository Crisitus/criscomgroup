#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR="/root/criscom-backups/automatic"
STAMP="$(date +%Y%m%d-%H%M%S)"
TARGET="$BACKUP_DIR/criscom-$STAMP.sql.gz"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

docker inspect criscomgroup-db >/dev/null
docker exec criscomgroup-db sh -lc 'exec mysqldump --single-transaction --quick --no-tablespaces --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' | gzip -9 > "$TARGET"
chmod 600 "$TARGET"
gzip -t "$TARGET"
test "$(gzip -cd "$TARGET" | wc -c)" -gt 1024
find "$BACKUP_DIR" -type f -name 'criscom-*.sql.gz' -mtime +30 -delete
printf 'Backup verificado: %s\n' "$TARGET"
