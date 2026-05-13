#!/usr/bin/env bash
# EduPlay — archivo .desktop en Linux (API en http://localhost:3000).
set -euo pipefail

PROJECT_PATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_PATH"

if [[ ! -f package.json ]]; then
  echo "No se encontró package.json."
  exit 1
fi

API_URL="http://localhost:3000"
ICON="$PROJECT_PATH/mobile/assets/icon.png"
SCRIPTS_PATH="$PROJECT_PATH/scripts/shortcuts"
mkdir -p "$SCRIPTS_PATH"
LAST_DESKTOP_FILE=""

echo ""
echo "EduPlay — Crear .desktop"
echo "1) Solo API (npm run dev)"
echo "2) API + navegador ($API_URL)"
echo "3) API + Expo (gnome-terminal / x-terminal-emulator)"
echo "4) Solo PostgreSQL (docker compose up -d db)"
echo ""
read -r -p "Opción (1-4): " OPTION

write_desktop() {
  local id="$1"
  local name="$2"
  local exec_line="$3"
  local file="$HOME/Desktop/${id}.desktop"
  cat > "$file" <<EOF
[Desktop Entry]
Version=1.0
Type=Application
Name=$name
Comment=Iniciar EduPlay
Exec=$exec_line
Icon=$ICON
Terminal=true
Path=$PROJECT_PATH
Categories=Education;Development;
EOF
  chmod +x "$file"
  gio set "$file" metadata::trusted true 2>/dev/null || true
  echo "OK: $file"
  LAST_DESKTOP_FILE="$file"
}

case "$OPTION" in
  1)
    write_desktop "eduplay-api-dev" "EduPlay API (dev)" "bash -lc \"cd \\\"$PROJECT_PATH\\\" && npm run dev\""
    ;;
  2)
    write_desktop "eduplay-api-web" "EduPlay API + navegador" "bash -lc \"cd \\\"$PROJECT_PATH\\\" && xdg-open $API_URL 2>/dev/null; npm run dev\""
    ;;
  3)
    LAUNCH="$SCRIPTS_PATH/eduplay-api-expo-launch.sh"
    cat > "$LAUNCH" <<EOS
#!/usr/bin/env bash
set -e
cd "$PROJECT_PATH"
if command -v gnome-terminal >/dev/null 2>&1; then
  gnome-terminal -- bash -lc "cd \"$PROJECT_PATH/mobile\" && npx expo start" &
elif command -v x-terminal-emulator >/dev/null 2>&1; then
  x-terminal-emulator -e bash -lc "cd \"$PROJECT_PATH/mobile\" && npx expo start" &
else
  xterm -e bash -lc "cd \"$PROJECT_PATH/mobile\" && npx expo start" &
fi
sleep 3
exec npm run dev
EOS
    chmod +x "$LAUNCH"
    write_desktop "eduplay-api-expo" "EduPlay API + Expo" "bash $LAUNCH"
    ;;
  4)
    write_desktop "eduplay-docker-db" "EduPlay Docker DB" "bash -lc \"cd \\\"$PROJECT_PATH\\\" && docker compose up -d db && sleep 3 && xdg-open $API_URL 2>/dev/null; echo Presiona Enter...; read\""
    ;;
  *)
    echo "Opción no válida."
    exit 1
    ;;
esac

read -r -p "¿Copiar también a ~/.local/share/applications? (s/N): " ADD_MENU
if [[ "${ADD_MENU:-}" =~ ^[sS]$ ]] && [[ -n "${LAST_DESKTOP_FILE:-}" ]]; then
  APP_DIR="$HOME/.local/share/applications"
  mkdir -p "$APP_DIR"
  cp -f "$LAST_DESKTOP_FILE" "$APP_DIR/"
  echo "Copiado a $APP_DIR"
fi

echo ""
echo "Listo."
