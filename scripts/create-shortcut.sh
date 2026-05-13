#!/usr/bin/env bash
# EduPlay — delegador de accesos directos (Windows Git Bash / macOS / Linux).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ "$OSTYPE" == msys || "$OSTYPE" == cygwin || "$OSTYPE" == win32 ]]; then
  if command -v powershell.exe >/dev/null 2>&1; then
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/create-shortcut.ps1"
  elif command -v pwsh >/dev/null 2>&1; then
    pwsh -NoProfile -ExecutionPolicy Bypass -File "$ROOT/scripts/create-shortcut.ps1"
  else
    echo "No se encontró PowerShell."
    exit 1
  fi
elif [[ "$OSTYPE" == darwin* ]]; then
  chmod +x "$ROOT/scripts/create-shortcut-mac.sh" 2>/dev/null || true
  exec bash "$ROOT/scripts/create-shortcut-mac.sh"
elif [[ "$OSTYPE" == linux-gnu* ]] || [[ "$OSTYPE" == linux ]]; then
  chmod +x "$ROOT/scripts/create-shortcut-linux.sh" 2>/dev/null || true
  exec bash "$ROOT/scripts/create-shortcut-linux.sh"
else
  echo "SO no reconocido: $OSTYPE. Probando script Linux..."
  chmod +x "$ROOT/scripts/create-shortcut-linux.sh" 2>/dev/null || true
  exec bash "$ROOT/scripts/create-shortcut-linux.sh"
fi
