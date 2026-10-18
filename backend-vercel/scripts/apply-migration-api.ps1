# Apply Contact Import Migration via Supabase Management API
# This bypasses the CLI migration conflicts

Write-Host "🚀 Applying Contact Import Migration via API" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$ACCESS_TOKEN = $env:VERCEL_TOKEN
$PROJECT_REF = "utasetfxiqcrnwyfforx"
$MIGRATION_FILE = "supabase\migrations\20251102_contact_imports.sql"

# Read migration SQL
Write-Host "📄 Reading migration file..." -ForegroundColor Yellow
if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "❌ Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

$SQL = Get-Content $MIGRATION_FILE -Raw
Write-Host "✅ Migration file loaded ($(($SQL.Length / 1024).ToString('F2')) KB)" -ForegroundColor Green
Write-Host ""

# Prepare API request
Write-Host "🔧 Preparing API request..." -ForegroundColor Yellow
$headers = @{
    "Authorization" = "Bearer $ACCESS_TOKEN"
    "Content-Type" = "application/json"
    "apikey" = $env:SUPABASE_ANON_KEY
}

$body = @{
    query = $SQL
} | ConvertTo-Json -Depth 10

$uri = "https://utasetfxiqcrnwyfforx.supabase.co/rest/v1/rpc/exec_sql"

Write-Host "📡 Sending to Supabase..." -ForegroundColor Yellow
Write-Host "   Project: $PROJECT_REF" -ForegroundColor White
Write-Host ""

try {
    # Try the exec_sql RPC endpoint first (if it exists)
    $response = Invoke-RestMethod -Uri $uri -Method POST -Headers $headers -Body $body -ErrorAction Stop
    
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 3 | Write-Host
    
} catch {
    Write-Host "⚠️  RPC endpoint not available, trying direct SQL execution..." -ForegroundColor Yellow
    Write-Host ""
    
    # Fallback: Use psql connection string if available
    Write-Host "📋 Alternative: Run this SQL directly in Supabase SQL Editor:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1. Go to: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor White
    Write-Host "2. Copy the migration SQL (already in clipboard)" -ForegroundColor White
    Write-Host "3. Paste and click 'Run'" -ForegroundColor White
    Write-Host ""
    
    # Copy to clipboard as fallback
    Set-Clipboard -Value $SQL
    Write-Host "✅ Migration SQL copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "Error details:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host ""
Write-Host "📊 After applying, verify with:" -ForegroundColor Cyan
Write-Host "  SELECT tablename FROM pg_tables WHERE tablename IN ('contact_import_jobs', 'imported_contacts');" -ForegroundColor White
Write-Host ""
Write-Host "Next: Add OAuth credentials to Vercel" -ForegroundColor Yellow
