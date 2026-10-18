$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = $env:SUPABASE_SERVICE_ROLE_KEY
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"

Write-Host "Environment variables set. Running warmth decay test..."
node test-warmth-decay.mjs
