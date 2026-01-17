# PowerShell script to run Supabase migrations from CLI
# Usage: .\run-migration.ps1

Write-Host "🚀 Running Supabase Migration from CLI" -ForegroundColor Cyan
Write-Host ""

# Check if supabase CLI is installed
$supabaseVersion = supabase --version 2>$null
if (-not $supabaseVersion) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install it: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI version: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Option 1: Link project (if not already linked)
Write-Host "📋 Step 1: Linking to Supabase project..." -ForegroundColor Yellow
Write-Host "Project ID: utasetfxiqcrnwyfforx" -ForegroundColor Cyan
Write-Host ""

$linkResult = supabase link --project-ref utasetfxiqcrnwyfforx 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Link failed (may already be linked): $linkResult" -ForegroundColor Yellow
}

Write-Host ""

# Option 2: Run the migration
Write-Host "📋 Step 2: Running migration..." -ForegroundColor Yellow
Write-Host "File: migrations/fix-missing-functions.sql" -ForegroundColor Cyan
Write-Host ""

$migrationResult = supabase db push --file migrations/fix-missing-functions.sql 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed: $migrationResult" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative: Run manually in Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host "   https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql" -ForegroundColor Cyan
    exit 1
}

Write-Host ""

# Step 3: Verify functions were created
Write-Host "📋 Step 3: Verifying functions..." -ForegroundColor Yellow
Write-Host ""

node test-supabase-connection.js

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
