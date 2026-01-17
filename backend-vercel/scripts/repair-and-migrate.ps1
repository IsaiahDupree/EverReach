$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repair & Migrate Supabase" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Step 1: Repair migration history
Write-Host "Step 1: Repairing migration history..." -ForegroundColor Yellow
Write-Host ""

$revertedMigrations = @(
    "20250928202900",
    "20250928203100",
    "20250928203300",
    "20250928203500",
    "20251021030750",
    "20251021030817"
)

foreach ($migration in $revertedMigrations) {
    Write-Host "  Marking $migration as reverted..." -ForegroundColor Gray
    & supabase migration repair --status reverted $migration --password "everreach123!@#"
}

Write-Host ""
Write-Host "  ✓ Reverted migrations marked" -ForegroundColor Green
Write-Host ""

# Step 2: Add our migration file
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

& supabase db push --password "everreach123!@#"

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
    Write-Host "Ready to create tests!" -ForegroundColor Cyan
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
