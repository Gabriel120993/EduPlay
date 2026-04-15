#!/bin/sh
set -eu

echo "Esperando a que PostgreSQL esté listo..."

until npx prisma migrate deploy >/dev/null 2>&1; do
  echo "PostgreSQL no disponible todavía, reintentando en 2s..."
  sleep 2
done

echo "Migraciones aplicadas."

if [ "${AUTO_SEED_DEMO:-false}" = "true" ]; then
  echo "AUTO_SEED_DEMO=true: ejecutando seed de demo..."
  npm run db:seed
else
  echo "AUTO_SEED_DEMO=false: omitiendo seed de demo."
fi

echo "Iniciando API..."
exec node -r tsconfig-paths/register dist/index.js
