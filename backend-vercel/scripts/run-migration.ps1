# Run Contact Import Migration via Supabase CLI
# This script applies the contact import system migration

Write-Host "🚀 Running Contact Import Migration" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Set access token
$env:SUPABASE_ACCESS_TOKEN = [Environment]::GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN")

# Project ref
$PROJECT_REF = "utasetfxiqcrnwyfforx"

Write-Host "📋 Step 1: Logging in to Supabase..." -ForegroundColor Yellow
supabase login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Login failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Logged in" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 2: Linking project ($PROJECT_REF)..." -ForegroundColor Yellow
supabase link --project-ref $PROJECT_REF
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Link failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Project linked" -ForegroundColor Green
Write-Host ""

Write-Host "📋 Step 3: Applying migrations..." -ForegroundColor Yellow
supabase db push
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Migration applied!" -ForegroundColor Green
Write-Host ""

Write-Host "🎉 Migration Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Verifying tables..." -ForegroundColor Yellow
Write-Host "You can verify in Supabase dashboard:" -ForegroundColor White
Write-Host "  - contact_import_jobs table" -ForegroundColor White
Write-Host "  - imported_contacts table" -ForegroundColor White
Write-Host ""
Write-Host "Next: Add OAuth credentials to Vercel environment variables" -ForegroundColor Cyan
