#!/usr/bin/env bash
set -euo pipefail

# Non-destructive production backup for PostgreSQL (pgdata) and uploaded
# storage volumes (pizzas_data and materiais_data). Read-only against runtime data.

DB_CONTAINER="${DB_CONTAINER:-tamburetei-db-1}"
BACKEND_CONTAINER="${BACKEND_CONTAINER:-tamburetei-backend-1}"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/tamburetei-backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

mkdir -p "$BACKUP_ROOT"
chmod 700 "$BACKUP_ROOT"

LOCK_FILE="$BACKUP_ROOT/.backup.lock"
exec 9>"$LOCK_FILE"
if ! flock -n 9; then
  echo "[$STAMP] Another backup run is already in progress; skipping."
  exit 0
fi

WORK_DIR="$BACKUP_ROOT/.tmp-$STAMP"
DEST_DIR="$BACKUP_ROOT/$STAMP"
mkdir -p "$WORK_DIR"
trap 'rm -rf "$WORK_DIR"' EXIT

echo "[$STAMP] Starting read-only PostgreSQL dump from $DB_CONTAINER..."
docker exec "$DB_CONTAINER" sh -c \
  'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' \
  > "$WORK_DIR/postgres.dump"

if [ ! -s "$WORK_DIR/postgres.dump" ]; then
  echo "[$STAMP] Error: postgres.dump is empty." >&2
  exit 1
fi

echo "[$STAMP] Starting read-only storage archive from $BACKEND_CONTAINER (/app/storage)..."
docker exec "$BACKEND_CONTAINER" tar -czf - -C /app/storage . > "$WORK_DIR/storage.tar.gz"

if [ ! -s "$WORK_DIR/storage.tar.gz" ]; then
  echo "[$STAMP] Error: storage.tar.gz is empty." >&2
  exit 1
fi

(cd "$WORK_DIR" && sha256sum postgres.dump storage.tar.gz > manifest.sha256)
chmod 600 "$WORK_DIR/postgres.dump" "$WORK_DIR/storage.tar.gz" "$WORK_DIR/manifest.sha256"

mv "$WORK_DIR" "$DEST_DIR"
chmod 700 "$DEST_DIR"

# Prune only previous timestamped backup directories older than RETENTION_DAYS.
find "$BACKUP_ROOT" -maxdepth 1 -mindepth 1 -type d -regextype posix-extended \
  -regex ".*/[0-9]{8}T[0-9]{6}Z" -mtime +"$RETENTION_DAYS" -exec rm -rf {} +

echo "[$STAMP] Backup completed cleanly at $DEST_DIR"
