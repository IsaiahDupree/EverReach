$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:SUPABASE_ANON_KEY = $env:SUPABASE_ANON_KEY
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"
$env:BACKEND_URL = "https://ever-reach-be.vercel.app"
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "Frogger12"

Write-Host "🧪 Running Warmth + Interactions Test..."
Write-Host "Tests: Pre-change, Post-change, Multiple, Logs, Edge cases"
Write-Host ""
node test-warmth-interactions.mjs
