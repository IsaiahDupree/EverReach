$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Running Personal Profile Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set password
$env:PGPASSWORD = "everreach123!@#"

# Connection details
$dbHost = "aws-0-us-east-1.pooler.supabase.com"
$dbPort = "6543"
$dbName = "postgres"
$dbUser = "postgres.bvhqolnytimehzpwdiqd"

Write-Host "Step 1: Running migration..." -ForegroundColor Yellow
Write-Host ""

psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f migrations/personal-profile-api.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Step 2: Verifying schema..." -ForegroundColor Yellow
    Write-Host ""
    
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f scripts/verify-personal-profile.sql
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration & Verification Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next: Run smoke tests with:" -ForegroundColor Cyan
    Write-Host "  `$env:API_BASE = 'https://ever-reach-be.vercel.app'" -ForegroundColor Gray
    Write-Host "  `$env:TEST_JWT = '<paste-jwt>'" -ForegroundColor Gray
    Write-Host "  node test/profile-smoke.mjs" -ForegroundColor Gray
    
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Clear password
Remove-Item Env:PGPASSWORD
