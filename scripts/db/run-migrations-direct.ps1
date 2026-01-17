# Run Supabase Migrations - Direct Connection

Write-Host "Running Supabase Migrations (Direct Connection)...`n" -ForegroundColor Cyan

# Use direct connection, not pooler
$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"  # Direct, not pooler
$PORT = "5432"  # Direct port, not 6543
$DATABASE = "postgres"
$USER = "postgres"  # Just 'postgres' for direct connection

Write-Host "Connection: postgres@$DBHOST:$PORT/$DATABASE`n" -ForegroundColor Gray

# Migration 1: Lifecycle Automation System
Write-Host "1. Running lifecycle-automation-system.sql..." -ForegroundColor Yellow
& $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE -f "supabase\migrations\lifecycle-automation-system.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - Lifecycle automation schema created`n" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
    $env:PGPASSWORD = ""
    exit 1
}

# Migration 2: Production Campaigns
Write-Host "2. Running production-campaigns.sql..." -ForegroundColor Yellow
& $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE -f "supabase\migrations\production-campaigns.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   SUCCESS - 5 campaigns + 10 templates inserted`n" -ForegroundColor Green
} else {
    Write-Host "   FAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
    $env:PGPASSWORD = ""
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migrations Complete!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Created in database:" -ForegroundColor Yellow
Write-Host "  ✓ campaigns table (5 campaigns)" -ForegroundColor Green
Write-Host "  ✓ templates table (10 A/B variants)" -ForegroundColor Green
Write-Host "  ✓ deliveries table" -ForegroundColor Green
Write-Host "  ✓ Segment views (5 views)" -ForegroundColor Green
Write-Host "  ✓ Campaign functions`n" -ForegroundColor Green

Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Verify: node scripts\verify-campaigns-migration.mjs" -ForegroundColor White
Write-Host "  2. Test: node test\agent\lifecycle-end-to-end.mjs" -ForegroundColor White
Write-Host "  3. Check Supabase dashboard for new tables`n" -ForegroundColor White

# Clear password
$env:PGPASSWORD = ""
