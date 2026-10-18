# Run Marketing Intelligence Tests with Correct Backend URL
# Ensures we're testing against production backend

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🧪 RUNNING MARKETING INTELLIGENCE TESTS" -ForegroundColor Cyan
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
$env:EXPO_PUBLIC_API_URL = "https://ever-reach-be.vercel.app"

Write-Host "🌐 Backend URL: $env:NEXT_PUBLIC_API_URL" -ForegroundColor Yellow
Write-Host ""

# Run the test
node test/agent/bucket-1-marketing-intelligence.mjs

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ TEST COMPLETE" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
