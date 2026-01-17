# Automated E2E Tests for Deployed Vercel App
# Tests the production deployment with real credentials

param(
    [string]$Url = "https://e2e-qkxs7ll7t-isaiahduprees-projects.vercel.app"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  E2E Testing Deployed Web App" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set environment variables for authentication
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "Frogger12"
$env:WEB_BASE_URL = $Url

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Target URL: $Url" -ForegroundColor White
Write-Host "  Test User:  $env:TEST_EMAIL" -ForegroundColor White
Write-Host ""

# Check if Playwright is installed
Write-Host "Checking Playwright installation..." -ForegroundColor Yellow
$playwrightCheck = npx playwright --version 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "Installing Playwright browsers..." -ForegroundColor Yellow
    npx playwright install chromium
}

Write-Host ""
Write-Host "Running E2E tests against deployed app..." -ForegroundColor Green
Write-Host ""

# Run Playwright tests
npx playwright test -c test/frontend/playwright.config.ts --reporter=list

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan

if ($exitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check output above." -ForegroundColor Red
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Optional: Show test results location
if (Test-Path "test-results") {
    Write-Host "Test results saved in: test-results/" -ForegroundColor Yellow
}

exit $exitCode
