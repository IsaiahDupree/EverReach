$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Final Schema Repair & Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
$env:PGPASSWORD = "everreach123!@#"

# Connection info
$dbHost = "aws-0-us-east-1.pooler.supabase.com"
$dbPort = "5432"
$dbUser = "postgres.bvhqolnytimehzpwdiqd"
$dbName = "postgres"

Write-Host "Step 1: Repairing schema via psql..." -ForegroundColor Yellow
Write-Host ""

psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f scripts\repair-schema.sql

Write-Host ""
Write-Host "Step 2: Pushing migration..." -ForegroundColor Yellow
Write-Host ""

& supabase db push --db-password "everreach123!@#"

Remove-Item Env:PGPASSWORD

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Migration had issues" -ForegroundColor Yellow
    Write-Host "But schema may be repaired. Check manually." -ForegroundColor Gray
}
