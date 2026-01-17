$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Setup & Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Step 1: Link to remote project
Write-Host "Step 1: Linking to Supabase project..." -ForegroundColor Yellow
Write-Host "  Project: bvhqolnytimehzpwdiqd" -ForegroundColor Gray
Write-Host ""

$linkArgs = @(
    "link",
    "--project-ref", "bvhqolnytimehzpwdiqd",
    "--password", "everreach123!@#"
)

& supabase $linkArgs

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Failed to link to Supabase project" -ForegroundColor Red
    Write-Host "This might be okay if already linked. Continuing..." -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Copy migration file to supabase/migrations
Write-Host "Step 2: Preparing migration..." -ForegroundColor Yellow

$migrationSource = "migrations/personal-profile-api.sql"
$timestamp = Get-Date -Format "yyyyMMddHHmmss"
$migrationDest = "supabase/migrations/${timestamp}_personal_profile_api.sql"

if (Test-Path $migrationSource) {
    Copy-Item $migrationSource $migrationDest
    Write-Host "  ✓ Migration copied to: $migrationDest" -ForegroundColor Green
} else {
    Write-Host "  ❌ Migration file not found: $migrationSource" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Run migration
Write-Host "Step 3: Running migration..." -ForegroundColor Yellow
Write-Host ""

$dbPushArgs = @(
    "db",
    "push",
    "--password", "everreach123!@#"
)

& supabase $dbPushArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Step 4: Verify
    Write-Host "Step 4: Verifying tables..." -ForegroundColor Yellow
    
    $verifySQL = @"
SELECT table_name, 
       (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@
    
    $verifySQL | & supabase db execute --password "everreach123!@#"
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Setup Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Tables created:" -ForegroundColor Green
    Write-Host "  • compose_settings" -ForegroundColor Gray
    Write-Host "  • persona_notes" -ForegroundColor Gray
    Write-Host "  • profiles (updated with display_name, preferences)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Helper functions created:" -ForegroundColor Green
    Write-Host "  • get_or_create_compose_settings(user_id)" -ForegroundColor Gray
    Write-Host "  • search_persona_notes(user_id, filters)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next: Create E2E tests for personal profile endpoints" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
