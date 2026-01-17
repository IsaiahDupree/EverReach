# Run Contact Import Migration
# This script helps you apply the contact import system migration to Supabase

Write-Host "🚀 Contact Import Migration Runner" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

$migrationFile = "migrations/06_contact_imports.sql"

# Check if migration file exists
if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Error: Migration file not found at $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📄 Migration File: $migrationFile" -ForegroundColor Green
Write-Host ""

# Read migration content
$migrationContent = Get-Content $migrationFile -Raw

Write-Host "📋 This migration will create:" -ForegroundColor Yellow
Write-Host "  - 2 ENUM types (import_provider, import_status)" -ForegroundColor White
Write-Host "  - contact_import_jobs table" -ForegroundColor White
Write-Host "  - imported_contacts table" -ForegroundColor White
Write-Host "  - 7 indexes for performance" -ForegroundColor White
Write-Host "  - 3 helper functions" -ForegroundColor White
Write-Host "  - RLS policies for security" -ForegroundColor White
Write-Host ""

Write-Host "🔧 How to apply this migration:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option 1: Supabase SQL Editor (Recommended)" -ForegroundColor Green
Write-Host "  1. Go to: https://supabase.com/dashboard" -ForegroundColor White
Write-Host "  2. Select your project (utasetfxiqcrnwyfforx)" -ForegroundColor White
Write-Host "  3. Click 'SQL Editor' in the left sidebar" -ForegroundColor White
Write-Host "  4. Click '+ New Query'" -ForegroundColor White
Write-Host "  5. Copy the migration SQL (press C to copy to clipboard)" -ForegroundColor White
Write-Host "  6. Paste into SQL Editor and click 'Run'" -ForegroundColor White
Write-Host ""

Write-Host "Option 2: Supabase CLI" -ForegroundColor Green
Write-Host "  Run: supabase db push" -ForegroundColor White
Write-Host ""

Write-Host "Press any key to continue..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
Write-Host ""

# Ask if user wants to copy to clipboard
Write-Host "📋 Copy migration SQL to clipboard? (Y/N): " -ForegroundColor Cyan -NoNewline
$response = Read-Host

if ($response -eq "Y" -or $response -eq "y" -or $response -eq "C" -or $response -eq "c") {
    Set-Clipboard -Value $migrationContent
    Write-Host "✅ Migration SQL copied to clipboard!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Now:" -ForegroundColor Yellow
    Write-Host "  1. Go to Supabase SQL Editor" -ForegroundColor White
    Write-Host "  2. Create new query" -ForegroundColor White
    Write-Host "  3. Paste (Ctrl+V)" -ForegroundColor White
    Write-Host "  4. Click 'Run'" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host "Migration SQL not copied. You can manually copy from: $migrationFile" -ForegroundColor Yellow
}

Write-Host "🔍 After running the migration, verify with:" -ForegroundColor Cyan
Write-Host "  SELECT * FROM contact_import_jobs LIMIT 1;" -ForegroundColor White
Write-Host ""

Write-Host "✅ Script complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Run migration in Supabase SQL Editor" -ForegroundColor White
Write-Host "  2. Add OAuth credentials to Vercel (GOOGLE_CLIENT_ID, etc.)" -ForegroundColor White
Write-Host "  3. Test: curl https://ever-reach-be.vercel.app/api/v1/contacts/import/health" -ForegroundColor White
