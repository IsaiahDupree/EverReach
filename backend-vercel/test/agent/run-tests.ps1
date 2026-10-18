# Feature Requests Integration Tests Runner
# Loads .env and runs the tests

$ErrorActionPreference = "Stop"

Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan

# Load .env file
$envPath = Join-Path $PSScriptRoot "..\..\\.env"
if (Test-Path $envPath) {
    Get-Content $envPath | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith('#')) {
            $parts = $line -split '=', 2
            if ($parts.Count -eq 2) {
                $key = $parts[0].Trim()
                $value = $parts[1].Trim().Trim('"').Trim("'")
                [Environment]::SetEnvironmentVariable($key, $value, "Process")
            }
        }
    }
    Write-Host "✓ Environment variables loaded" -ForegroundColor Green
} else {
    Write-Host "⚠ .env file not found at $envPath" -ForegroundColor Yellow
}

# Set test credentials
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"

Write-Host ""
Write-Host "Running Feature Requests Integration Tests..." -ForegroundColor Cyan
Write-Host "  SUPABASE_URL: $($env:SUPABASE_URL.Substring(0, 30))..." -ForegroundColor Gray
Write-Host "  TEST_EMAIL: $env:TEST_EMAIL" -ForegroundColor Gray
Write-Host ""

# Run the test
$testFile = Join-Path $PSScriptRoot "feature-requests-integration.mjs"
& node $testFile

# Capture exit code
$exitCode = $LASTEXITCODE

if ($exitCode -eq 0) {
    Write-Host ""
    Write-Host "✓ All tests passed!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "✖ Some tests failed (exit code: $exitCode)" -ForegroundColor Red
}

exit $exitCode
