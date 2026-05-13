#!/usr/bin/env bash
# EduPlay — accesos rápidos en macOS (.command en el escritorio).
set -euo pipefail

PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_PATH"

if [[ ! -f package.json ]]; then
  echo "No se encontró package.json. Ejecutá desde la raíz del repo."
  exit 1
fi

API_URL="http://localhost:3000"
DESK="$HOME/Desktop"
SCRIPTS_PATH="$PROJECT_PATH/scripts/shortcuts"
mkdir -p "$SCRIPTS_PATH"

echo ""
echo "EduPlay — Crear lanzador (.command)"
echo "1) Solo API (npm run dev)"
echo "2) API + abrir navegador ($API_URL)"
echo "3) API + Expo (Terminal nueva en mobile)"
echo "4) Solo PostgreSQL (docker compose up -d db)"
echo ""
read -r -p "Opción (1-4): " OPTION

write_cmd() {
  local name="$1"
  local body="$2"
  local out="$SCRIPTS_PATH/${name}.command"
  {
    echo "#!/bin/bash"
    echo "cd \"$PROJECT_PATH\""
    echo "$body"
  } > "$out"
  chmod +x "$out"
  cp -f "$out" "$DESK/${name}.command"
  chmod +x "$DESK/${name}.command"
  echo "OK: $DESK/${name}.command"
}

case "$OPTION" in
  1)
    write_cmd "EduPlay-API-dev" "echo 'Iniciando API...'; npm run dev; read -r"
    ;;
  2)
    write_cmd "EduPlay-API-navegador" "open \"$API_URL\"; echo 'Iniciando API...'; npm run dev; read -r"
    ;;
  3)
    write_cmd "EduPlay-API-Expo" "osascript -e 'tell application \"Terminal\" to do script \"cd \\\"$PROJECT_PATH/mobile\\\" && npx expo start\"' >/dev/null 2>&1 || true; echo 'Iniciando API...'; npm run dev; read -r"
    ;;
  4)
    write_cmd "EduPlay-Docker-DB" "echo 'Docker: base de datos...'; docker compose up -d db; sleep 3; open \"$API_URL\"; echo 'Iniciá la API con: npm run dev'; read -r"
    ;;
  *)
    echo "Opción no válida."
    exit 1
    ;;
esac

echo ""
echo "Listo. Doble clic en el .command del escritorio."
