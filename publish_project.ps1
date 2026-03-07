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
# Next.js Standalone Mode copies node_modules and structural files into .next/standalone
$StandaloneDir = Join-Path $FrontendDir ".next\standalone"
if (Test-Path $StandaloneDir) {
    # Copy standalone folder contents
    Copy-Item "$StandaloneDir\*" -Destination $PublishFrontendDir -Recurse -Force
    # Copy missing static assets needed by standalone server
    $FrontendStaticDest = Join-Path $PublishFrontendDir ".next\static"
    New-Item -Path $FrontendStaticDest -ItemType Directory -Force | Out-Null
    Copy-Item (Join-Path $FrontendDir ".next\static\*") -Destination $FrontendStaticDest -Recurse -Force
    
    if (Test-Path (Join-Path $FrontendDir "public")) {
        Copy-Item (Join-Path $FrontendDir "public") -Destination $PublishFrontendDir -Recurse -Force
    }
} else {
    Write-Host "Warning: .next\standalone directory not found! Ensure output: 'standalone' is in next.config.ts" -ForegroundColor Yellow
}

Write-Host "====================================" -ForegroundColor Cyan
Write-Host "PUBLISH COMPLETED SUCCESSFULLY!" -ForegroundColor Green
Write-Host "Publish location: $PublishDir" -ForegroundColor Cyan
Write-Host "Instructions:"
Write-Host "  Backend: cd publish\backend && node dist/main.js"
Write-Host "  Frontend: cd publish\frontend && node server.js"
Write-Host "====================================" -ForegroundColor Cyan
