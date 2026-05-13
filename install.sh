#!/usr/bin/env bash
# EduPlay — instalador universal (detecta SO y delega).
# Uso: ./install.sh   (desde la raíz del repo)

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "EduPlay - Instalador universal"
echo ""

if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  echo "Windows (Git Bash / MSYS): ejecutando PowerShell..."
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/install-windows.ps1"
  elif command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/install-windows.ps1"
  else
    echo "No se encontró PowerShell. Abrí PowerShell y ejecutá:"
    echo "  Set-ExecutionPolicy -Scope CurrentUser RemoteSigned"
    echo "  cd \"$ROOT\""
    echo "  .\\scripts\\install-windows.ps1"
    exit 1
  fi
elif [[ "$OSTYPE" == darwin* ]]; then
  echo "macOS: ejecutando instalador Bash..."
  chmod +x "$ROOT/scripts/install-mac-linux.sh"
  exec "$ROOT/scripts/install-mac-linux.sh"
elif [[ "$OSTYPE" == linux-gnu* ]]; then
  echo "Linux: ejecutando instalador Bash..."
  chmod +x "$ROOT/scripts/install-mac-linux.sh"
  exec "$ROOT/scripts/install-mac-linux.sh"
else
  echo "SO no reconocido ($OSTYPE). Intentando instalador Bash genérico..."
  chmod +x "$ROOT/scripts/install-mac-linux.sh"
  exec "$ROOT/scripts/install-mac-linux.sh"
fi
