# AI Goal Inference Tests Runner with Environment Variables
# Run from backend-vercel directory

Write-Host "Setting up test environment..." -ForegroundColor Cyan

$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:NEXT_PUBLIC_SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$env:BACKEND_BASE = "https://ever-reach-be.vercel.app"
$env:TEST_ORIGIN = "https://everreach.app"
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"
$env:CLEANUP = "true"

Write-Host ""
Write-Host "Running AI Goal Inference Tests..." -ForegroundColor Green
Write-Host ""

node test/ai/run-all.mjs

$exitCode = $LASTEXITCODE

Write-Host ""
if ($exitCode -eq 0) {
    Write-Host "✅ Tests complete!" -ForegroundColor Green
} else {
    Write-Host "❌ Some tests failed. Check reports in test/ai/reports/" -ForegroundColor Red
}

exit $exitCode
