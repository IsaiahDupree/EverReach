$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Migrate & Verify Personal Profile" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Step 1: Show what will be migrated
Write-Host "Step 1: Pending migrations" -ForegroundColor Yellow
Write-Host ""

$pendingMigrations = Get-ChildItem "supabase\migrations\*.sql" | Where-Object { 
    $_.Name -match "^202510261545" -or $_.Name -match "^202510261523"
}

if ($pendingMigrations.Count -eq 0) {
    Write-Host "  No new migrations to apply" -ForegroundColor Gray
} else {
    foreach ($migration in $pendingMigrations) {
        Write-Host "  • $($migration.Name)" -ForegroundColor Gray
    }
}

Write-Host ""

# Step 2: Push migrations
Write-Host "Step 2: Pushing migrations..." -ForegroundColor Yellow
Write-Host ""

& supabase db push -p "everreach123!@#"

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration push failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 3: Verifying schema..." -ForegroundColor Yellow
Write-Host ""

# Create verification SQL
$verifySQL = @"
-- Verification queries
SELECT 
    'compose_settings' as table_name,
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='compose_settings') as exists
UNION ALL
SELECT 
    'persona_notes',
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='persona_notes')
UNION ALL
SELECT
    'persona_notes.linked_contacts',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='persona_notes' AND column_name='linked_contacts')
UNION ALL
SELECT
    'profiles.display_name',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='display_name')
UNION ALL
SELECT
    'profiles.preferences',
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='preferences')
UNION ALL
SELECT
    'idx_persona_notes_contacts',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_contacts')
UNION ALL
SELECT
    'idx_persona_notes_user',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_user')
UNION ALL
SELECT
    'idx_persona_notes_type',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_type')
UNION ALL
SELECT
    'idx_persona_notes_tags',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_tags')
UNION ALL
SELECT
    'idx_persona_notes_created',
    EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='idx_persona_notes_created');
"@

# Save to temp file
$verifySQL | Out-File -FilePath "temp-verify.sql" -Encoding UTF8

# Execute verification
$verifyResult = & supabase db execute -f "temp-verify.sql"

# Clean up temp file
Remove-Item "temp-verify.sql" -ErrorAction SilentlyContinue

# Parse results
Write-Host "Verification Results:" -ForegroundColor Cyan
Write-Host ""

$allPassed = $true
foreach ($line in $verifyResult) {
    if ($line -match "^\s*(\S+)\s+\|\s+(t|f)\s*$") {
        $item = $matches[1]
        $exists = $matches[2] -eq "t"
        
        if ($exists) {
            Write-Host "  ✅ $item" -ForegroundColor Green
        } else {
            Write-Host "  ❌ $item" -ForegroundColor Red
            $allPassed = $false
        }
    }
}

Write-Host ""

if ($allPassed) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "✅ Migration Complete & Verified!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "All schema elements are in place." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Run smoke tests:" -ForegroundColor Gray
    Write-Host "     `$env:API_BASE='https://ever-reach-be.vercel.app'" -ForegroundColor Gray
    Write-Host "     node test/profile-smoke.mjs" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⚠️  Verification Failed" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Some schema elements are missing." -ForegroundColor Yellow
    Write-Host "Check the output above for details." -ForegroundColor Gray
    Write-Host ""
    exit 1
}
