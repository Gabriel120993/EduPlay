#Requires -Version 5.1
<#
.SYNOPSIS
  Crea un .bat en scripts/shortcuts y un acceso directo en el escritorio para iniciar EduPlay.
.DESCRIPTION
  Ejecutar desde la raíz del repo:  .\scripts\create-shortcut.ps1
  La API de desarrollo usa http://localhost:3000 (no 3800).
#>
$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (-not (Test-Path (Join-Path $RepoRoot "package.json"))) {
  Write-Host "[X] No se encontró package.json. Ejecutá el script desde la raíz del repo EduPlay." -ForegroundColor Red
  exit 1
}

$ApiUrl = "http://localhost:3000"
$iconRel = "mobile\assets\icon.png"
$iconPath = Join-Path $RepoRoot $iconRel
if (-not (Test-Path $iconPath)) {
  $iconPath = "$env:SystemRoot\System32\shell32.dll,137"
}

Write-Host ""
Write-Host "EduPlay — Crear acceso directo" -ForegroundColor Cyan
Write-Host ""
Write-Host "1) Solo API (npm run dev)"
Write-Host "2) API + abrir navegador en $ApiUrl"
Write-Host "3) API + Expo en otra ventana (mobile)"
Write-Host "4) Solo PostgreSQL (docker compose up -d db) + abrir $ApiUrl (la API la iniciás aparte)"
Write-Host ""
$option = Read-Host "Elegí una opción (1-4)"

$scriptsPath = Join-Path $RepoRoot "scripts\shortcuts"
if (-not (Test-Path $scriptsPath)) {
  New-Item -ItemType Directory -Path $scriptsPath -Force | Out-Null
}

$projectPath = $RepoRoot
$mobilePath = Join-Path $RepoRoot "mobile"

switch ($option) {
  "1" {
    $scriptContent = @"
@echo off
cd /d "$projectPath"
echo Iniciando EduPlay API (desarrollo)...
call npm run dev
pause
"@
    $scriptPath = Join-Path $scriptsPath "EduPlay API dev.bat"
    $iconDesc = "API dev"
  }
  "2" {
    $scriptContent = @"
@echo off
cd /d "$projectPath"
start "" "$ApiUrl"
echo Iniciando EduPlay API (desarrollo)...
call npm run dev
pause
"@
    $scriptPath = Join-Path $scriptsPath "EduPlay API + navegador.bat"
    $iconDesc = "API + Web"
  }
  "3" {
    $scriptContent = @"
@echo off
cd /d "$projectPath"
start "EduPlay Expo" powershell -NoExit -NoProfile -Command "Set-Location '$mobilePath'; npx expo start"
echo Iniciando EduPlay API (desarrollo)...
call npm run dev
pause
"@
    $scriptPath = Join-Path $scriptsPath "EduPlay API + Expo.bat"
    $iconDesc = "API + Mobile"
  }
  "4" {
    $scriptContent = @"
@echo off
cd /d "$projectPath"
echo Levantando PostgreSQL (Docker)...
call docker compose up -d db
echo.
echo Base lista. Iniciá la API con: npm run dev
timeout /t 4 /nobreak >nul
start "" "$ApiUrl"
pause
"@
    $scriptPath = Join-Path $scriptsPath "EduPlay Docker DB.bat"
    $iconDesc = "Docker DB"
  }
  default {
    Write-Host "[X] Opción no válida." -ForegroundColor Red
    exit 1
  }
}

$scriptContent | Out-File -FilePath $scriptPath -Encoding ASCII
Write-Host "[OK] Script creado: $scriptPath" -ForegroundColor Green

$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "EduPlay - $iconDesc.lnk"
$WshShell = New-Object -ComObject WScript.Shell
$shortcut = $WshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $scriptPath
$shortcut.WorkingDirectory = $projectPath
$shortcut.IconLocation = $iconPath
$shortcut.Description = "EduPlay — $iconDesc"
$shortcut.WindowStyle = 1
try {
  $shortcut.Save()
  Write-Host "[OK] Acceso directo en el escritorio: $shortcutPath" -ForegroundColor Green
} catch {
  Write-Host "[!] No se pudo crear el .lnk. Podés ejecutar: $scriptPath" -ForegroundColor Yellow
}

$sm = Read-Host "¿También en el menú Inicio? (s/N)"
if ($sm -eq "s" -or $sm -eq "S") {
  $startMenuPath = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\EduPlay"
  if (-not (Test-Path $startMenuPath)) {
    New-Item -ItemType Directory -Path $startMenuPath -Force | Out-Null
  }
  $startShortcutPath = Join-Path $startMenuPath "EduPlay - $iconDesc.lnk"
  $s2 = $WshShell.CreateShortcut($startShortcutPath)
  $s2.TargetPath = $scriptPath
  $s2.WorkingDirectory = $projectPath
  $s2.IconLocation = $iconPath
  $s2.Description = "EduPlay — $iconDesc"
  $s2.Save()
  Write-Host "[OK] Acceso directo en menú Inicio." -ForegroundColor Green
}

Write-Host ""
Write-Host "Listo." -ForegroundColor Cyan
