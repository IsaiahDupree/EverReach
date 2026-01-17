# Create Views from lifecycle-automation-system.sql

Write-Host "Creating segment views from migration...`n" -ForegroundColor Cyan

$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$PORT = "5432"
$DATABASE = "postgres"
$USER = "postgres"

# Read lines 240-311 from migration file
$migrationContent = Get-Content "supabase\migrations\lifecycle-automation-system.sql" -TotalCount 311 | Select-Object -Last 72

# Join into single SQL
$SQL = $migrationContent -join "`n"

Write-Host "Creating views from migration file..." -ForegroundColor Yellow
$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS - Segment views created!`n" -ForegroundColor Green
    
    Write-Host "Created views:" -ForegroundColor Yellow
    Write-Host "  ✓ v_onboarding_stuck" -ForegroundColor Green
    Write-Host "  ✓ v_paywall_abandoned" -ForegroundColor Green
    Write-Host "  ✓ v_payment_failed" -ForegroundColor Green
    Write-Host "  ✓ v_inactive_7d" -ForegroundColor Green
    Write-Host "  ✓ v_heavy_users`n" -ForegroundColor Green
    
    Write-Host "Verifying views exist..." -ForegroundColor Yellow
    $SQL = "SELECT table_name FROM information_schema.views WHERE table_schema = 'public' AND table_name LIKE 'v_%' ORDER BY table_name;"
    $SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE
    
} else {
    Write-Host "`nFAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
}

$env:PGPASSWORD = ""
