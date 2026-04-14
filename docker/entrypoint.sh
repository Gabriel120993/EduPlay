#!/bin/sh
set -eu

echo "Esperando a que PostgreSQL esté listo..."

until npx prisma migrate deploy >/dev/null 2>&1; do
  echo "PostgreSQL no disponible todavía, reintentando en 2s..."
  sleep 2
done

echo "Migraciones aplicadas. Iniciando API..."
exec node -r tsconfig-paths/register dist/index.js
