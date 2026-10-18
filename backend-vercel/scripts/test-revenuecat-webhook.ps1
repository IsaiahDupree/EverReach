$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "RevenueCat Webhook E2E Tests" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:API_BASE = "https://ever-reach-be.vercel.app"
$env:REVENUECAT_WEBHOOK_SECRET = $env:REVENUECAT_WEBHOOK_SECRET ?? "test_secret_key_12345"
$env:TEST_USER_ID = "test-user-" + (Get-Date).Ticks

Write-Host "API Base: $env:API_BASE" -ForegroundColor Gray
Write-Host "Test User: $env:TEST_USER_ID" -ForegroundColor Gray
Write-Host ""

# Run tests
node test/revenuecat-webhook.mjs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "✅ All Tests Passed!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "❌ Some Tests Failed" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}
