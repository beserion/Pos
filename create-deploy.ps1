$ErrorActionPreference = "Stop"

$rootDir = $PSScriptRoot
$deployDir = Join-Path $rootDir "Deploy"

Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  PosNetX Deploy Olusturuluyor..." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

if (Test-Path $deployDir) {
  Write-Host "Eski Deploy klasoru temizleniyor... (PM2 durduruluyor)" -ForegroundColor Gray
  # PM2 surecleri calisiyorsa Deploy klasorunu kilitleyebilir, once onlari durduralim
  try {
    Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
  }
  catch {}
    
  Remove-Item -Path $deployDir -Recurse -Force
}
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# =============================================
# 1. Backend (NestJS) Build
# =============================================
Write-Host "[1/4] Backend derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "backend")
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Backend build basarisiz!"; exit 1 }

$backendDeploy = Join-Path $deployDir "backend"
New-Item -ItemType Directory -Path $backendDeploy -Force | Out-Null
Copy-Item -Path "dist" -Destination $backendDeploy -Recurse -Force
Copy-Item -Path "package.json" -Destination $backendDeploy -Force
if (Test-Path "lib") {
  Copy-Item -Path "lib" -Destination $backendDeploy -Recurse -Force
}
if (Test-Path ".env") {
  Copy-Item -Path ".env" -Destination $backendDeploy -Force
}

# Ana backend klasorunden node_modules kopyala (Daha hizli ve eksiksiz cozum)
if (Test-Path (Join-Path $rootDir "backend\node_modules")) {
  Write-Host "  -> node_modules kopyalaniyor..." -ForegroundColor DarkGray
  Copy-Item -Path (Join-Path $rootDir "backend\node_modules") -Destination $backendDeploy -Recurse -Force
}

Set-Location $backendDeploy
# ia32 mimarisi icin native modulleri yeniden derle (bcrypt vb. sorunlar icin kritik)
Write-Host "  -> 32-bit (ia32) native moduller rebuild ediliyor..." -ForegroundColor DarkGray
npm rebuild --target=20.12.0 --arch=ia32 --target_arch=ia32 --silent





# Script yolunu kontrol et
$backendScript = "dist/main.js"
if (Test-Path (Join-Path $backendDeploy "dist/src/main.js")) {
  $backendScript = "dist/src/main.js"
}

# =============================================
# 0. Node Binaries (ERKEN KOPYALAMA - Gizleme adimi icin gerekli)
# =============================================
Write-Host "`n[0/4] Node binaryleri kopyalaniyor..." -ForegroundColor Yellow
$nodeDeploy = Join-Path $deployDir "node"
New-Item -ItemType Directory -Path $nodeDeploy -Force | Out-Null
if (Test-Path (Join-Path $rootDir "node-ia32")) { Copy-Item -Path (Join-Path $rootDir "node-ia32") -Destination (Join-Path $nodeDeploy "node-ia32") -Recurse -Force }
if (Test-Path (Join-Path $rootDir "node-x64")) { Copy-Item -Path (Join-Path $rootDir "node-x64") -Destination (Join-Path $nodeDeploy "node-x64") -Recurse -Force }

# --- Backend Kod Gizleme ---
Write-Host "`n  -> Backend kodlari gizleniyor (Bytecode)..." -ForegroundColor Cyan
Set-Location $backendDeploy
npm install bytenode --save --arch=ia32 --target_arch=ia32 --silent
$nodeIA32 = Join-Path $deployDir "node/node-ia32/node.exe"
$bytenodeCli = Join-Path $backendDeploy "node_modules/bytenode/lib/cli.js"

Get-ChildItem -Path "dist" -Filter "*.js" -Recurse | ForEach-Object {
  & $nodeIA32 $bytenodeCli --compile $_.FullName
  Remove-Item $_.FullName
}
$jscFilePath = $backendScript -replace '\.js$', '.jsc'
$loaderContent = "require('bytenode'); require(require('path').join(__dirname, '$jscFilePath'));"
[System.IO.File]::WriteAllText((Join-Path $backendDeploy "index.js"), $loaderContent, [System.Text.Encoding]::UTF8)
$backendScript = "index.js"

# =============================================
# 2. Patron (bossposnetx) Build
# =============================================
Write-Host "`n[2/4] Patron (bossposnetx) derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "bossposnetx")
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "bossposnetx build basarisiz!"; exit 1 }

& npx esbuild server.ts --bundle --platform=node --packages=external --minify --outfile=server.cjs
if ($LASTEXITCODE -ne 0) { Write-Error "esbuild basarisiz!"; exit 1 }

$bossDeploy = Join-Path $deployDir "bossposnetx"
New-Item -ItemType Directory -Path $bossDeploy -Force | Out-Null
foreach ($item in @("dist", "node_modules", "package.json", "server.cjs", ".env")) {
  if (Test-Path $item) { Copy-Item -Path $item -Destination $bossDeploy -Recurse -Force }
}
# Boss uygulamasinin .env dosyasi yoksa, backend'in .env'sini kopyala (ayni DB'yi paylasirlar)
$bossEnv = Join-Path $bossDeploy ".env"
if (-not (Test-Path $bossEnv)) {
  $backendEnv = Join-Path $rootDir "backend\.env"
  if (Test-Path $backendEnv) {
    Copy-Item -Path $backendEnv -Destination $bossEnv -Force
    Write-Host "  -> Backend .env dosyasi Boss uygulamasina kopyalandi" -ForegroundColor DarkGray
  } else {
    Write-Host "  !! UYARI: Backend .env dosyasi bulunamadi, Boss DB'ye baglanaMAYABILIR!" -ForegroundColor Red
  }
}

# =============================================
# 3. Garson (posnetx-waiter) Build
# =============================================
Write-Host "`n[3/4] Garson (posnetx-waiter) derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "posnetx-waiter")
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "posnetx-waiter build basarisiz!"; exit 1 }

$waiterDeploy = Join-Path $deployDir "posnetx-waiter"
New-Item -ItemType Directory -Path $waiterDeploy -Force | Out-Null
foreach ($item in @("dist", "node_modules", "package.json")) {
  if (Test-Path $item) { Copy-Item -Path $item -Destination $waiterDeploy -Recurse -Force }
}

# =============================================
# 4. Frontend (Next.js) Build
# =============================================
Write-Host "`n[4/4] Frontend (Next.js) derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "frontend")
# Eski build cache'ini temizle (eski URL'lerin kalinti olarak build output'a sizmamasi icin kritik)
if (Test-Path ".next") {
  Write-Host "  -> Eski .next cache temizleniyor..." -ForegroundColor DarkGray
  Remove-Item -Path ".next" -Recurse -Force
}
npm run build
if ($LASTEXITCODE -ne 0) { Write-Error "Frontend build basarisiz!"; exit 1 }

$frontendDeploy = Join-Path $deployDir "frontend"
New-Item -ItemType Directory -Path $frontendDeploy -Force | Out-Null
foreach ($item in @(".next", "node_modules", "package.json", "public", ".env")) {
  if (Test-Path $item) { Copy-Item -Path $item -Destination $frontendDeploy -Recurse -Force }
}

# --- Frontend Kod Gizleme Uyarisi ---
Write-Host "`n  -> Frontend (Next.js) sunucu kodlari zaten minify edilmistir. Bytecode Next.js chunk yapisini bozdugu icin atlandi." -ForegroundColor Cyan


# =============================================
# 5. Ecosystem Config
# =============================================
Write-Host "`nPM2 ecosystem.config.js olusturuluyor..." -ForegroundColor Yellow
$eco = @"
const path = require('path');

module.exports = {
  apps: [
    {
      name: 'PosNetX-Backend',
      script: '$backendScript',
      cwd: './backend',
      interpreter: path.join(__dirname, 'node/node-ia32/node.exe'),
      env: { NODE_ENV: 'production', PORT: 3050 }
    },
    {
      name: 'PosNetX-Boss',
      script: 'server.cjs',
      cwd: './bossposnetx',
      interpreter: path.join(__dirname, 'node/node-x64/node.exe'),
      env: { NODE_ENV: 'production', PORT: 3100 }
    },
    {
      name: 'PosNetX-Waiter',
      script: 'node_modules/vite/bin/vite.js',
      args: 'preview --port 5173 --host',
      cwd: './posnetx-waiter',
      interpreter: path.join(__dirname, 'node/node-x64/node.exe'),
      env: { NODE_ENV: 'production' }
    },
    {
      name: 'PosNetX-Frontend',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      cwd: './frontend',
      interpreter: path.join(__dirname, 'node/node-x64/node.exe'),
      env: { NODE_ENV: 'production' }
    }
  ]
};
"@
[System.IO.File]::WriteAllText((Join-Path $deployDir "ecosystem.config.js"), $eco, [System.Text.Encoding]::UTF8)

Set-Location $rootDir
Write-Host "`nIslem tamamlandi. Gizli (Bytecode) Deploy klasorunuz hazir!" -ForegroundColor Green
