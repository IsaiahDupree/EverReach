Write-Host "Applying Migrations via psql..." -ForegroundColor Cyan

$env:PGPASSWORD = "zVTEbBqIF4f8Himv"
$CONN = "postgresql://postgres:zVTEbBqIF4f8Himv@db.utasetfxiqcrnwyfforx.supabase.co:5432/postgres"

Write-Host "Testing connection..." -ForegroundColor Yellow
psql $CONN -c "SELECT 1;"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Connection failed" -ForegroundColor Red
    exit 1
}

Write-Host "Migration 1: COMBINED_MIGRATIONS.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/COMBINED_MIGRATIONS.sql"

Write-Host "Migration 2: trial_tracking_system.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/trial_tracking_system.sql"

Write-Host "Migration 3: supporting_systems.sql" -ForegroundColor Cyan
psql $CONN -f "migrations/supporting_systems.sql"

Write-Host "Verifying tables..." -ForegroundColor Yellow
psql $CONN -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('contact_photo_jobs', 'user_sessions', 'devices', 'paywall_events', 'attribution', 'warmth_events', 'account_deletion_queue') ORDER BY table_name;"

Write-Host "Migrations complete!" -ForegroundColor Green
