# Run Supabase Migrations for Campaign Automation
# Requires: PostgreSQL password (everreach123!@#)

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase Migration Runner" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Database connection
$SUPABASE_DB_URL = "postgresql://postgres.utasetfxiqcrnwyfforx:everreach123!@#@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
$PSQL_PATH = "C:\Program Files\PostgreSQL\16\bin\psql.exe"

# Migrations to run (in order)
$migrations = @(
    @{
        Name = "Lifecycle Automation System"
        File = "supabase\migrations\lifecycle-automation-system.sql"
        Description = "Creates tables: campaigns, templates, deliveries, segment views"
    },
    @{
        Name = "Production Campaigns"
        File = "supabase\migrations\production-campaigns.sql"
        Description = "Inserts 5 campaigns with 10 A/B templates"
    }
)

Write-Host "Migrations to run:" -ForegroundColor Yellow
for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    Write-Host "  $($i + 1). $($migration.Name)" -ForegroundColor White
    Write-Host "     File: $($migration.File)" -ForegroundColor Gray
    Write-Host "     $($migration.Description)`n" -ForegroundColor Gray
}

# Run migrations
foreach ($migration in $migrations) {
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    Write-Host "Running: $($migration.Name)" -ForegroundColor Yellow
    Write-Host "----------------------------------------" -ForegroundColor Cyan
    
    if (-not (Test-Path $migration.File)) {
        Write-Host "ERROR: Migration file not found: $($migration.File)" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Executing SQL..." -ForegroundColor Gray
    
    try {
        & $PSQL_PATH $SUPABASE_DB_URL -f $migration.File
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "SUCCESS: $($migration.Name) applied`n" -ForegroundColor Green
        } else {
            Write-Host "ERROR: Migration failed with exit code $LASTEXITCODE" -ForegroundColor Red
            exit $LASTEXITCODE
        }
    } catch {
        Write-Host "ERROR: Failed to execute migration" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "All Migrations Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run verification script: node scripts\verify-campaigns-migration.mjs" -ForegroundColor White
Write-Host "2. Check Supabase dashboard: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx" -ForegroundColor White
Write-Host "3. Test campaign execution`n" -ForegroundColor White

Write-Host "Database tables created:" -ForegroundColor Yellow
Write-Host "  - campaigns" -ForegroundColor White
Write-Host "  - templates" -ForegroundColor White
Write-Host "  - deliveries" -ForegroundColor White
Write-Host "  - Segment views (onboarding_stuck, paywall_abandoned, etc.)`n" -ForegroundColor White

Write-Host "Campaigns inserted:" -ForegroundColor Yellow
Write-Host "  1. Onboarding Stuck (24h)" -ForegroundColor White
Write-Host "  2. Paywall Abandoned (2h)" -ForegroundColor White
Write-Host "  3. Payment Failed (48h)" -ForegroundColor White
Write-Host "  4. Inactive 7 Days" -ForegroundColor White
Write-Host "  5. Heavy Users (VIP Nurture)`n" -ForegroundColor White

Write-Host "Templates per campaign: 2 (A/B variants)`n" -ForegroundColor Gray
