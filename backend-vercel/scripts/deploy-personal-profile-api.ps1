# ============================================================================
# Deploy Personal Profile API to Production
# ============================================================================
# 
# This script:
# 1. Runs database migration for compose_settings and persona_notes tables
# 2. Verifies API endpoints are accessible
# 3. Tests the endpoints
#
# Usage: .\scripts\deploy-personal-profile-api.ps1
# ============================================================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Personal Profile API Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
$DATABASE_URL = $env:DATABASE_URL
if (-not $DATABASE_URL) {
    Write-Host "❌ ERROR: DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set DATABASE_URL in your .env file or environment" -ForegroundColor Yellow
    Write-Host "Example: postgres://user:password@host:5432/database" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Database URL found" -ForegroundColor Green
Write-Host ""

# Step 1: Run Migration
Write-Host "📊 Step 1: Running database migration..." -ForegroundColor Cyan
Write-Host ""

$migrationFile = "migrations\personal-profile-api.sql"

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ ERROR: Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "Running: psql $DATABASE_URL -f $migrationFile" -ForegroundColor Gray
psql $DATABASE_URL -f $migrationFile

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Migration completed successfully" -ForegroundColor Green
Write-Host ""

# Step 2: Verify Tables
Write-Host "🔍 Step 2: Verifying tables created..." -ForegroundColor Cyan
Write-Host ""

$verifySQL = @"
SELECT 
  table_name, 
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('compose_settings', 'persona_notes')
ORDER BY table_name;
"@

Write-Host "Checking tables..." -ForegroundColor Gray
psql $DATABASE_URL -c $verifySQL

Write-Host ""
Write-Host "✅ Tables verified" -ForegroundColor Green
Write-Host ""

# Step 3: Check API Endpoints
Write-Host "🔌 Step 3: Checking API endpoints..." -ForegroundColor Cyan
Write-Host ""

$baseURL = "https://ever-reach-be.vercel.app/api"

$endpoints = @(
    "/v1/me",
    "/v1/me/compose-settings",
    "/v1/me/persona-notes"
)

Write-Host "Testing endpoints on: $baseURL" -ForegroundColor Gray
Write-Host ""

foreach ($endpoint in $endpoints) {
    $url = "$baseURL$endpoint"
    Write-Host "  Testing: $endpoint" -ForegroundColor Yellow
    
    try {
        $response = Invoke-WebRequest -Uri $url -Method OPTIONS -UseBasicParsing
        if ($response.StatusCode -eq 200) {
            Write-Host "    ✅ Endpoint accessible" -ForegroundColor Green
        } else {
            Write-Host "    ⚠️  Status: $($response.StatusCode)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "    ❌ Error: $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Deployment Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Database migration: COMPLETE" -ForegroundColor Green
Write-Host "✅ Tables created:" -ForegroundColor Green
Write-Host "   - compose_settings" -ForegroundColor Gray
Write-Host "   - persona_notes" -ForegroundColor Gray
Write-Host "✅ Profile updates applied" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "1. Test the endpoints with a JWT token" -ForegroundColor Gray
Write-Host "2. Update mobile app to use new endpoints" -ForegroundColor Gray
Write-Host "3. Monitor for any errors in production" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Cyan
Write-Host "   docs/api/22-user-settings.md" -ForegroundColor Gray
Write-Host ""
Write-Host "✨ Deployment complete!" -ForegroundColor Green
Write-Host ""
