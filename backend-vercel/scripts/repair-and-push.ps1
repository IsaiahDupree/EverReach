$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Repair Schema & Complete Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

Write-Host "Step 1: Repairing partial schema..." -ForegroundColor Yellow
Write-Host ""

$repairSQL = Get-Content "scripts\repair-schema.sql" -Raw
$repairSQL | & supabase db execute --password "everreach123!@#"

Write-Host ""
Write-Host "Step 2: Pushing remaining migrations..." -ForegroundColor Yellow
Write-Host ""

& supabase db push --password "everreach123!@#"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run smoke tests:" -ForegroundColor Cyan
    Write-Host "  node test/profile-smoke.mjs" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
