#!/usr/bin/env bash
# Deploy / actualización del Sistema La Esperanza en el VPS.
#   - Hace pull del repo backend y del repo frontend.
#   - Reconstruye sólo lo que cambió.
#   - Reinicia los contenedores afectados.
#   - Verifica health al final.
#
# Uso:
#   ./scripts/deploy.sh           # despliegue normal
#   ./scripts/deploy.sh --rebuild # fuerza rebuild completo
#
# Asume que está en /opt/esperanza/backend/ con frontend hermano en ../frontend/.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${0}")/.." && pwd)"
FRONTEND_DIR="${REPO_ROOT}/../frontend"
COMPOSE_FILE="${REPO_ROOT}/docker-compose.prod.yml"
ENV_FILE="${REPO_ROOT}/.env"

REBUILD_FLAG=""
if [ "${1:-}" = "--rebuild" ]; then
  REBUILD_FLAG="--no-cache"
fi

cd "${REPO_ROOT}"
[ ! -f "${ENV_FILE}" ] && { echo "❌ Falta ${ENV_FILE}. Copialo desde .env.production.example."; exit 1; }
[ ! -d "${FRONTEND_DIR}" ] && { echo "❌ Falta el repo frontend en ${FRONTEND_DIR}"; exit 1; }

echo "→ git pull backend"
git -C "${REPO_ROOT}" pull --ff-only

echo "→ git pull frontend"
git -C "${FRONTEND_DIR}" pull --ff-only

echo "→ docker compose build ${REBUILD_FLAG}"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" build ${REBUILD_FLAG}

echo "→ docker compose up -d"
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" up -d --remove-orphans

echo "→ Esperando health del backend…"
for i in {1..30}; do
  if docker exec esperanza-backend wget -qO- http://localhost:3000/health >/dev/null 2>&1; then
    echo "✅ Backend healthy."
    break
  fi
  sleep 2
done

echo ""
docker compose --env-file "${ENV_FILE}" -f "${COMPOSE_FILE}" ps
