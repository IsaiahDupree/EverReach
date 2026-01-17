Write-Host "🚀 Applying Migrations to Supabase..." -ForegroundColor Cyan

$env:PGPASSWORD = "zVTEbBqIF4f8Himv"
$CONN = "postgresql://postgres:zVTEbBqIF4f8Himv@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"

Write-Host "📦 Migration 1: COMBINED_MIGRATIONS.sql" -ForegroundColor Yellow
psql $CONN -f "migrations/COMBINED_MIGRATIONS.sql"
if ($LASTEXITCODE -eq 0) { 
    Write-Host "✅ Migration 1 complete" -ForegroundColor Green 
} else { 
    Write-Host "❌ Migration 1 failed" -ForegroundColor Red 
}

Write-Host "`n📦 Migration 2: trial_tracking_system.sql" -ForegroundColor Yellow
psql $CONN -f "migrations/trial_tracking_system.sql"
if ($LASTEXITCODE -eq 0) { 
    Write-Host "✅ Migration 2 complete" -ForegroundColor Green 
} else { 
    Write-Host "❌ Migration 2 failed" -ForegroundColor Red 
}

Write-Host "`n📦 Migration 3: supporting_systems.sql" -ForegroundColor Yellow
psql $CONN -f "migrations/supporting_systems.sql"
if ($LASTEXITCODE -eq 0) { 
    Write-Host "✅ Migration 3 complete" -ForegroundColor Green 
} else { 
    Write-Host "❌ Migration 3 failed" -ForegroundColor Red 
}

Write-Host "`n🔍 Verifying new tables..." -ForegroundColor Cyan
psql $CONN -c "SELECT COUNT(*) as new_tables FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('contact_photo_jobs', 'user_sessions', 'devices', 'paywall_events', 'attribution', 'warmth_events', 'account_deletion_queue');"

Write-Host "`n🎉 Migration process complete!" -ForegroundColor Green
Write-Host "Next: Commit and deploy backend code" -ForegroundColor Cyan
