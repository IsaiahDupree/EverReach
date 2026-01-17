$ErrorActionPreference = "Stop"

Write-Host "Applying Contact Import Migration..." -ForegroundColor Cyan

# Configuration
$projectRef = "utasetfxiqcrnwyfforx"
$token = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
$migrationFile = "supabase\migrations\20251102_contact_imports.sql"

# Check file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

# Read SQL
$sql = Get-Content $migrationFile -Raw
Write-Host "Migration file loaded ($([Math]::Round($sql.Length / 1024, 2)) KB)" -ForegroundColor Gray

# Call Supabase Management API
$apiUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}
$body = @{ query = $sql } | ConvertTo-Json

try {
    Write-Host "Executing SQL via Supabase Management API..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "SUCCESS! Migration applied" -ForegroundColor Green
    Write-Host ""
    Write-Host "Created:" -ForegroundColor Cyan
    Write-Host "  - contact_import_jobs table" -ForegroundColor Gray
    Write-Host "  - imported_contacts table" -ForegroundColor Gray
    Write-Host "  - 7 indexes" -ForegroundColor Gray
    Write-Host "  - 3 helper functions" -ForegroundColor Gray
    Write-Host "  - RLS policies" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Add OAuth credentials to Vercel" -ForegroundColor Gray
    Write-Host "  2. Test: curl https://ever-reach-be.vercel.app/api/v1/contacts/import/health" -ForegroundColor Gray
    Write-Host ""
    
    exit 0
} catch {
    Write-Host ""
    Write-Host "ERROR: Migration failed" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternative: Apply manually in Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new" -ForegroundColor Gray
    Write-Host ""
    
    exit 1
}
