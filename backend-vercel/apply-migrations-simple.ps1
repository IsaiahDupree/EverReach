$ErrorActionPreference = "Stop"

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Apply Trial Tracking & Supporting Cast" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Set access token
$env:SUPABASE_ACCESS_TOKEN = "sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a"

# Check Supabase CLI
$supabaseVersion = supabase --version 2>$null
if (-not $supabaseVersion) {
    Write-Host "❌ Supabase CLI not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Supabase CLI: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Link project
Write-Host "📋 Linking to project..." -ForegroundColor Yellow
supabase link --project-ref utasetfxiqcrnwyfforx
Write-Host ""

# Apply Migration 1
Write-Host "📦 Migration 1: COMBINED_MIGRATIONS.sql" -ForegroundColor Cyan
if (Test-Path "migrations/COMBINED_MIGRATIONS.sql") {
    $sql1 = Get-Content "migrations/COMBINED_MIGRATIONS.sql" -Raw
    $sql1 | Out-File -FilePath "temp1.sql" -Encoding UTF8 -NoNewline
    
    supabase db execute --file "temp1.sql" --password "zVTEbBqIF4f8Himv"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 1 applied" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration 1 failed" -ForegroundColor Red
    }
    
    Remove-Item "temp1.sql" -ErrorAction SilentlyContinue
} else {
    Write-Host "❌ Migration file not found" -ForegroundColor Red
}

Write-Host ""

# Apply Migration 2
Write-Host "📦 Migration 2: trial_tracking_system.sql" -ForegroundColor Cyan
if (Test-Path "migrations/trial_tracking_system.sql") {
    $sql2 = Get-Content "migrations/trial_tracking_system.sql" -Raw
    $sql2 | Out-File -FilePath "temp2.sql" -Encoding UTF8 -NoNewline
    
    supabase db execute --file "temp2.sql" --password "zVTEbBqIF4f8Himv"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 2 applied" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration 2 failed" -ForegroundColor Red
    }
    
    Remove-Item "temp2.sql" -ErrorAction SilentlyContinue
} else {
    Write-Host "❌ Migration file not found" -ForegroundColor Red
}

Write-Host ""

# Apply Migration 3
Write-Host "📦 Migration 3: supporting_systems.sql" -ForegroundColor Cyan
if (Test-Path "migrations/supporting_systems.sql") {
    $sql3 = Get-Content "migrations/supporting_systems.sql" -Raw
    $sql3 | Out-File -FilePath "temp3.sql" -Encoding UTF8 -NoNewline
    
    supabase db execute --file "temp3.sql" --password "zVTEbBqIF4f8Himv"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Migration 3 applied" -ForegroundColor Green
    } else {
        Write-Host "❌ Migration 3 failed" -ForegroundColor Red
    }
    
    Remove-Item "temp3.sql" -ErrorAction SilentlyContinue
} else {
    Write-Host "❌ Migration file not found" -ForegroundColor Red
}

Write-Host ""

# Verify
Write-Host "📋 Verifying tables..." -ForegroundColor Yellow
$verifySQL = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('contact_photo_jobs', 'user_sessions', 'devices', 'paywall_events', 'attribution', 'warmth_events', 'account_deletion_queue') ORDER BY table_name;"

$verifySQL | Out-File -FilePath "verify.sql" -Encoding UTF8 -NoNewline
supabase db execute --file "verify.sql" --password "zVTEbBqIF4f8Himv"
Remove-Item "verify.sql" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🎉 Migration script complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next: Commit and push code changes" -ForegroundColor Cyan
