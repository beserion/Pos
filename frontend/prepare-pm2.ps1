$ErrorActionPreference = "Stop"
Set-Location "c:\Github\Pos\frontend"

Write-Host ">>> Frontend derleniyor..." -ForegroundColor Cyan
npm run build

Write-Host ">>> Dağıtım klasörü hazırlanıyor (dist-pm2)..." -ForegroundColor Cyan
$distDir = "c:\Github\Pos\frontend\dist-pm2"
if (Test-Path $distDir) { Remove-Item -Path $distDir -Recurse -Force }
New-Item -ItemType Directory -Path $distDir -Force | Out-Null

# Standalone dosyalarını kopyala
Write-Host "  -> Standalone dosyaları kopyalanıyor..." -ForegroundColor DarkGray
Copy-Item -Path ".next\standalone\*" -Destination $distDir -Recurse -Force

# Public ve Static klasörlerini standalone içine kopyala (Next.js gereksinimi)
Write-Host "  -> Public ve Static klasörleri kopyalanıyor..." -ForegroundColor DarkGray
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination (Join-Path $distDir "public") -Recurse -Force
}
if (Test-Path ".next\static") {
    $staticTarget = New-Item -ItemType Directory -Path (Join-Path $distDir ".next\static") -Force
    Copy-Item -Path ".next\static\*" -Destination $staticTarget.FullName -Recurse -Force
}

Write-Host ""
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  Frontend Başarıyla Hazırlandı!" -ForegroundColor Green
Write-Host "  Konum: $distDir" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Green
Write-Host "  PM2 ile başlatmak için şu komutu kullanın:" -ForegroundColor Yellow
Write-Host "  cd $distDir" -ForegroundColor White
Write-Host "  pm2 start server.js --name 'Pos-Frontend' -- 3000" -ForegroundColor White
Write-Host "=====================================================" -ForegroundColor Green
