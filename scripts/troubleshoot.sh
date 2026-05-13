#!/usr/bin/env bash
# EduPlay — solución rápida de problemas comunes (macOS / Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "EduPlay - troubleshoot (raíz: $ROOT)"
echo ""

echo "1) Liberar puertos típicos (3000, 5432, 8081, 5555) si hay lsof..."
if command -v lsof >/dev/null 2>&1; then
  for p in 3000 5432 8081 5555; do
    PIDS="$(lsof -ti:"$p" 2>/dev/null || true)"
    if [[ -n "${PIDS:-}" ]]; then
      kill -9 $PIDS 2>/dev/null || true
      echo "   Puerto $p liberado"
    fi
  done
else
  echo "   lsof no disponible; omitido."
fi

echo ""
echo "2) Docker compose (DB) — bajar volúmenes opcional"
if command -v docker >/dev/null 2>&1; then
  docker compose down -v 2>/dev/null || true
  echo "   docker compose down OK"
else
  echo "   docker no instalado; omitido."
fi

echo ""
echo "3) Reinstalar dependencias (raíz)"
rm -rf node_modules
npm install
npx prisma generate

echo ""
echo "4) Levantar DB y migrar (si usás Docker)"
if command -v docker >/dev/null 2>&1; then
  docker compose up -d db
  sleep 3
  npx prisma migrate deploy || true
fi

echo ""
echo "Listo. Probá: npm run check-env && npm run dev"
echo "En Windows usá scripts/install-windows.ps1 o PowerShell equivalente."
