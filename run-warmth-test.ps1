$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"
$env:TEST_USER_ID = "e5eaa347-9c72-4190-bace-ec7a2063f69a"

Write-Host "Environment variables set. Running warmth decay test..."
node test-warmth-decay.mjs
