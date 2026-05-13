#Requires -Version 5.1
<#
.SYNOPSIS
  Instalador automático de EduPlay (Windows / PowerShell).
.DESCRIPTION
  Desde la raíz del repo:  .\scripts\install-windows.ps1
  Requiere Node.js 22+, npm. Docker opcional (PostgreSQL vía docker compose).
#>
$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

function Write-Step($msg) { Write-Host "[*] $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "[OK] $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "[!] $msg" -ForegroundColor DarkYellow }
function Write-Err($msg) { Write-Host "[X] $msg" -ForegroundColor Red }

function Test-CommandAvailable([string]$Name) {
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Test-TcpPortFree([int]$Port) {
  try {
    $l = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
    $l.Start()
    $l.Stop()
    return $true
  } catch {
    return $false
  }
}

function New-JwtSecretPlaceholder {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $bytes = New-Object byte[] 48
  $rng.GetBytes($bytes)
  return [Convert]::ToBase64String($bytes)
}

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " EduPlay - Instalador (Windows)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
  Write-Err "No se encontró package.json. Ejecutá este script desde el clon del repo (carpeta EduPlay)."
  exit 1
}

$pkg = Get-Content (Join-Path $RepoRoot "package.json") -Raw | ConvertFrom-Json
if ($pkg.name -ne "eduplay-api") {
  Write-Warn "package.json no parece ser el de EduPlay API (name=$($pkg.name)). Continuando igual..."
}

Write-Step "Paso 1: Requisitos (Node 22+, npm)"
if (-not (Test-CommandAvailable "node")) {
  Write-Err "Node.js no está instalado. Instalá v22 LTS: https://nodejs.org/"
  exit 1
}
$nodeV = node --version
$major = [int]($nodeV.TrimStart("v").Split(".")[0])
if ($major -lt 22) {
  Write-Err "Se requiere Node.js v22 o superior. Detectado: $nodeV"
  exit 1
}
Write-Ok "Node $nodeV"
if (-not (Test-CommandAvailable "npm")) {
  Write-Err "npm no está disponible."
  exit 1
}
Write-Ok "npm $(npm --version)"
if (Test-CommandAvailable "git") {
  Write-Ok "$(git --version)"
} else {
  Write-Warn "Git no encontrado (opcional)."
}

$useDocker = $false
if (Test-CommandAvailable "docker") {
  Write-Ok "$(docker --version)"
  $useDocker = $true
} else {
  Write-Warn "Docker no encontrado: usá PostgreSQL local y DATABASE_URL en .env"
}

Write-Step "Paso 2: Puertos (3000 API, 5432 Postgres, 8081 Metro)"
foreach ($p in @(3000, 5432, 8081)) {
  if (Test-TcpPortFree $p) {
    Write-Ok "Puerto $p libre"
  } else {
    Write-Warn "Puerto $p ocupado (cerrá el proceso que lo use o cambiá configuración)"
  }
}

Write-Step "Paso 3: npm install (raíz)"
npm install
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Ok "Dependencias raíz instaladas"

Write-Step "Paso 4: Variables de entorno (.env)"
$envFile = Join-Path $RepoRoot ".env"
if (-not (Test-Path $envFile)) {
  $example = Join-Path $RepoRoot ".env.example"
  if (Test-Path $example) {
    Copy-Item $example $envFile
    $secret = New-JwtSecretPlaceholder
    $raw = Get-Content $envFile -Raw -Encoding UTF8
    $raw = $raw.Replace("cambiar-por-secreto-largo-aleatorio-minimo-32-caracteres", $secret)
    $raw | Set-Content $envFile -Encoding UTF8
    Write-Ok ".env creado desde .env.example (JWT_SECRET aleatorio)"
  } else {
    $secret = New-JwtSecretPlaceholder
    @"
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://eduplay:eduplay2024@localhost:5432/eduplay
JWT_SECRET=$secret
BCRYPT_ROUNDS=12
TRUST_PROXY=false
"@ | Set-Content $envFile -Encoding UTF8
    Write-Ok ".env creado con valores por defecto"
  }
  Write-Warn "Revisá DATABASE_URL si no usás Docker en localhost:5432"
} else {
  Write-Ok ".env ya existe"
}

Write-Step "Paso 5: Prisma generate"
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Ok "Prisma Client generado"

Write-Step "Paso 6: Base de datos"
if ($useDocker) {
  try {
    docker info 2>$null | Out-Null
  } catch {
    Write-Err "Docker no responde. Iniciá Docker Desktop y volvé a ejecutar el script."
    exit 1
  }
  docker compose -f (Join-Path $RepoRoot "docker-compose.yml") up -d db
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
  Write-Ok "Contenedor eduplay-db iniciado"
  $retries = 0
  while ($retries -lt 40) {
    $ready = docker exec eduplay-db pg_isready -U eduplay 2>$null
    if ($LASTEXITCODE -eq 0) { break }
    Start-Sleep -Seconds 1
    $retries++
  }
  if ($retries -ge 40) {
    Write-Err "PostgreSQL no respondió a tiempo. Revisá: docker compose logs db"
    exit 1
  }
  Write-Ok "PostgreSQL listo"
} else {
  Write-Warn "Sin Docker: asegurate de que Postgres escuche en DATABASE_URL y exista la DB."
}

Write-Step "Paso 7: Migraciones"
npx prisma migrate deploy
if ($LASTEXITCODE -ne 0) {
  Write-Warn "migrate deploy falló (¿primera vez?). Probá en desarrollo: npx prisma migrate dev"
}

Write-Step "Paso 8: Seed (opcional)"
$runSeed = Read-Host "¿Ejecutar seed de datos demo? (s/N)"
if ($runSeed -eq "s" -or $runSeed -eq "S") {
  npm run db:seed
  if ($LASTEXITCODE -ne 0) {
    Write-Warn "db:seed falló; podés ejecutar después: npm run db:seed"
  } else {
    Write-Ok "Seed aplicado (ver prisma/seed.ts para credenciales demo)"
  }
}

Write-Step "Paso 9: App móvil (mobile)"
$mobile = Join-Path $RepoRoot "mobile"
if (Test-Path (Join-Path $mobile "package.json")) {
  Push-Location $mobile
  npm install
  if ($LASTEXITCODE -ne 0) {
    Pop-Location
    exit $LASTEXITCODE
  }
  $mEnv = Join-Path $mobile ".env"
  if (-not (Test-Path $mEnv) -and (Test-Path (Join-Path $mobile ".env.example"))) {
    Copy-Item (Join-Path $mobile ".env.example") $mEnv
    Write-Ok "mobile/.env creado desde .env.example (completá EXPO_PUBLIC_USER_ID, etc.)"
  }
  Pop-Location
  Write-Ok "Dependencias mobile instaladas"
} else {
  Write-Warn "Carpeta mobile no encontrada; se omitió."
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host " Instalación terminada" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host " API (dev):     npm run dev    -> http://localhost:3000"
Write-Host " Verificación: npm run verify (con el API en marcha)"
Write-Host " Mobile:       cd mobile; npx expo start"
Write-Host " Env:          npm run check-env"
Write-Host " Accesos:      npm run shortcut"
Write-Host ""

$bonus = Read-Host "¿Crear acceso directo en el escritorio ahora? (s/N)"
if ($bonus -eq "s" -or $bonus -eq "S") {
  $sc = Join-Path $PSScriptRoot "create-shortcut.ps1"
  if (Test-Path $sc) {
    & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $sc
  } else {
    Write-Warn "No se encontró scripts/create-shortcut.ps1"
  }
}

$start = Read-Host "¿Iniciar API ahora con npm run dev? (s/N)"
if ($start -eq "s" -or $start -eq "S") {
  npm run dev
}
