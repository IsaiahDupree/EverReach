# Apply Migrations to Remote Supabase Database
# November 7, 2025

param(
    [switch]$Verify = $false
)

$ErrorActionPreference = "Stop"

# Configuration
$PROJECT_REF = "utasetfxiqcrnwyfforx"
$DB_PASSWORD = "zVTEbBqIF4f8Himv"
$CONNECTION_STRING = "postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"

# Set PostgreSQL password environment variable
$env:PGPASSWORD = $DB_PASSWORD

Write-Host "🚀 Supabase Migration Script" -ForegroundColor Cyan
Write-Host "Project: $PROJECT_REF" -ForegroundColor Gray
Write-Host "Database: db.${PROJECT_REF}.supabase.co" -ForegroundColor Gray
Write-Host ""

# Check if psql is available
try {
    $psqlVersion = psql --version 2>$null
    Write-Host "✅ PostgreSQL Client: $psqlVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ psql not found. Please install PostgreSQL client." -ForegroundColor Red
    exit 1
}

# Test connection
Write-Host "🔌 Testing database connection..." -ForegroundColor Yellow
try {
    $result = psql $CONNECTION_STRING -c "SELECT 1;" -t -A 2>$null
    if ($result -eq "1") {
        Write-Host "✅ Database connection successful" -ForegroundColor Green
    } else {
        throw "Connection test failed"
    }
} catch {
    Write-Host "❌ Cannot connect to database. Check credentials." -ForegroundColor Red
    exit 1
}

if ($Verify) {
    Write-Host "`n🔍 Verifying existing tables..." -ForegroundColor Cyan
    psql $CONNECTION_STRING -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"
    exit 0
}

# Migration files in order
$migrations = @(
    @{
        Name = "COMBINED_MIGRATIONS.sql"
        Description = "User Bio + Contact Photo Jobs"
        File = "migrations/COMBINED_MIGRATIONS.sql"
    },
    @{
        Name = "trial_tracking_system.sql"
        Description = "Session Tracking + Trial System"
        File = "migrations/trial_tracking_system.sql"
    },
    @{
        Name = "supporting_systems.sql"
        Description = "Devices + Paywall + Attribution"
        File = "migrations/supporting_systems.sql"
    }
)

Write-Host "`n📋 Migration Plan:" -ForegroundColor Yellow
for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    Write-Host "  $($i + 1). $($migration.Name) - $($migration.Description)" -ForegroundColor Gray
}

Write-Host "`nPress Enter to continue or Ctrl+C to cancel..."
Read-Host

# Apply each migration
$successCount = 0
for ($i = 0; $i -lt $migrations.Count; $i++) {
    $migration = $migrations[$i]
    $stepNum = $i + 1
    
    Write-Host "`n📦 Step $stepNum/$($migrations.Count): Applying $($migration.Name)..." -ForegroundColor Cyan
    Write-Host "    $($migration.Description)" -ForegroundColor Gray
    
    # Check if file exists
    if (-not (Test-Path $migration.File)) {
        Write-Host "❌ Migration file not found: $($migration.File)" -ForegroundColor Red
        continue
    }
    
    try {
        # Apply migration
        psql $CONNECTION_STRING -f $migration.File
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Migration $stepNum applied successfully" -ForegroundColor Green
            $successCount++
        } else {
            Write-Host "❌ Migration $stepNum failed (exit code: $LASTEXITCODE)" -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Error applying migration $stepNum`: $($_.Exception.Message)" -ForegroundColor Red
    }
}

# Summary
Write-Host "`n📊 Migration Summary:" -ForegroundColor Cyan
Write-Host "  Applied: $successCount/$($migrations.Count)" -ForegroundColor $(if ($successCount -eq $migrations.Count) { "Green" } else { "Yellow" })

if ($successCount -eq $migrations.Count) {
    Write-Host "`n🎉 All migrations applied successfully!" -ForegroundColor Green
    
    # Verify new tables
    Write-Host "`n🔍 Verifying new tables..." -ForegroundColor Cyan
    $expectedTables = @(
        'contact_photo_jobs',
        'user_sessions', 
        'devices',
        'paywall_events',
        'attribution',
        'warmth_events',
        'account_deletion_queue'
    )
    
    $tableList = ($expectedTables -join "', '")
    $verifyQuery = "SELECT table_name, 'exists' as status FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('$tableList') ORDER BY table_name;"
    
    psql $CONNECTION_STRING -c $verifyQuery
    
    Write-Host "`n✨ Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Commit and push backend code changes" -ForegroundColor Gray
    Write-Host "  2. Deploy to Vercel" -ForegroundColor Gray
    Write-Host "  3. Test endpoints" -ForegroundColor Gray
    
} else {
    Write-Host "`n⚠️  Some migrations failed. Check the output above." -ForegroundColor Yellow
    Write-Host "You may need to apply failed migrations manually via Supabase SQL Editor." -ForegroundColor Gray
}

Write-Host "`n🔗 Useful links:" -ForegroundColor Cyan
Write-Host "  Supabase Dashboard: https://supabase.com/dashboard/project/$PROJECT_REF" -ForegroundColor Blue
Write-Host "  SQL Editor: https://supabase.com/dashboard/project/$PROJECT_REF/sql/new" -ForegroundColor Blue
