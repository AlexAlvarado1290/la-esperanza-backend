#!/usr/bin/env bash
# Restaura un backup .dump generado por backup-db.sh.
#   Uso:  ./restore-db.sh /var/backups/esperanza/esperanza-20260605T030000Z.dump
#
# ⚠️ DESTRUYE los datos actuales antes de restaurar. Confirmar antes de correr.

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Uso: $0 <archivo.dump>"
  exit 1
fi

DUMP="$1"
if [ ! -f "${DUMP}" ]; then
  echo "❌ No existe: ${DUMP}"
  exit 1
fi

echo "⚠️  Vas a RESTAURAR la base esperanza desde:"
echo "    ${DUMP}"
echo "    (los datos actuales se PIERDEN)"
read -r -p "Escribir 'restaurar' para confirmar: " CONFIRM
if [ "${CONFIRM}" != "restaurar" ]; then
  echo "Cancelado."
  exit 1
fi

echo "→ Dropeando y recreando la base…"
docker exec esperanza-postgres psql -U esperanza -d postgres -c "DROP DATABASE IF EXISTS esperanza WITH (FORCE);" >/dev/null
docker exec esperanza-postgres psql -U esperanza -d postgres -c "CREATE DATABASE esperanza OWNER esperanza;" >/dev/null

echo "→ Restaurando dump…"
docker exec -i esperanza-postgres pg_restore -U esperanza -d esperanza --no-owner --role=esperanza < "${DUMP}"

echo "✅ Restore completado."
