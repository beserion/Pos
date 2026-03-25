$ErrorActionPreference = "Stop"

$RootDir = "D:\GitHub\POSAPP"
$PublishDir = Join-Path $RootDir "publish"
$BackendDir = Join-Path $RootDir "backend"
$FrontendDir = Join-Path $RootDir "frontend"

$PublishBackendDir = Join-Path $PublishDir "backend"
$PublishFrontendDir = Join-Path $PublishDir "frontend"

Write-Host "Creating Publish Directories..." -ForegroundColor Cyan
if (Test-Path $PublishDir) {
    Remove-Item $PublishDir -Recurse -Force
}
New-Item -Path $PublishBackendDir -ItemType Directory -Force | Out-Null
New-Item -Path $PublishFrontendDir -ItemType Directory -Force | Out-Null

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "BUILDING BACKEND" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Set-Location $BackendDir
Write-Host "Running npm run build for backend..."
npm run build 

Write-Host "Copying Backend Artifacts to Publish Directory..."
Copy-Item (Join-Path $BackendDir "dist") -Destination $PublishBackendDir -Recurse -Force
Copy-Item (Join-Path $BackendDir "package.json") -Destination $PublishBackendDir -Force
if (Test-Path (Join-Path $BackendDir ".env")) {
    Copy-Item (Join-Path $BackendDir ".env") -Destination $PublishBackendDir -Force
}

Write-Host "Installing production dependencies for published backend..."
Set-Location $PublishBackendDir
npm install --omit=dev --silent

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "BUILDING FRONTEND (STANDALONE)" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Cyan
Set-Location $FrontendDir
Write-Host "Running npm run build for frontend..."
npm run build 

Write-Host "Copying Frontend Artifacts to Publish Directory..."
# Next.js Standalone Mode: .next/standalone varsa onu kullan (webpack/legacy)
$StandaloneDir = Join-Path $FrontendDir ".next\standalone"
if (Test-Path $StandaloneDir) {
    Write-Host "Standalone mode detected. Copying standalone output..."
    Copy-Item "$StandaloneDir\*" -Destination $PublishFrontendDir -Recurse -Force
    $FrontendStaticDest = Join-Path $PublishFrontendDir ".next\static"
    New-Item -Path $FrontendStaticDest -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $FrontendDir ".next\static\*") -Destination $FrontendStaticDest -Recurse -Force
    if (Test-Path (Join-Path $FrontendDir "public")) {
        Copy-Item (Join-Path $FrontendDir "public") -Destination $PublishFrontendDir -Recurse -Force
    }
}
else {
    # Turbopack / Next.js 16+ fallback: .next klasörü + package.json kopyala, sunucuda npm install
    Write-Host "Standalone not found. Using full .next copy (Turbopack mode)..." -ForegroundColor Yellow
    Copy-Item (Join-Path $FrontendDir ".next") -Destination $PublishFrontendDir -Recurse -Force
    Copy-Item (Join-Path $FrontendDir "package.json") -Destination $PublishFrontendDir -Force
    if (Test-Path (Join-Path $FrontendDir "package-lock.json")) {
        Copy-Item (Join-Path $FrontendDir "package-lock.json") -Destination $PublishFrontendDir -Force
    }
    if (Test-Path (Join-Path $FrontendDir "next.config.ts")) {
        Copy-Item (Join-Path $FrontendDir "next.config.ts") -Destination $PublishFrontendDir -Force
    }
    if (Test-Path (Join-Path $FrontendDir "public")) {
        Copy-Item (Join-Path $FrontendDir "public") -Destination $PublishFrontendDir -Recurse -Force
    }
    Write-Host "Installing production dependencies for frontend..."
    Set-Location $PublishFrontendDir
    npm install --omit=dev --silent
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PUBLISH COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Publish location: $PublishDir" -ForegroundColor Cyan
Write-Host "Instructions:"
Write-Host "  Backend: cd publish\backend && node dist/main.js"
Write-Host "  Frontend: cd publish\frontend && npm run start"
Write-Host "====================================" -ForegroundColor Cyan
