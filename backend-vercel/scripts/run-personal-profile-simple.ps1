$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Personal Profile API Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
$env:SUPABASE_DB_PASSWORD = "everreach123!@#"

Write-Host "Reading migration SQL..." -ForegroundColor Yellow
$sql = Get-Content migrations/personal-profile-api.sql -Raw

Write-Host "Executing migration via Supabase CLI..." -ForegroundColor Yellow
Write-Host ""

# Execute via stdin
$sql | supabase db execute

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
