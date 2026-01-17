# Insert Production Campaigns

Write-Host "Inserting production campaigns...`n" -ForegroundColor Cyan

$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$PORT = "5432"
$DATABASE = "postgres"
$USER = "postgres"

Write-Host "Running production-campaigns.sql..." -ForegroundColor Yellow
& $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE -f "supabase\migrations\production-campaigns.sql" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nSUCCESS - Campaigns inserted!`n" -ForegroundColor Green
    
    Write-Host "===============================================" -ForegroundColor Cyan
    Write-Host "Campaign Automation Ready!" -ForegroundColor Green
    Write-Host "===============================================`n" -ForegroundColor Cyan
    
    Write-Host "Inserted:" -ForegroundColor Yellow
    Write-Host "  ✓ 5 production campaigns" -ForegroundColor Green
    Write-Host "  ✓ 10 A/B template variants (2 per campaign)`n" -ForegroundColor Green
    
    Write-Host "Campaigns:" -ForegroundColor Yellow
    Write-Host "  1. Onboarding Stuck (24h after signup)" -ForegroundColor White
    Write-Host "  2. Paywall Abandoned (2h after view)" -ForegroundColor White
    Write-Host "  3. Payment Failed (48h after failure)" -ForegroundColor White
    Write-Host "  4. Inactive 7 Days (weekly check)" -ForegroundColor White
    Write-Host "  5. Heavy Users - VIP Nurture (monthly)`n" -ForegroundColor White
    
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Verify: node scripts\verify-campaigns-migration.mjs" -ForegroundColor White
    Write-Host "  2. Workers are already deployed and running via cron" -ForegroundColor White
    Write-Host "  3. Campaigns will auto-execute based on user behavior`n" -ForegroundColor White
    
} else {
    Write-Host "`nFAILED - Exit code: $LASTEXITCODE`n" -ForegroundColor Red
}

$env:PGPASSWORD = ""
