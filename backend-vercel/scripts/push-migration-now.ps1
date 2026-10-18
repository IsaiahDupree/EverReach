$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pushing Migrations to Remote" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

Write-Host "Migrations to push:" -ForegroundColor Yellow
Get-ChildItem "supabase\migrations\*.sql" | ForEach-Object {
    Write-Host "  • $($_.Name)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Pushing..." -ForegroundColor Yellow
Write-Host ""

& supabase db push --password "everreach123!@#"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Next: Run verification" -ForegroundColor Cyan
    Write-Host "  node scripts/run-full-smoke-test.mjs" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}
