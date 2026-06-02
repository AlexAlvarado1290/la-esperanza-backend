#!/usr/bin/env bash
# Backup diario de la base de datos de producción.
# Diseñado para correr desde cron en el VPS:
#   0 3 * * *  /opt/esperanza/backend/scripts/backup-db.sh >> /var/log/esperanza-backup.log 2>&1
#
# Estrategia: pg_dump comprimido (formato custom), retención de 7 días.

set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/var/backups/esperanza}"
RETENTION_DAYS="${RETENTION_DAYS:-7}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
TARGET="${BACKUP_DIR}/esperanza-${STAMP}.dump"

mkdir -p "${BACKUP_DIR}"

echo "[$(date -u +%FT%TZ)] Iniciando backup → ${TARGET}"

# pg_dump corre dentro del contenedor postgres usando las credenciales nativas
# (POSTGRES_USER / POSTGRES_PASSWORD ya están en su entorno).
docker exec esperanza-postgres pg_dump \
  -U esperanza \
  -d esperanza \
  -Fc \
  > "${TARGET}"

SIZE="$(du -h "${TARGET}" | cut -f1)"
echo "[$(date -u +%FT%TZ)] Backup OK (${SIZE})"

# Rotación: borra dumps con mtime > RETENTION_DAYS.
find "${BACKUP_DIR}" -name 'esperanza-*.dump' -type f -mtime "+${RETENTION_DAYS}" -print -delete \
  | sed 's/^/[purgado] /'

echo "[$(date -u +%FT%TZ)] Listo."
