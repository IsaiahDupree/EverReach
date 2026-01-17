# Simple Supabase Migration Runner

Write-Host "Running Supabase Migrations...`n" -ForegroundColor Cyan

# Set password as environment variable
$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "aws-0-us-east-1.pooler.supabase.com"
$PORT = "6543"
$DATABASE = "postgres"
$USER = "postgres.utasetfxiqcrnwyfforx"

# Migration 1: Lifecycle Automation System
Write-Host "1. Running lifecycle-automation-system.sql..." -ForegroundColor Yellow
& $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE -f "supabase\migrations\lifecycle-automation-system.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS`n" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
    exit 1
}

# Migration 2: Production Campaigns
Write-Host "2. Running production-campaigns.sql..." -ForegroundColor Yellow
& $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE -f "supabase\migrations\production-campaigns.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS`n" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migrations Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Created:" -ForegroundColor Yellow
Write-Host "  - campaigns table (5 campaigns)" -ForegroundColor White
Write-Host "  - templates table (10 A/B variants)" -ForegroundColor White
Write-Host "  - deliveries table" -ForegroundColor White
Write-Host "  - Segment views`n" -ForegroundColor White

Write-Host "Next: Run verification script" -ForegroundColor Yellow
Write-Host "  node scripts\verify-campaigns-migration.mjs`n" -ForegroundColor Gray

# Clear password
$env:PGPASSWORD = ""
