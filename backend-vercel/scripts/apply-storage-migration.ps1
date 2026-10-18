$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Apply Storage Buckets via Supabase CLI" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

$migrationFile = "migrations\create-storage-buckets.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ $migrationFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Creating storage buckets via Supabase SQL Editor API..." -ForegroundColor Yellow
Write-Host ""

# Read the SQL file
$sql = Get-Content $migrationFile -Raw

# Use Supabase Management API to execute SQL
$projectRef = "utasetfxiqcrnwyfforx"
$apiUrl = "https://api.supabase.com/v1/projects/$projectRef/database/query"

$headers = @{
    "Authorization" = "Bearer sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
    "Content-Type" = "application/json"
}

$body = @{
    query = $sql
} | ConvertTo-Json

try {
    Write-Host "Executing SQL via Supabase Management API..." -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Storage Buckets Created!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📁 Buckets:" -ForegroundColor Cyan
    Write-Host "   ✓ attachments - Private bucket (50MB limit)" -ForegroundColor Green
    Write-Host "   ✓ screenshots - Private bucket (10MB limit)" -ForegroundColor Green
    Write-Host ""
    Write-Host "🔒 Security:" -ForegroundColor Cyan
    Write-Host "   ✓ RLS policies applied" -ForegroundColor Green
    Write-Host "   ✓ Users can only access their own files" -ForegroundColor Green
    Write-Host "   ✓ Service role can generate signed URLs" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next: Test file uploads" -ForegroundColor Yellow
    Write-Host "  node test/backend/test-storage-debug.mjs" -ForegroundColor Gray
    Write-Host ""
    
    exit 0
} catch {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    # If Management API doesn't work, provide manual instructions
    Write-Host ""
    Write-Host "Alternative: Apply via Supabase Dashboard" -ForegroundColor Yellow
    Write-Host "1. Go to: https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new" -ForegroundColor Gray
    Write-Host "2. Copy contents of: migrations\create-storage-buckets.sql" -ForegroundColor Gray
    Write-Host "3. Paste and click 'Run'" -ForegroundColor Gray
    
    exit 1
}
