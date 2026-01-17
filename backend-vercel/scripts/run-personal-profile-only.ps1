$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Personal Profile API Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details - using connection pooler
$dbHost = "aws-0-us-east-1.pooler.supabase.com"
$dbPort = "6543"
$dbName = "postgres"
$dbUser = "postgres.bvhqolnytimehzpwdiqd"
$env:PGPASSWORD = "everreach123!@#"

Write-Host "Connecting to: $dbHost" -ForegroundColor Yellow
Write-Host "Executing migration..." -ForegroundColor Yellow
Write-Host ""

psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f migrations/personal-profile-api.sql

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
    Write-Host "✅ Ready to create E2E tests!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
