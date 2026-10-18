$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Create Storage Buckets Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

$migrationFile = "migrations\create-storage-buckets.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ $migrationFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "📦 Creating storage buckets:" -ForegroundColor Yellow
Write-Host "   - attachments (private, 50MB)" -ForegroundColor Gray
Write-Host "   - screenshots (private, 10MB)" -ForegroundColor Gray
Write-Host ""

# Read the SQL file
$sql = Get-Content $migrationFile -Raw

# Save to temp file for supabase CLI
$tempFile = "temp-storage-migration.sql"
$sql | Out-File -FilePath $tempFile -Encoding UTF8 -NoNewline

try {
    Write-Host "Executing migration via Supabase CLI..." -ForegroundColor Gray
    Write-Host ""
    
    # Execute via psql with connection string from env
    $dbUrl = $env:SUPABASE_DB_URL
    if (-not $dbUrl) {
        # Use direct connection to db host (not pooler)
        # URL encode the password: ! = %21, @ = %40, # = %23
        $dbUrl = "postgresql://postgres.utasetfxiqcrnwyfforx:everreach123%21%40%23@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"
    }
    
    Get-Content $tempFile | & psql $dbUrl
    
    if ($LASTEXITCODE -eq 0) {
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
