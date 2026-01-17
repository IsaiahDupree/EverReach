$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Sync & Migrate Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Step 1: Pull remote schema to sync
Write-Host "Step 1: Pulling remote schema to sync..." -ForegroundColor Yellow
Write-Host ""

$pullArgs = @(
    "db",
    "pull",
    "--password", "everreach123!@#"
)

& supabase $pullArgs

Write-Host ""

# Step 2: Now add our new migration
Write-Host "Step 2: Adding new migration..." -ForegroundColor Yellow

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

# Step 3: Push the new migration
Write-Host "Step 3: Pushing migration to remote..." -ForegroundColor Yellow
Write-Host ""

$pushArgs = @(
    "db",
    "push",
    "--password", "everreach123!@#"
)

& supabase $pushArgs

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Tables created:" -ForegroundColor Green
    Write-Host "  • compose_settings" -ForegroundColor Gray
    Write-Host "  • persona_notes" -ForegroundColor Gray
    Write-Host "  • profiles (updated)" -ForegroundColor Gray
    Write-Host ""
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "Check the error messages above" -ForegroundColor Yellow
    exit 1
}
