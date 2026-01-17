# Simple Migration Script for Supabase
Write-Host "🚀 Applying Supabase Migrations..." -ForegroundColor Cyan

# Database connection
$env:PGPASSWORD = "zVTEbBqIF4f8Himv"
$CONN = "postgresql://postgres:zVTEbBqIF4f8Himv@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"

# Test connection
Write-Host "Testing connection..." -ForegroundColor Yellow
psql $CONN -c "SELECT 1 as test;"
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Connection failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Connected successfully" -ForegroundColor Green

# Apply migrations
Write-Host "`n📦 Migration 1: COMBINED_MIGRATIONS.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/COMBINED_MIGRATIONS.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration 1 complete" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 1 failed" -ForegroundColor Red
}

Write-Host "`n📦 Migration 2: trial_tracking_system.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/trial_tracking_system.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration 2 complete" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 2 failed" -ForegroundColor Red
}

Write-Host "`n📦 Migration 3: supporting_systems.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/supporting_systems.sql"
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration 3 complete" -ForegroundColor Green
} else {
    Write-Host "❌ Migration 3 failed" -ForegroundColor Red
}

# Verify tables
Write-Host "`n🔍 Verifying new tables..." -ForegroundColor Cyan
psql $CONN -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('contact_photo_jobs', 'user_sessions', 'devices', 'paywall_events', 'attribution', 'warmth_events', 'account_deletion_queue') ORDER BY table_name;"

Write-Host "`n🎉 Migration script complete!" -ForegroundColor Green
