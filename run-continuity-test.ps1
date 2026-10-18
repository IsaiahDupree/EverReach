$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"
$env:BACKEND_URL = "https://ever-reach-be.vercel.app"

Write-Host "🧪 Running Improved Warmth Continuity Test..."
Write-Host "Features: Exact math, API endpoints, full precision, CI-ready"
Write-Host ""
node test-warmth-continuity-improved.mjs
