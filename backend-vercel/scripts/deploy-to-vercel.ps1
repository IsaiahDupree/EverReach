$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Deploy to Vercel" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if vercel CLI is installed
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install with:" -ForegroundColor Yellow
    Write-Host "  npm install -g vercel" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

Write-Host "✅ Vercel CLI found" -ForegroundColor Green
Write-Host ""

# Show current branch
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""

# Confirm deployment
Write-Host "This will deploy to Vercel from branch: $currentBranch" -ForegroundColor Yellow
$confirm = Read-Host "Continue? (y/n)"

if ($confirm -ne "y") {
    Write-Host "Deployment cancelled" -ForegroundColor Gray
    exit 0
}

Write-Host ""
Write-Host "Deploying..." -ForegroundColor Yellow
Write-Host ""

# Deploy to Vercel
& vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Deployment Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Verify deployment at https://ever-reach-be.vercel.app" -ForegroundColor Gray
    Write-Host "  2. Run smoke tests:" -ForegroundColor Gray
    Write-Host "     .\scripts\test-endpoints.ps1" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Deployment failed!" -ForegroundColor Red
    exit 1
}
