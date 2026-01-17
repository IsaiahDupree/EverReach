# Apply Migrations to Supabase - Robust Version
# Based on successful migration patterns from existing scripts

$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Apply Trial Tracking & Supporting Cast" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"
$PROJECT_REF = "utasetfxiqcrnwyfforx"
$DB_PASSWORD = "zVTEbBqIF4f8Himv"

# Check Supabase CLI
$supabaseVersion = supabase --version 2>$null
if (-not $supabaseVersion) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    Write-Host "Install: https://supabase.com/docs/guides/cli/getting-started" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Supabase CLI: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Migration files in order
$migrations = @(
    @{
        Name = "COMBINED_MIGRATIONS.sql"
        Description = "User Bio + Contact Photo Jobs"
        File = "migrations/COMBINED_MIGRATIONS.sql"
        TempFile = "temp-migration-1.sql"
    },
    @{
        Name = "trial_tracking_system.sql"
        Description = "Session Tracking + Trial System"
        File = "migrations/trial_tracking_system.sql"
        TempFile = "temp-migration-2.sql"
    },
    @{
        Name = "supporting_systems.sql"
        Description = "Devices + Paywall + Attribution"
        File = "migrations/supporting_systems.sql"
        TempFile = "temp-migration-3.sql"
    }
)

Write-Host "📋 Migration Plan:" -ForegroundColor Yellow
for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    Write-Host "  $($i + 1). $($migration.Name)" -ForegroundColor Gray
    Write-Host "     $($migration.Description)" -ForegroundColor DarkGray
}
Write-Host ""

# Confirm before proceeding
Write-Host "Press Enter to continue or Ctrl+C to cancel..."
$null = Read-Host

# Step 1: Link project (if needed)
Write-Host "📋 Step 1: Linking to project $PROJECT_REF..." -ForegroundColor Yellow
$linkResult = supabase link --project-ref $PROJECT_REF 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Project linked successfully!" -ForegroundColor Green
} else {
    Write-Host "⚠️  Link result: $linkResult" -ForegroundColor Yellow
    Write-Host "   (May already be linked - continuing...)" -ForegroundColor Gray
}
Write-Host ""

# Step 2: Apply each migration
$successCount = 0
for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    $stepNum = $i + 1
    
    Write-Host "📦 Step $($stepNum + 1): Applying $($migration.Name)..." -ForegroundColor Cyan
    Write-Host "    $($migration.Description)" -ForegroundColor Gray
    
    # Check if file exists
    if (-not (Test-Path $migration.File)) {
        Write-Host "❌ Migration file not found: $($migration.File)" -ForegroundColor Red
        continue
    }
    
    try {
        # Read SQL content
        $sql = Get-Content $migration.File -Raw
        
        # Save to temp file for CLI (UTF8 encoding)
        $sql | Out-File -FilePath $migration.TempFile -Encoding UTF8 -NoNewline
        
        # Execute via Supabase CLI
        $result = supabase db execute --file $migration.TempFile --password $DB_PASSWORD 2>&1
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration $stepNum applied successfully!" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ Migration $stepNum failed!" -ForegroundColor Red
            Write-Host "   Error: $result" -ForegroundColor DarkRed
        }
        
    } catch {
        Write-Host "❌ Exception applying migration $stepNum`: $($_.Exception.Message)" -ForegroundColor Red
    } finally {
        # Clean up temp file
        if (Test-Path $migration.TempFile) {
            Remove-Item $migration.TempFile -ErrorAction SilentlyContinue
        }
    }
    
    Write-Host ""
}

# Step 3: Verification
Write-Host "📋 Step $($migrations.Count + 2): Verifying migrations..." -ForegroundColor Yellow
Write-Host ""

# Create comprehensive verification SQL
$verifySQL = @"
-- Verify all new tables exist
SELECT 
    table_name,
    'exists' as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'contact_photo_jobs',
    'user_sessions',
    'devices',
    'paywall_events',
    'attribution',
    'warmth_events',
    'account_deletion_queue'
  )
ORDER BY table_name;

-- Verify new columns
SELECT 
    table_name || '.' || column_name as column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'profiles' AND column_name IN ('bio', 'first_seen_at', 'last_active_at', 'marketing_emails', 'tracking_consent'))
    OR
    (table_name = 'user_subscriptions' AND column_name IN ('origin', 'trial_started_at', 'trial_ends_at', 'subscribed_at'))
  )
ORDER BY table_name, column_name;

-- Verify helper functions
SELECT 
    proname as function_name,
    'exists' as status
FROM pg_proc
WHERE proname IN (
    'usage_seconds_between',
    'end_session_secure',
    'check_trial_eligibility',
    'get_warmth_bands',
    'upsert_attribution',
    'queue_contact_photo_download'
)
ORDER BY proname;
"@

# Save verification SQL to temp file
$verifySQL | Out-File -FilePath "temp-verify.sql" -Encoding UTF8 -NoNewline

try {
    # Execute verification
    $verifyResult = supabase db execute --file "temp-verify.sql" --password $DB_PASSWORD 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Verification Results:" -ForegroundColor Cyan
        Write-Host $verifyResult -ForegroundColor Gray
    } else {
        Write-Host "⚠️  Verification query failed: $verifyResult" -ForegroundColor Yellow
    }
    
} finally {
    # Clean up verification file
    Remove-Item "temp-verify.sql" -ErrorAction SilentlyContinue
}

Write-Host ""

# Final summary
if ($successCount -eq $migrations.Count) {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "🎉 All Migrations Applied Successfully!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Applied: $successCount/$($migrations.Count) migrations" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Commit and push backend code:" -ForegroundColor Gray
    Write-Host "     git add ." -ForegroundColor DarkGray
    Write-Host "     git commit -m 'feat: trial tracking + supporting cast'" -ForegroundColor DarkGray
    Write-Host "     git push origin feat/dev-dashboard" -ForegroundColor DarkGray
    Write-Host ""
    Write-Host "  2. Deploy will trigger automatically on push" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  3. Test endpoints after deployment:" -ForegroundColor Gray
    Write-Host "     .\check-deployed-endpoints.ps1" -ForegroundColor DarkGray
    Write-Host ""
    
} else {
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host "⚠️  Partial Migration Success" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Applied: $successCount/$($migrations.Count) migrations" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Some migrations failed. Options:" -ForegroundColor Yellow
    Write-Host "  1. Check error messages above" -ForegroundColor Gray
    Write-Host "  2. Apply failed migrations manually:" -ForegroundColor Gray
    Write-Host "     https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Blue
    Write-Host ""
}

Write-Host "🔗 Supabase Dashboard:" -ForegroundColor Cyan
Write-Host "   https://supabase.com/dashboard/project/$PROJECT_REF" -ForegroundColor Blue
Write-Host ""
