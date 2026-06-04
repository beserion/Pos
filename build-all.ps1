Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "   PosNetX - FULL BUILD AUTOMATION" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Backend Build
Write-Host "`n[1/4] Backend (NestJS) Derleniyor..." -ForegroundColor Yellow
Set-Location "C:\Github\Pos\backend"
npx -y @vercel/ncc build src/main.ts -o dist/bundle

# 2. Waiter (Garson) Build
Write-Host "`n[2/4] Waiter (Garson) PWA Derleniyor..." -ForegroundColor Yellow
Set-Location "C:\Github\Pos\posnetx-waiter"
..\node-x64\node.exe node_modules\vite\bin\vite.js build
Write-Host "Waiter dosyalari public icine kopyalaniyor..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "C:\Github\Pos\frontend\public\garson" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "C:\Github\Pos\frontend\public\garson" | Out-Null
Copy-Item -Path "C:\Github\Pos\posnetx-waiter\dist\*" -Destination "C:\Github\Pos\frontend\public\garson" -Recurse -Force

# 3. Boss (Patron) Build
Write-Host "`n[3/4] Boss (Patron) PWA Derleniyor..." -ForegroundColor Yellow
Set-Location "C:\Github\Pos\bossposnetx"
..\node-x64\node.exe node_modules\vite\bin\vite.js build
Write-Host "Boss express backend derleniyor (esbuild)..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "dist-server" -ErrorAction SilentlyContinue
npx -y esbuild server.ts --bundle --platform=node --target=node20 --external:vite --outfile=dist-server/server-bundle.cjs
Write-Host "Boss dosyalari public icine kopyalaniyor..." -ForegroundColor Cyan
Remove-Item -Recurse -Force "C:\Github\Pos\frontend\public\boss" -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force -Path "C:\Github\Pos\frontend\public\boss" | Out-Null
Copy-Item -Path "C:\Github\Pos\bossposnetx\dist\*" -Destination "C:\Github\Pos\frontend\public\boss" -Recurse -Force

# 4. Frontend & Electron Build
Write-Host "`n[4/4] Frontend & Electron Paketleniyor..." -ForegroundColor Yellow
Set-Location "C:\Github\Pos\frontend"
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
npm run electron:build

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   TUM ISLEMLER BASARIYLA TAMAMLANDI! " -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "Yeni .exe dosyaniz: C:\Github\Pos\frontend\dist-electron dizininde." -ForegroundColor White
