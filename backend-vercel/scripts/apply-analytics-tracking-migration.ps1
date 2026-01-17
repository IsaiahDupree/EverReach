$ErrorActionPreference = "Stop"

Write-Host "Applying App Analytics Tracking Migration..." -ForegroundColor Cyan

# Database credentials
$DB_HOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "everreach123!@#"

# Migration file
$MIGRATION_FILE = "supabase\migrations\20251102_app_analytics_tracking.sql"

if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "ERROR: Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Applying migration from: $MIGRATION_FILE" -ForegroundColor Yellow
Write-Host ""

# Set PGPASSWORD
$env:PGPASSWORD = $DB_PASSWORD

try {
    # Run psql
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE 2>&1
    
    Write-Host $result
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Analytics Tracking Deployed" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database objects created:" -ForegroundColor Cyan
        Write-Host "  Tables (5):" -ForegroundColor Yellow
        Write-Host "    - tracking_route_manifest (expected pages)" -ForegroundColor Gray
        Write-Host "    - tracking_contracts (required elements)" -ForegroundColor Gray
        Write-Host "    - tracking_route_seen (page views)" -ForegroundColor Gray
        Write-Host "    - tracking_element_seen (button taps)" -ForegroundColor Gray
        Write-Host "    - tracking_events (raw events)" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Views (5):" -ForegroundColor Yellow
        Write-Host "    - tracking_missing_routes" -ForegroundColor Gray
        Write-Host "    - tracking_missing_elements" -ForegroundColor Gray
        Write-Host "    - tracking_coverage_summary" -ForegroundColor Gray
        Write-Host "    - tracking_popular_routes" -ForegroundColor Gray
        Write-Host "    - tracking_element_engagement" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  Functions (4):" -ForegroundColor Yellow
        Write-Host "    - increment_route_views" -ForegroundColor Gray
        Write-Host "    - add_route_duration" -ForegroundColor Gray
        Write-Host "    - increment_element_taps" -ForegroundColor Gray
        Write-Host "    - get_coverage_report" -ForegroundColor Gray
        Write-Host ""
        Write-Host "API Endpoints Ready:" -ForegroundColor Cyan
        Write-Host "  POST /v1/tracking/register-manifest - Register page list" -ForegroundColor Gray
        Write-Host "  POST /v1/tracking/contract - Register expected elements" -ForegroundColor Gray
        Write-Host "  POST /v1/tracking/event - Receive analytics events" -ForegroundColor Gray
        Write-Host "  GET  /v1/tracking/coverage?appVersion=1.0.0 - Coverage report" -ForegroundColor Gray
        Write-Host "  GET  /v1/tracking/dashboard?appVersion=1.0.0 - Dashboard data" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Deploy backend to Vercel" -ForegroundColor Gray
        Write-Host "  2. Implement analytics wrapper in mobile app" -ForegroundColor Gray
        Write-Host "  3. Add TrackedPressable components" -ForegroundColor Gray
        Write-Host "  4. View coverage: curl https://ever-reach-be.vercel.app/api/v1/tracking/coverage?appVersion=1.0.0" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
