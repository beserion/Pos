Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# =============================================
# 0. CONFIG OKUMA
# =============================================
$rootDir = $PSScriptRoot
$configPath = Join-Path $rootDir "frontend\electron\config.json"
$config = @{}
if (Test-Path $configPath) {
    $config = Get-Content $configPath -Raw | ConvertFrom-Json
}

# =============================================
# GUI FORM - Musteri Konfigurasyon
# =============================================
$form = New-Object System.Windows.Forms.Form
$form.Text = "PosNetX - Profesyonel Kurulum Paketleyici"
$form.Size = New-Object System.Drawing.Size(600, 850)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = "FixedDialog"
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(18, 18, 30)

function New-Label($text, $x, $y, $w = 540) {
    $lbl = New-Object System.Windows.Forms.Label
    $lbl.Text = $text
    $lbl.Location = New-Object System.Drawing.Point($x, $y)
    $lbl.Size = New-Object System.Drawing.Size($w, 20)
    $lbl.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 200)
    $lbl.Font = New-Object System.Drawing.Font("Segoe UI", 9)
    return $lbl
}

function New-TextBox($x, $y, $default, $w = 540, $isPassword = $false) {
    $tb = New-Object System.Windows.Forms.TextBox
    $tb.Location = New-Object System.Drawing.Point($x, $y)
    $tb.Size = New-Object System.Drawing.Size($w, 28)
    $tb.Text = $default
    $tb.BackColor = [System.Drawing.Color]::FromArgb(35, 35, 55)
    $tb.ForeColor = [System.Drawing.Color]::FromArgb(230, 230, 255)
    $tb.BorderStyle = "FixedSingle"
    $tb.Font = New-Object System.Drawing.Font("Segoe UI", 10)
    if ($isPassword) { $tb.PasswordChar = '*' }
    return $tb
}

$title = New-Object System.Windows.Forms.Label
$title.Text = "PosNetX Musteri Paketleyici"
$title.Location = New-Object System.Drawing.Point(20, 15)
$title.Size = New-Object System.Drawing.Size(540, 30)
$title.ForeColor = [System.Drawing.Color]::FromArgb(120, 180, 255)
$title.Font = New-Object System.Drawing.Font("Segoe UI", 14, [System.Drawing.FontStyle]::Bold)
$form.Controls.Add($title)

$y = 55
# --- BOLUM 1: MUSTERI VE DB ---
$form.Controls.Add((New-Label "Musteri Adi" 20 $y))
$tbCustomer = New-TextBox 20 ($y + 20) ""
$form.Controls.Add($tbCustomer)

$y += 55
$form.Controls.Add((New-Label "DB Host" 20 $y 260))
$tbHost = New-TextBox 20 ($y + 20) $config.dbHost 260
$form.Controls.Add($tbHost)

$form.Controls.Add((New-Label "DB Port" 300 $y 260))
$tbDbPort = New-TextBox 300 ($y + 20) $config.dbPort 260
$form.Controls.Add($tbDbPort)

$y += 55
$form.Controls.Add((New-Label "DB Kullanici" 20 $y 260))
$tbDbUser = New-TextBox 20 ($y + 20) $config.dbUsername 260
$form.Controls.Add($tbDbUser)

$form.Controls.Add((New-Label "DB Sifre" 300 $y 260))
$tbDbPass = New-TextBox 300 ($y + 20) $config.dbPassword 260 $true
$form.Controls.Add($tbDbPass)

$y += 55
$form.Controls.Add((New-Label "DB Ismi" 20 $y))
$tbDbName = New-TextBox 20 ($y + 20) $config.dbDatabase
$form.Controls.Add($tbDbName)

# --- BOLUM 2: URL VE PORTLAR ---
$y += 65
$form.Controls.Add((New-Label "Panel URL" 20 $y 260))
$tbPanelUrl = New-TextBox 20 ($y + 20) $config.panelUrl 260
$form.Controls.Add($tbPanelUrl)

$form.Controls.Add((New-Label "API URL (Backend API)" 300 $y 260))
$tbApiUrl = New-TextBox 300 ($y + 20) $config.apiUrl 260
$form.Controls.Add($tbApiUrl)

$y += 55
$form.Controls.Add((New-Label "Main Backend Port" 20 $y 120))
$tbMainBackPort = New-TextBox 20 ($y + 20) $config.backendPort 120
$form.Controls.Add($tbMainBackPort)

$form.Controls.Add((New-Label "Main Front Port" 160 $y 120))
$tbMainFrontPort = New-TextBox 160 ($y + 20) $config.frontendPort 120
$form.Controls.Add($tbMainFrontPort)

$form.Controls.Add((New-Label "Patron Port" 300 $y 120))
$tbPatronPort = New-TextBox 300 ($y + 20) "3100" 120
$form.Controls.Add($tbPatronPort)

$form.Controls.Add((New-Label "Garson Port" 440 $y 120))
$tbGarsonPort = New-TextBox 440 ($y + 20) "5173" 120
$form.Controls.Add($tbGarsonPort)

# --- BOLUM 3: LISANS VE ANAHTARLAR ---
$y += 65
$form.Controls.Add((New-Label "License Encryption Key" 20 $y))
$tbLicEnc = New-TextBox 20 ($y + 20) $config.licenseEncryptionKey
$form.Controls.Add($tbLicEnc)

$y += 55
$form.Controls.Add((New-Label "License HMAC Key" 20 $y))
$tbLicHmac = New-TextBox 20 ($y + 20) $config.licenseHmacKey
$form.Controls.Add($tbLicHmac)

$y += 55
$form.Controls.Add((New-Label "License API Key" 20 $y))
$tbLicApi = New-TextBox 20 ($y + 20) $config.licenseApiKey
$form.Controls.Add($tbLicApi)

$y += 55
$form.Controls.Add((New-Label "Panel JWT Secret" 20 $y))
$tbJwt = New-TextBox 20 ($y + 20) $config.panelJwtSecret
$form.Controls.Add($tbJwt)

$y += 55
$form.Controls.Add((New-Label "VAPID Public Key" 20 $y))
$tbVapPub = New-TextBox 20 ($y + 20) $config.vapidPublicKey
$form.Controls.Add($tbVapPub)

$y += 55
$form.Controls.Add((New-Label "VAPID Private Key" 20 $y))
$tbVapPriv = New-TextBox 20 ($y + 20) $config.vapidPrivateKey
$form.Controls.Add($tbVapPriv)

# --- BUTON ---
$btn = New-Object System.Windows.Forms.Button
$btn.Text = "Paketlemeyi Baslat"
$btn.Location = New-Object System.Drawing.Point(20, 750)
$btn.Size = New-Object System.Drawing.Size(540, 45)
$btn.BackColor = [System.Drawing.Color]::FromArgb(60, 120, 255)
$btn.ForeColor = [System.Drawing.Color]::White
$btn.FlatStyle = "Flat"
$btn.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$btn.Cursor = [System.Windows.Forms.Cursors]::Hand
$form.Controls.Add($btn)

$script:dialogResult = $null
$btn.Add_Click({
    if ([string]::IsNullOrWhiteSpace($tbCustomer.Text)) {
        [System.Windows.Forms.MessageBox]::Show("Musteri adi bos birakilamaz!", "Hata", "OK", "Warning"); return
    }
    $script:dialogResult = "OK"
    $form.Close()
})

$form.Add_FormClosing({
    if ($script:dialogResult -ne "OK") { exit 0 }
})

$form.ShowDialog() | Out-Null

# Değerleri Al
$customerName = $tbCustomer.Text.Trim() -replace '\s+', '_'
$dbHost       = "localhost\\SQLEXPRESS"
$dbPort       = "1433"
$dbUser       = "sa"
$dbPass       = "posnetx"
$dbName       = "Posnetx"
$panelUrl     = $tbPanelUrl.Text.Trim()
$apiUrl       = $tbApiUrl.Text.Trim()
$mainBackPort = $tbMainBackPort.Text.Trim()
$mainFrontPort= $tbMainFrontPort.Text.Trim()
$bossPort     = $tbPatronPort.Text.Trim()
$waiterPort   = $tbGarsonPort.Text.Trim()
$licEnc       = $tbLicEnc.Text.Trim()
$licHmac      = $tbLicHmac.Text.Trim()
$licApi       = $tbLicApi.Text.Trim()
$jwtSecret    = $tbJwt.Text.Trim()
$vapPub       = $tbVapPub.Text.Trim()
$vapPriv      = $tbVapPriv.Text.Trim()

# =============================================
# 1. CONFIG GUNCELLEME
# =============================================
$config.dbHost = $dbHost
$config.dbPort = [int]$dbPort
$config.dbUsername = $dbUser
$config.dbPassword = $dbPass
$config.dbDatabase = $dbName
$config.panelUrl = $panelUrl
$config.apiUrl = $apiUrl
$config.backendPort = [int]$mainBackPort
$config.frontendPort = [int]$mainFrontPort
$config.licenseEncryptionKey = $licEnc
$config.licenseHmacKey = $licHmac
$config.licenseApiKey = $licApi
$config.panelJwtSecret = $jwtSecret
$config.vapidPublicKey = $vapPub
$config.vapidPrivateKey = $vapPriv

$configJson = $config | ConvertTo-Json -Depth 10
[System.IO.File]::WriteAllText($configPath, $configJson, [System.Text.Encoding]::UTF8)
Write-Host "[config.json] Guncellendi." -ForegroundColor Green

# =============================================
# 2. PAKETLEME HAZIRLIK (Build EXE Dahil)
# =============================================
$ErrorActionPreference = "Stop"
Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "  PosNetX Komple Paketleyici: $customerName" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan

# --- KRITIK ADIM: Ana Programi (Electron) Yeni Bilgilerle Derle ---
Write-Host "[0/6] Ana program (.exe) yeni bilgilerle derleniyor..." -ForegroundColor Yellow
Set-Location $rootDir

# Frontend build'i icin API URL'yi ortam degiskenine ve .env.production'a yaz
# NEXT_PUBLIC_* degiskenleri build-time'da bundle'a gomiluyor;
# bu satirlar olmadan config.json degistirmek bundle'daki URL'yi degistirmez.
$env:NEXT_PUBLIC_API_URL = $apiUrl
$frontendEnvPath = Join-Path $rootDir "frontend\.env.production"
[System.IO.File]::WriteAllText($frontendEnvPath, "NEXT_PUBLIC_API_URL=$apiUrl`n", [System.Text.Encoding]::UTF8)
Write-Host "  -> Frontend API URL build icin ayarlandi: $apiUrl" -ForegroundColor DarkGreen

& .\build-exe.ps1
if ($LASTEXITCODE -ne 0) { Write-Error "build-exe.ps1 basarisiz!"; exit 1 }

# .env.production'u temizle (gelistirme ortamini kirletmesin)
if (Test-Path $frontendEnvPath) { Remove-Item $frontendEnvPath -Force }

$deployDir = Join-Path $rootDir "deploy-webapps"
if (Test-Path $deployDir) { Remove-Item -Path $deployDir -Recurse -Force }
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null

# =============================================
# 3. Patron (bossposnetx)
# =============================================
Write-Host "[1/6] Patron (bossposnetx) derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "bossposnetx")
npm run build
$dbHostEscaped = $dbHost
$envPrepend = @"
process.env.DB_HOST = '$dbHostEscaped';
process.env.DB_PORT = '$dbPort';
process.env.DB_USERNAME = '$dbUser';
process.env.DB_PASSWORD = '$dbPass';
process.env.DB_DATABASE = '$dbName';
process.env.PORT = '$bossPort';
process.env.NODE_ENV = 'production';
"@
& npx esbuild server.ts --bundle --platform=node --packages=external --minify --outfile=server.cjs
$serverCjsPath = Join-Path $rootDir "bossposnetx\server.cjs"
$content = [System.IO.File]::ReadAllText($serverCjsPath)
[System.IO.File]::WriteAllText($serverCjsPath, $envPrepend + "`n" + $content)

$bossDeploy = Join-Path $deployDir "bossposnetx"
New-Item -ItemType Directory -Path $bossDeploy -Force | Out-Null
Copy-Item -Path "dist", "node_modules", "package.json", "server.cjs" -Destination $bossDeploy -Recurse -Force

# =============================================
# 4. Garson (posnetx-waiter)
# =============================================
Write-Host "[2/6] Garson (posnetx-waiter) derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "posnetx-waiter")

$waiterEnvPath = Join-Path $rootDir "posnetx-waiter\.env"
[System.IO.File]::WriteAllText($waiterEnvPath, "VITE_API_BASE_URL=$apiUrl`n")
npm run build
$waiterDeploy = Join-Path $deployDir "posnetx-waiter"
New-Item -ItemType Directory -Path $waiterDeploy -Force | Out-Null
Copy-Item -Path "dist", "node_modules", "package.json" -Destination $waiterDeploy -Recurse -Force
Remove-Item -Path $waiterEnvPath -Force

# =============================================
# 5. Core Backend
# =============================================
Write-Host "[3/6] Core Backend derleniyor..." -ForegroundColor Yellow
Set-Location (Join-Path $rootDir "backend")
npm run build
# Backend'e de env gomelim (Opsiyonel ama kullanici istedigi icin)
$backEnvPrepend = @"
process.env.DB_HOST = '$dbHostEscaped';
process.env.DB_PORT = '$dbPort';
process.env.DB_USERNAME = '$dbUser';
process.env.DB_PASSWORD = '$dbPass';
process.env.DB_DATABASE = '$dbName';
process.env.PORT = '$mainBackPort';
process.env.PANEL_URL = '$panelUrl';
process.env.LICENSE_ENCRYPTION_KEY = '$licEnc';
process.env.LICENSE_HMAC_KEY = '$licHmac';
process.env.PANEL_JWT_SECRET = '$jwtSecret';
process.env.LICENSE_API_KEY = '$licApi';
process.env.VAPID_PUBLIC_KEY = '$vapPub';
process.env.VAPID_PRIVATE_KEY = '$vapPriv';
process.env.NODE_ENV = 'production';
"@
# NestJS main.js dosyasina gomuyoruz
$mainJsPath = Join-Path $rootDir "backend\dist\src\main.js"
$content = [System.IO.File]::ReadAllText($mainJsPath)
[System.IO.File]::WriteAllText($mainJsPath, $backEnvPrepend + "`n" + $content)

$backDeploy = Join-Path $deployDir "backend"
New-Item -ItemType Directory -Path $backDeploy -Force | Out-Null
Copy-Item -Path "dist", "node_modules", "package.json" -Destination $backDeploy -Recurse -Force

# =============================================
# 6. Node.js & PM2 (Hem 32 hem 64 bit paketliyoruz)
# =============================================
Write-Host "[4/6] Node.js & PM2 hazirlaniyor..." -ForegroundColor Yellow
$deployNodeDir = Join-Path $deployDir "node"
New-Item -ItemType Directory -Path $deployNodeDir -Force | Out-Null

# 32-bit Node (Backend icin)
Copy-Item -Path (Join-Path $rootDir "node-ia32\node.exe") -Destination (Join-Path $deployNodeDir "node-ia32.exe") -Force
# 64-bit Node (Digerleri ve PM2 icin)
Copy-Item -Path (Join-Path $rootDir "node-x64\node.exe") -Destination (Join-Path $deployNodeDir "node-x64.exe") -Force
# Varsayilan node.exe (Setup ve PM2 ana süreci icin)
Copy-Item -Path (Join-Path $rootDir "node-x64\node.exe") -Destination (Join-Path $deployNodeDir "node.exe") -Force

$toolsDir = Join-Path $deployDir "tools"
New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
Set-Location $toolsDir
npm init -y | Out-Null
npm install pm2 --save --no-fund --no-audit

# =============================================
# 7. Kurulum Dosyalari (Ecosystem + Setup)
# =============================================
Write-Host "[5/6] Kurulum dosyalari..." -ForegroundColor Yellow
Set-Location $deployDir

$ecosystem = @"
const path = require('path');
const root = process.cwd();
const node32 = path.join(root, 'node', 'node-ia32.exe');
const node64 = path.join(root, 'node', 'node-x64.exe');

module.exports = {
  apps: [
    {
      name: 'BackendApp',
      script: './backend/dist/src/main.js',
      cwd: './backend',
      interpreter: node32,
      env: { 
        NODE_ENV: 'production', 
        PORT: $mainBackPort,
        DB_HOST: '$dbHostEscaped',
        DB_PORT: '$dbPort',
        DB_USERNAME: '$dbUser',
        DB_PASSWORD: '$dbPass',
        DB_DATABASE: '$dbName'
      }
    },
    {
      name: 'PatronApp',
      script: './bossposnetx/server.cjs',
      cwd: './bossposnetx',
      interpreter: node64,
      env: { NODE_ENV: 'production', PORT: $bossPort }
    },
    {
      name: 'GarsonApp',
      script: './node_modules/vite/bin/vite.js',
      args: ['preview', '--port', 5173, '--host'],
      cwd: './posnetx-waiter',
      interpreter: node64,
      env: { NODE_ENV: 'production' }
    }
  ]
};
"@
[System.IO.File]::WriteAllText((Join-Path $deployDir "ecosystem.config.cjs"), $ecosystem)

$setup = @'
$rootDir   = $PSScriptRoot
$nodePath  = Join-Path $rootDir "node"
$nodeExe   = Join-Path $nodePath "node.exe"
$pm2       = Join-Path $rootDir "tools\node_modules\pm2\bin\pm2"
Set-Location $rootDir
$env:PATH = "$nodePath;" + $env:PATH

# PM2'yi arka planda baslat (Wait kullanma ki yukleyici takilmasin)
Start-Process -FilePath $nodeExe -ArgumentList @($pm2,"start","ecosystem.config.cjs") -WorkingDirectory $rootDir -NoNewWindow
Start-Sleep -Seconds 5
Start-Process -FilePath $nodeExe -ArgumentList @($pm2,"save") -WorkingDirectory $rootDir -NoNewWindow
Start-Sleep -Seconds 2

# Masaustu Kisayollar
$ws = New-Object -comObject WScript.Shell
$desk = [Environment]::GetFolderPath('Desktop')
$sc1 = $ws.CreateShortcut((Join-Path $desk "Patron POS.lnk"))
$sc1.TargetPath = "chrome.exe"; $sc1.Arguments = "--app=http://localhost:BOSSPORT"; $sc1.Save()
$sc2 = $ws.CreateShortcut((Join-Path $desk "Garson POS.lnk"))
$sc2.TargetPath = "chrome.exe"; $sc2.Arguments = "--app=http://localhost:WAITERPORT"; $sc2.Save()
'@
$setup = $setup -replace 'BOSSPORT', $bossPort -replace 'WAITERPORT', $waiterPort
[System.IO.File]::WriteAllText((Join-Path $deployDir "setup.ps1"), $setup)

# Config.json'u kopyala (Electron icin)
Copy-Item -Path $configPath -Destination $deployDir -Force

# Ana Uygulama EXE'sini kopyala
Write-Host "[5.5/6] Ana program EXE araniyor..." -ForegroundColor DarkGray
$exeDir = Join-Path $rootDir "frontend\dist-electron"
if (Test-Path $exeDir) {
    $exeFile = Get-ChildItem -Path $exeDir -Filter "*.exe" | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    if ($exeFile) {
        Copy-Item -Path $exeFile.FullName -Destination $deployDir -Force
        Write-Host "  -> $($exeFile.Name) kopyalandi." -ForegroundColor DarkGray
    }
}

# =============================================
# 8. Master Installer (NSIS)
# =============================================
Write-Host "[6/6] Master Installer ($customerName) olusturuluyor..." -ForegroundColor Yellow
$nsisExe = Get-ChildItem -Path $env:LOCALAPPDATA\electron-builder -Filter "makensis.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
$outName = "PosNetX_Setup_$customerName.exe"

if ($nsisExe) {
    $nsiPath = Join-Path $rootDir "installer.nsi"
    $nsi = @"
OutFile "$outName"
InstallDir "C:\PosNetX"
RequestExecutionLevel admin
ShowInstDetails show

Section "Main"
  # Önceki kurulumdan kalan ve dosyaları kilitleyen süreçleri temizle
  ExecWait 'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Stop-Process -Name node -Force -ErrorAction SilentlyContinue"'
  
  # ESKI AYARLARI TEMIZLE (AppData altindaki cache/config'i sil ki yeni bilgiler gelsin)
  RMDir /r "$APPDATA\PosNetX"
  RMDir /r "$APPDATA\frontend"
  
  Sleep 2000

  SetOutPath `$INSTDIR
  File /r "deploy-webapps\*"
  
  # 1. PM2 ve Servis Ayarlarini yap (setup.ps1)
  ExecWait 'powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "`$INSTDIR\setup.ps1"'
  
  # 2. Ana Uygulama (Electron) Setup'ini bul ve calistir
  FindFirst `$0 `$1 "`$INSTDIR\PosNetX Setup*.exe"
  StrCmp `$1 "" done
    ExecWait '"`$INSTDIR\`$1"'
  done:
  FindClose `$0
SectionEnd
"@
    [System.IO.File]::WriteAllText($nsiPath, $nsi, [System.Text.Encoding]::UTF8)
    Set-Location $rootDir
    Start-Process -FilePath $nsisExe.FullName -ArgumentList "`"$nsiPath`"" -Wait -NoNewWindow
    
    if (Test-Path (Join-Path $rootDir $outName)) {
        Write-Host "Tamamlandi! Musteriye gondereceginiz dosya: $outName" -ForegroundColor Green
        Remove-Item -Path $nsiPath -Force
    } else {
        Write-Host "! EXE olusturulamadi." -ForegroundColor Red
    }
} else {
    Write-Host "! NSIS (makensis.exe) bulunamadi!" -ForegroundColor Red
}
