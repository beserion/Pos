# PosNetX - .exe Build Script
# NVM PATH sorununu asmalik icin node.exe tam yolu kullaniliyor
$ErrorActionPreference = "Stop"
$rootDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "    PosNetX .exe Build Baslatiliyor..." -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host ""

# --- Node.js yollari (NVM'ye bagli olmadan tam yol) ---
$node32Path = "C:\Users\yahya\AppData\Local\nvm\v20.12.0\node.exe"
$npm32Path  = "C:\Users\yahya\AppData\Local\nvm\v20.12.0\npm.cmd"
$node64Path = "C:\Users\yahya\AppData\Local\nvm\v24.13.1\node.exe"
$npm64Path  = "C:\Users\yahya\AppData\Local\nvm\v24.13.1\npm.cmd"

# --- 0. 32-bit Node.js hazırlama ---
Write-Host "[0/5] 32-bit Node.js hazirlaniyor..." -ForegroundColor Yellow

$nodeIa32Dir = Join-Path $rootDir "node-ia32"
$nodeIa32Exe = Join-Path $nodeIa32Dir "node.exe"

if (-not (Test-Path $nodeIa32Dir)) {
    New-Item -ItemType Directory -Path $nodeIa32Dir -Force | Out-Null
}

if (Test-Path $node32Path) {
    Copy-Item $node32Path $nodeIa32Exe -Force
    Write-Host "  OK - 32-bit Node.js kopyalandi: $nodeIa32Exe" -ForegroundColor Green
} else {
    Write-Error "32-bit Node.js bulunamadi: $node32Path"
    exit 1
}

# --- 1. Backend Build (32-bit Node ile) ---
Write-Host ""
Write-Host "[1/5] Backend derleniyor (32-bit ortam)..." -ForegroundColor Yellow

Set-Location (Join-Path $rootDir "backend")

Write-Host "  npm install (32-bit)..." -ForegroundColor DarkGray
& $npm32Path install

Write-Host "  nest build..." -ForegroundColor DarkGray
& $npm32Path run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Backend build basarisiz!"
    exit 1
}
Write-Host "  OK - Backend derlendi" -ForegroundColor Green

# --- 2. Frontend Build (64-bit Node ile) ---
Write-Host ""
Write-Host "[2/5] Frontend derleniyor (64-bit)..." -ForegroundColor Yellow

Set-Location (Join-Path $rootDir "frontend")

# NEXT_PUBLIC_API_URL degeri package-webapps.ps1 tarafindan env'e set edilir.
# build-exe.ps1 bagimsiz calisiyorsa frontend/.env dosyasindan okunur.
& $npm64Path run build

if ($LASTEXITCODE -ne 0) {
    Write-Error "Frontend build basarisiz!"
    exit 1
}
Write-Host "  OK - Frontend derlendi" -ForegroundColor Green

# --- 3. Ikon kontrolu ---
Write-Host ""
Write-Host "[3/5] Ikon kontrol ediliyor..." -ForegroundColor Yellow

$iconPath = Join-Path $rootDir "frontend\build\icons\win\icon.ico"
if (Test-Path $iconPath) {
    Write-Host "  OK - Ikon mevcut: $iconPath" -ForegroundColor Green
} else {
    Write-Host "  Ikon olusturuluyor..." -ForegroundColor DarkGray
    & $node64Path (Join-Path $rootDir "frontend\node_modules\.bin\electron-icon-builder") --input=./public/PosNetX3.png --output=./build
}

# --- 4. Electron Paketleme ---
Write-Host ""
Write-Host "[4/5] Electron .exe paketleniyor..." -ForegroundColor Yellow

& $npm64Path exec -- electron-builder --win --x64

if ($LASTEXITCODE -ne 0) {
    Write-Error "Electron build basarisiz!"
    exit 1
}

# --- Sonuc ---
$packageJson = Get-Content -Raw -Path (Join-Path $rootDir "frontend\package.json") | ConvertFrom-Json
$appVersion = $packageJson.version

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "    Build Basariyla Tamamlandi! v$appVersion" -ForegroundColor Green
Write-Host "=====================================================" -ForegroundColor Green
Write-Host ""

$outputDir = Join-Path $rootDir "frontend\dist-electron"
Write-Host "Cikti dizini: $outputDir" -ForegroundColor White
Write-Host ""

$exe = Get-ChildItem $outputDir -Filter "PosNetX Setup*.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($exe) {
    $sizeMB = [math]::Round($exe.Length / 1MB, 1)
    $sizeStr = "$sizeMB MB"
    Write-Host "Installer: $($exe.Name) - $sizeStr" -ForegroundColor White
}

Set-Location $rootDir
