$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "File CRUD E2E Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:API_BASE = "https://ever-reach-be.vercel.app"

# Get JWT token from file or environment
if (Test-Path "test-token.txt") {
    $env:TEST_JWT = Get-Content "test-token.txt" -Raw
    $env:TEST_JWT = $env:TEST_JWT.Trim()
    Write-Host "✓ JWT token loaded from test-token.txt" -ForegroundColor Green
} elseif ($env:TEST_JWT) {
    Write-Host "✓ Using TEST_JWT from environment" -ForegroundColor Green
} else {
    Write-Host "❌ No JWT token found. Set TEST_JWT env var or create test-token.txt" -ForegroundColor Red
    exit 1
}

Write-Host "API Base: $env:API_BASE" -ForegroundColor Gray
Write-Host ""

# Run tests
node test/file-crud.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ All File CRUD Tests Passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Some Tests Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
