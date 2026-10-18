$ErrorActionPreference = "Stop"

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "Apply Contact Import Migration via API" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Set Supabase access token
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

$migrationFile = "supabase\migrations\20251102_contact_imports.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ $migrationFile not found" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Reading migration file..." -ForegroundColor Yellow
Write-Host "   File: $migrationFile" -ForegroundColor Gray
Write-Host ""

# Read the SQL file
$sql = Get-Content $migrationFile -Raw
$sizeKB = [Math]::Round($sql.Length / 1024, 2)
Write-Host "   Size: $sizeKB KB" -ForegroundColor Gray
Write-Host ""

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
    Write-Host "📡 Executing SQL via Supabase Management API..." -ForegroundColor Yellow
    Write-Host "   Endpoint: $apiUrl" -ForegroundColor Gray
    Write-Host ""
    
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body
    
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "✅ Contact Import Migration Applied!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "📊 Database Objects Created:" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  ENUMs:" -ForegroundColor Yellow
    Write-Host "     * import_provider (google, microsoft, apple, csv, manual)" -ForegroundColor Gray
    Write-Host "     * import_status (pending, authenticating, fetching, processing, completed, failed, cancelled)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  🗄️  Tables:" -ForegroundColor Yellow
    Write-Host "     ✓ contact_import_jobs - Track import jobs" -ForegroundColor Gray
    Write-Host "     ✓ imported_contacts - Track individual imported contacts" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  ⚡ Indexes (7):" -ForegroundColor Yellow
    Write-Host "     ✓ idx_import_jobs_user" -ForegroundColor Gray
    Write-Host "     ✓ idx_import_jobs_status" -ForegroundColor Gray
    Write-Host "     ✓ idx_import_jobs_created" -ForegroundColor Gray
    Write-Host "     ✓ idx_import_jobs_provider" -ForegroundColor Gray
    Write-Host "     ✓ idx_imported_contacts_job" -ForegroundColor Gray
    Write-Host "     ✓ idx_imported_contacts_contact" -ForegroundColor Gray
    Write-Host "     ✓ idx_imported_contacts_provider" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  🔧 Functions (3):" -ForegroundColor Yellow
    Write-Host "     ✓ get_import_job_summary(job_id)" -ForegroundColor Gray
    Write-Host "     ✓ update_import_progress(job_id, ...)" -ForegroundColor Gray
    Write-Host "     ✓ is_contact_imported(user_id, provider, contact_id)" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "  🔒 Security:" -ForegroundColor Yellow
    Write-Host "     ✓ RLS enabled on both tables" -ForegroundColor Gray
    Write-Host "     ✓ Users can only access their own import jobs" -ForegroundColor Gray
    Write-Host "     ✓ Service role has full access" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "🧪 Verify Migration" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run this SQL in Supabase SQL Editor to verify:" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "  SELECT tablename FROM pg_tables" -ForegroundColor Gray
    Write-Host "  WHERE tablename IN ('contact_import_jobs', 'imported_contacts');" -ForegroundColor Gray
    Write-Host ""
    Write-Host "Expected: Both tables should be listed" -ForegroundColor Gray
    Write-Host ""
    
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "📋 Next Steps" -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "1️⃣  Test health endpoint:" -ForegroundColor Yellow
    Write-Host "   curl https://ever-reach-be.vercel.app/api/v1/contacts/import/health" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2️⃣  Add OAuth credentials to Vercel:" -ForegroundColor Yellow
    Write-Host "   GOOGLE_CLIENT_ID=your_google_client_id" -ForegroundColor Gray
    Write-Host "   GOOGLE_CLIENT_SECRET=your_google_client_secret" -ForegroundColor Gray
    Write-Host "   MICROSOFT_CLIENT_ID=your_microsoft_client_id" -ForegroundColor Gray
    Write-Host "   MICROSOFT_CLIENT_SECRET=your_microsoft_client_secret" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3️⃣  Redeploy backend:" -ForegroundColor Yellow
    Write-Host "   vercel --prod" -ForegroundColor Gray
    Write-Host ""
    Write-Host "4️⃣  Test OAuth flow:" -ForegroundColor Yellow
    Write-Host "   node test/backend/test-contact-import.mjs" -ForegroundColor Gray
    Write-Host ""
    
    exit 0
} catch {
    Write-Host ""
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "❌ Migration Failed!" -ForegroundColor Red
    Write-Host "============================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Error Details:" -ForegroundColor Yellow
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Yellow
    if ($_.ErrorDetails) {
        Write-Host $_.ErrorDetails.Message -ForegroundColor Red
    }
    Write-Host ""
    
    # If Management API doesn't work, provide manual instructions
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host "📝 Alternative: Apply Manually" -ForegroundColor Yellow
    Write-Host "============================================" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "1. Open Supabase SQL Editor:" -ForegroundColor White
    Write-Host "   https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new" -ForegroundColor Gray
    Write-Host ""
    Write-Host "2. Copy migration SQL:" -ForegroundColor White
    Write-Host "   Get-Content supabase\migrations\20251102_contact_imports.sql | Set-Clipboard" -ForegroundColor Gray
    Write-Host ""
    Write-Host "3. Paste and click 'Run'" -ForegroundColor White
    Write-Host ""
    
    exit 1
}
