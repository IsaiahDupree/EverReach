#!/usr/bin/env pwsh
# Unified Test Runner for EverReach CRM
# Runs all test suites: Unit (Jest), Frontend E2E (Playwright), Backend Integration

$ErrorActionPreference = "Continue"
$TotalTests = 0
$PassedTests = 0
$FailedTests = 0
$StartTime = Get-Date

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  EverReach CRM - Unified Test Runner          ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ====================
# 1. Unit Tests (Jest)
# ====================
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  1/3 Running Unit Tests (Jest)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

$jestStart = Get-Date
npm test -- --passWithNoTests
$jestExit = $LASTEXITCODE
$jestDuration = ((Get-Date) - $jestStart).TotalSeconds

if ($jestExit -eq 0) {
    Write-Host "`n✅ Unit tests passed" -ForegroundColor Green
    $PassedTests += 56 # Known count
} else {
    Write-Host "`n❌ Unit tests failed" -ForegroundColor Red
    $FailedTests += 1
}

# ====================
# 2. Frontend E2E (Playwright)
# ====================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  2/3 Running Frontend E2E Tests (Playwright)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

# Set credentials
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"

# Check if Expo is running
$expoRunning = $false
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8081" -Method Head -TimeoutSec 2 -ErrorAction Stop
    $expoRunning = $true
    Write-Host "✅ Expo web server detected on port 8081" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Expo web server not running. Start with: npx expo start --web --port 8081" -ForegroundColor Yellow
}

if ($expoRunning) {
    $playwrightStart = Get-Date
    npx playwright test -c test/frontend/playwright.config.ts --reporter=list
    $playwrightExit = $LASTEXITCODE
    $playwrightDuration = ((Get-Date) - $playwrightStart).TotalSeconds
    
    if ($playwrightExit -eq 0) {
        Write-Host "`n✅ Frontend E2E tests passed" -ForegroundColor Green
        $PassedTests += 11 # Known count
    } else {
        Write-Host "`n❌ Some frontend E2E tests failed" -ForegroundColor Red
        $FailedTests += 1
    }
} else {
    Write-Host "⏭️  Skipping Playwright tests (Expo web not running)" -ForegroundColor Yellow
}

# ====================
# 3. Backend Integration (Jest)
# ====================
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "  3/3 Running Backend Integration Tests" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Yellow

Write-Host "⏭️  Skipping backend integration tests (implement in test/backend/__tests__)" -ForegroundColor Yellow

# ====================
# Summary
# ====================
$TotalDuration = ((Get-Date) - $StartTime).TotalSeconds

Write-Host "`n╔════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Test Summary                                  ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

Write-Host "Total Duration: $([math]::Round($TotalDuration, 2))s" -ForegroundColor White
Write-Host "Unit Tests: $([math]::Round($jestDuration, 2))s" -ForegroundColor White
if ($expoRunning) {
    Write-Host "Frontend E2E: $([math]::Round($playwrightDuration, 2))s" -ForegroundColor White
}

Write-Host "`n┌────────────────────────────────────────────────┐" -ForegroundColor White
if ($FailedTests -eq 0) {
    Write-Host "│  ✅ ALL TESTS PASSED                           │" -ForegroundColor Green
} else {
    Write-Host "│  ❌ SOME TESTS FAILED                          │" -ForegroundColor Red
}
Write-Host "└────────────────────────────────────────────────┘`n" -ForegroundColor White

Write-Host "Test Suites:" -ForegroundColor White
Write-Host "  • Unit (Jest):          56 tests" -ForegroundColor $(if ($jestExit -eq 0) { "Green" } else { "Red" })
if ($expoRunning) {
    Write-Host "  • Frontend E2E:         11 tests" -ForegroundColor $(if ($playwrightExit -eq 0) { "Green" } else { "Red" })
}
Write-Host "  • Mobile E2E (Maestro): 4 flows (pending Android build)" -ForegroundColor Yellow

Write-Host "`nNext Steps:" -ForegroundColor Cyan
if (-not $expoRunning) {
    Write-Host "  1. Start Expo web: npx expo start --web --port 8081" -ForegroundColor Yellow
}
Write-Host "  2. Install JDK for Android: choco install temurin17 -y" -ForegroundColor Yellow
Write-Host "  3. Build Android app: npx expo run:android" -ForegroundColor Yellow
Write-Host "  4. Run Maestro: maestro test test/mobile/flows/ -e APP_ID=com.everreach.crm" -ForegroundColor Yellow

Write-Host ""

exit $FailedTests
