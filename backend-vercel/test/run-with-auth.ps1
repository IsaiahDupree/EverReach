# Run tests with authentication token

$token = Get-Content -Path ".test-token" -Raw
$env:TEST_AUTH_TOKEN = $token.Trim()

Write-Host "Running tests with authentication..." -ForegroundColor Cyan
Write-Host ""

node test/paywall-config-changes-integration.mjs

$exitCode = $LASTEXITCODE
exit $exitCode
