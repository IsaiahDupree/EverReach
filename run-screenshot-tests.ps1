# Run AI Screenshot Analysis E2E Tests
# Tests GPT-4 Vision analysis with actual screenshots

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🖼️  RUNNING AI IMAGE ANALYSIS E2E TESTS" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

# Load .env file
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]+)=(.+)$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

# Explicitly set production backend URL
$env:NEXT_PUBLIC_API_URL = "https://ever-reach-be.vercel.app"
$env:TEST_BASE_URL = "https://ever-reach-be.vercel.app"
$env:TEST_ORIGIN = "https://www.everreach.app"

Write-Host "🌐 Backend URL: $env:NEXT_PUBLIC_API_URL" -ForegroundColor Yellow
Write-Host "🌐 Origin: $env:TEST_ORIGIN" -ForegroundColor Yellow
Write-Host ""

# Run the test
node test/agent/e2e-screenshot-analysis.mjs

$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
if ($exitCode -eq 0) {
    Write-Host "✅ ALL TESTS PASSED" -ForegroundColor Green
} else {
    Write-Host "⚠️  SOME TESTS FAILED OR NOT IMPLEMENTED" -ForegroundColor Yellow
}
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""

exit $exitCode
