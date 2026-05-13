#!/usr/bin/env bash
# EduPlay — instalador macOS / Linux (Bash).
# Uso: desde la raíz del repo:  chmod +x scripts/install-mac-linux.sh && ./scripts/install-mac-linux.sh

set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
step() { echo -e "${YELLOW}[*]${NC} $1"; }
ok() { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err() { echo -e "${RED}[X]${NC} $1"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN} EduPlay - Instalador (macOS / Linux)${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""

if [[ ! -f package.json ]]; then
  err "Ejecutá este script desde la raíz del clon de EduPlay (falta package.json)."
  exit 1
fi

step "Paso 1: Node.js 22+ y npm"
if ! command -v node >/dev/null 2>&1; then
  err "Instalá Node.js 22 LTS: https://nodejs.org/"
  exit 1
fi
NODE_MAJOR="$(node -p "parseInt(process.versions.node.split('.')[0],10)")"
if [[ "$NODE_MAJOR" -lt 22 ]]; then
  err "Se requiere Node.js v22+. Tenés: $(node --version)"
  exit 1
fi
ok "Node $(node --version)"
command -v npm >/dev/null 2>&1 || { err "npm no encontrado."; exit 1; }
ok "npm $(npm --version)"

USE_DOCKER=false
if command -v docker >/dev/null 2>&1; then
  ok "$(docker --version)"
  USE_DOCKER=true
else
  warn "Docker no encontrado: necesitás PostgreSQL local (DATABASE_URL en .env)."
fi

step "Paso 2: npm install (raíz)"
npm install

step "Paso 3: .env"
if [[ ! -f .env ]]; then
  if [[ -f .env.example ]]; then
    cp .env.example .env
    SECRET="$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '\n')"
    if grep -q 'cambiar-por-secreto-largo-aleatorio-minimo-32-caracteres' .env 2>/dev/null; then
      if [[ "$(uname -s)" == "Darwin" ]]; then
        sed -i '' "s#cambiar-por-secreto-largo-aleatorio-minimo-32-caracteres#$SECRET#" .env
      else
        sed -i "s#cambiar-por-secreto-largo-aleatorio-minimo-32-caracteres#$SECRET#" .env
      fi
    fi
    ok ".env creado desde .env.example"
  else
    SECRET="$(openssl rand -base64 48 2>/dev/null || head -c 48 /dev/urandom | base64 | tr -d '\n')"
    cat > .env <<EOF
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://eduplay:eduplay2024@localhost:5432/eduplay
JWT_SECRET=$SECRET
BCRYPT_ROUNDS=12
TRUST_PROXY=false
EOF
    ok ".env creado con valores por defecto"
  fi
  warn "Revisá DATABASE_URL si tu Postgres no es localhost:5432"
else
  ok ".env ya existe"
fi

step "Paso 4: Prisma generate"
npx prisma generate

step "Paso 5: Base de datos"
if [[ "$USE_DOCKER" == true ]]; then
  docker compose up -d db
  for i in $(seq 1 40); do
    if docker exec eduplay-db pg_isready -U eduplay >/dev/null 2>&1; then
      ok "PostgreSQL listo"
      break
    fi
    sleep 1
    if [[ "$i" -eq 40 ]]; then
      err "Postgres no respondió. docker compose logs db"
      exit 1
    fi
  done
else
  warn "Sin Docker: asegurate de que exista la base y el usuario en DATABASE_URL."
fi

step "Paso 6: Migraciones"
if ! npx prisma migrate deploy; then
  warn "migrate deploy falló. En desarrollo: npx prisma migrate dev"
fi

step "Paso 7: Seed (opcional)"
read -r -p "¿Ejecutar seed de datos demo? (s/N): " RUN_SEED
if [[ "${RUN_SEED:-}" =~ ^[sS]$ ]]; then
  npm run db:seed || warn "db:seed falló; ejecutá después: npm run db:seed"
fi

step "Paso 8: mobile"
if [[ -f mobile/package.json ]]; then
  (cd mobile && npm install)
  if [[ ! -f mobile/.env && -f mobile/.env.example ]]; then
    cp mobile/.env.example mobile/.env
    ok "mobile/.env creado desde .env.example"
  fi
  ok "Dependencias mobile listas"
else
  warn "Sin carpeta mobile"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} Listo${NC}"
echo -e "${GREEN}========================================${NC}"
echo " API (dev):     npm run dev    -> http://localhost:3000"
echo " Verificación: npm run verify"
echo " Mobile:       cd mobile && npx expo start"
echo " Env:          npm run check-env"
echo " Accesos:      npm run shortcut"
echo ""

read -r -p "¿Crear acceso directo / lanzador ahora? (s/N): " BONUS_SC
if [[ "${BONUS_SC:-}" =~ ^[sS]$ ]]; then
  chmod +x scripts/create-shortcut.sh 2>/dev/null || true
  bash scripts/create-shortcut.sh || warn "No se pudo ejecutar create-shortcut.sh"
fi

read -r -p "¿Iniciar API con npm run dev ahora? (s/N): " START
if [[ "${START:-}" =~ ^[sS]$ ]]; then
  npm run dev
fi
