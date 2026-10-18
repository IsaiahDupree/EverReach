# Run Tests for Recent Backend Features
# Tests: User Bio + Contact Photo Re-hosting

Write-Host "🧪 Running tests for recent backend features..." -ForegroundColor Cyan
Write-Host ""

# Check if in correct directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Must run from backend-vercel directory" -ForegroundColor Red
    exit 1
}

# Set test environment
$env:NODE_ENV = "test"

Write-Host "📋 Test Suite: Recent Backend Features" -ForegroundColor Green
Write-Host "  - User Bio API" -ForegroundColor Yellow
Write-Host "  - Contact Photo Re-hosting" -ForegroundColor Yellow
Write-Host ""

# Run User Bio tests
Write-Host "🧪 Running User Bio Tests..." -ForegroundColor Cyan
npm test -- __tests__/api/user-bio.test.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ User Bio tests failed" -ForegroundColor Red
    $bioFailed = $true
} else {
    Write-Host "✅ User Bio tests passed" -ForegroundColor Green
}

Write-Host ""

# Run Contact Photo tests
Write-Host "🧪 Running Contact Photo Jobs Tests..." -ForegroundColor Cyan
npm test -- __tests__/api/contact-photo-jobs.test.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Contact Photo Jobs tests failed" -ForegroundColor Red
    $photoFailed = $true
} else {
    Write-Host "✅ Contact Photo Jobs tests passed" -ForegroundColor Green
}

Write-Host ""
Write-Host "📊 Test Summary" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan

if ($bioFailed -or $photoFailed) {
    Write-Host ""
    if ($bioFailed) {
        Write-Host "❌ User Bio: FAILED" -ForegroundColor Red
    } else {
        Write-Host "✅ User Bio: PASSED" -ForegroundColor Green
    }
    
    if ($photoFailed) {
        Write-Host "❌ Contact Photo Jobs: FAILED" -ForegroundColor Red
    } else {
        Write-Host "✅ Contact Photo Jobs: PASSED" -ForegroundColor Green
    }
    
    Write-Host ""
    Write-Host "❌ Some tests failed. Please review errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host ""
    Write-Host "✅ User Bio: PASSED" -ForegroundColor Green
    Write-Host "✅ Contact Photo Jobs: PASSED" -ForegroundColor Green
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
    exit 0
}
