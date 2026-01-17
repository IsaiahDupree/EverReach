$ErrorActionPreference = "Stop"

Write-Host "Running Personal Profile API migration via Supabase CLI..." -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Link project first
Write-Host "Linking to Supabase project..." -ForegroundColor Yellow
supabase link --project-ref bvhqolnytimehzpwdiqd --password "everreach123!@#"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to link project" -ForegroundColor Red
    exit 1
}

# Read SQL file
Write-Host "Reading migration file..." -ForegroundColor Yellow
$sql = Get-Content migrations/personal-profile-api.sql -Raw

# Execute via Supabase CLI (using stdin)
Write-Host "Executing migration on Supabase..." -ForegroundColor Yellow
$sql | supabase db execute

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Verifying tables..." -ForegroundColor Yellow
    Write-Host ""
    
    # Verify tables
    $verifySQL = @"
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@
    
    $verifySQL | supabase db execute
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
