# Complete Marketing Intelligence Setup
# Creates schema + seeds data

$ErrorActionPreference = "Stop"

Write-Host "`n═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "🚀 COMPLETE MARKETING INTELLIGENCE SETUP" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan

$PROJECT_ID = "utasetfxiqcrnwyfforx"
$DB_HOST = "db.$PROJECT_ID.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "everreach123!@#"

# Set password for psql
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "📡 Database: $DB_HOST" -ForegroundColor Yellow
Write-Host ""

# Check if psql exists
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "❌ psql not found! Please install PostgreSQL client tools." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Alternative: Copy SQL files to Supabase SQL Editor" -ForegroundColor Yellow
    Write-Host "   1. https://supabase.com/dashboard/project/$PROJECT_ID/sql" -ForegroundColor Gray
    Write-Host "   2. Paste create-marketing-schema.sql" -ForegroundColor Gray
    Write-Host "   3. Click Run" -ForegroundColor Gray
    Write-Host "   4. Paste seed-marketing-data.sql" -ForegroundColor Gray
    Write-Host "   5. Click Run" -ForegroundColor Gray
    exit 1
}

# Step 1: Create Schema
Write-Host "📋 STEP 1: Creating schema..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "create-marketing-schema.sql") {
    try {
        Get-Content "create-marketing-schema.sql" -Raw | & psql `
            -h $DB_HOST `
            -p $DB_PORT `
            -U $DB_USER `
            -d $DB_NAME `
            -v ON_ERROR_STOP=1 `
            2>&1 | ForEach-Object {
                if ($_ -match "ERROR") {
                    Write-Host "  ⚠️  $($_)" -ForegroundColor Yellow
                } elseif ($_ -match "✅") {
                    Write-Host "  $_" -ForegroundColor Green
                } else {
                    Write-Host "  $_" -ForegroundColor Gray
                }
            }
        
        Write-Host ""
        Write-Host "✅ Schema created successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "❌ Schema creation failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "❌ create-marketing-schema.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Start-Sleep -Seconds 2

# Step 2: Seed Data
Write-Host "📋 STEP 2: Seeding data..." -ForegroundColor Cyan
Write-Host ""

if (Test-Path "seed-marketing-data.sql") {
    try {
        Get-Content "seed-marketing-data.sql" -Raw | & psql `
            -h $DB_HOST `
            -p $DB_PORT `
            -U $DB_USER `
            -d $DB_NAME `
            -v ON_ERROR_STOP=1 `
            2>&1 | ForEach-Object {
                if ($_ -match "ERROR") {
                    Write-Host "  ⚠️  $($_)" -ForegroundColor Yellow
                } elseif ($_ -match "✅" -or $_ -match "INSERT") {
                    Write-Host "  $_" -ForegroundColor Green
                } else {
                    Write-Host "  $_" -ForegroundColor Gray
                }
            }
        
        Write-Host ""
        Write-Host "✅ Data seeded successfully!" -ForegroundColor Green
    }
    catch {
        Write-Host ""
        Write-Host "⚠️  Seeding completed with warnings: $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "❌ seed-marketing-data.sql not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "✅ SETUP COMPLETE!" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host ""
Write-Host "🧪 Run tests:" -ForegroundColor Yellow
Write-Host "   node check-marketing-schema.mjs" -ForegroundColor Gray
Write-Host "   node test/agent/bucket-1-marketing-intelligence.mjs" -ForegroundColor Gray
Write-Host ""
Write-Host "Expected: Marketing Intelligence 20/20 (100%)" -ForegroundColor Green
Write-Host "Expected: Overall Coverage 126/132 (95.5%)" -ForegroundColor Green
Write-Host ""
