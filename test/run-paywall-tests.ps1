# Run Paywall & Feature Requests Tests
# Usage: .\test\run-paywall-tests.ps1

Write-Host "🧪 Running Paywall & Feature Requests Tests..." -ForegroundColor Cyan
Write-Host ""

# Set backend URL
$env:BACKEND_URL = "https://ever-reach-be.vercel.app"

# Run tests
node test/paywall-and-feature-requests.test.mjs

$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Some tests failed. Check output above." -ForegroundColor Red
}

exit $exitCode
