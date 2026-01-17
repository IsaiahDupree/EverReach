$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Apply Personal Profile Migration via CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

Write-Host "Applying migration via Supabase CLI..." -ForegroundColor Yellow
Write-Host ""

# Use db execute with the fixed SQL file
$sqlFile = "APPLY_MIGRATION_FIXED.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "❌ $sqlFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "Executing SQL from $sqlFile..." -ForegroundColor Gray
Write-Host ""

# Read the SQL file and execute it
$sql = Get-Content $sqlFile -Raw

# Save to temp file for supabase CLI
$tempFile = "temp-migration.sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

try {
    # Execute via supabase CLI
    & supabase db execute --file $tempFile --password "everreach123!@#"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host "✅ Migration Applied Successfully!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next: Run E2E tests to verify" -ForegroundColor Cyan
        Write-Host "  .\scripts\run-e2e-tests.ps1" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        exit 1
    }
} finally {
    # Clean up temp file
    if (Test-Path $tempFile) {
        Remove-Item $tempFile
    }
}
