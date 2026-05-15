#!/bin/sh
set -e

BACKUP_DIR="${BACKUP_DIR:-/backups}"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="eduplay_backup_${DATE}.sql.gz"
DB_HOST="${PGHOST:-db}"
DB_USER="${POSTGRES_USER:-eduplay}"
DB_NAME="${POSTGRES_DB:-eduplay}"

mkdir -p "${BACKUP_DIR}"

pg_dump -h "${DB_HOST}" -U "${DB_USER}" -d "${DB_NAME}" | gzip > "${BACKUP_DIR}/${FILENAME}"

find "${BACKUP_DIR}" -name "eduplay_backup_*.sql.gz" -mtime +7 -delete

echo "Backup creado: ${FILENAME}"
