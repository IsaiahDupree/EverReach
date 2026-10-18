$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Run E2E User Profile Journey Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if JWT file exists
if (-not (Test-Path "test-jwt.txt")) {
    Write-Host "❌ test-jwt.txt not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Run this first to get JWT:" -ForegroundColor Yellow
    Write-Host "  node scripts/get-auth-token.mjs" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Load JWT from file
$jwt = Get-Content "test-jwt.txt" -Raw
$env:TEST_JWT = $jwt.Trim()
$env:API_BASE = "https://ever-reach-be.vercel.app"

Write-Host "✅ JWT loaded from test-jwt.txt" -ForegroundColor Green
Write-Host "✅ API_BASE: $env:API_BASE" -ForegroundColor Green
Write-Host ""

# Run E2E test
node test/e2e-user-profile-journey.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ All E2E Tests Passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed" -ForegroundColor Red
    exit 1
}
