$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"
$env:SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04"
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"
$env:BACKEND_URL = "https://ever-reach-be.vercel.app"
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "Frogger12"

Write-Host "🧪 Running Warmth + Interactions Test..."
Write-Host "Tests: Pre-change, Post-change, Multiple, Logs, Edge cases"
Write-Host ""
node test-warmth-interactions.mjs
