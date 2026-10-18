# Run Developer Dashboard Migrations
# Connects to Supabase and runs all dashboard migrations

$ErrorActionPreference = "Stop"

Write-Host "🔧 EverReach Developer Dashboard - Migration Script" -ForegroundColor Cyan
Write-Host ""

# Database credentials
$DB_HOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "everreach123!@#"
$DATABASE_URL = "postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

# Migration files
$MIGRATIONS = @(
    "backend-vercel\migrations\developer-dashboard-system.sql",
    "backend-vercel\migrations\feature-flags-ab-testing.sql"
)

Write-Host "📊 Database: $DB_HOST" -ForegroundColor Yellow
Write-Host "🗄️  Migrations to run: $($MIGRATIONS.Length)" -ForegroundColor Yellow
Write-Host ""

# Check if psql is available
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ Error: psql not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PostgreSQL client:" -ForegroundColor Yellow
    Write-Host "  choco install postgresql" -ForegroundColor Cyan
    Write-Host "  or download from: https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
    exit 1
}

# Run migrations
foreach ($migration in $MIGRATIONS) {
    $migrationPath = Join-Path $PSScriptRoot "..\$migration"
    
    if (-not (Test-Path $migrationPath)) {
        Write-Host "❌ Migration file not found: $migration" -ForegroundColor Red
        exit 1
    }
    
    $fileName = Split-Path $migration -Leaf
    Write-Host "📝 Running: $fileName" -ForegroundColor Green
    
    try {
        $env:PGPASSWORD = $DB_PASSWORD
        psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $migrationPath
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Success: $fileName" -ForegroundColor Green
            Write-Host ""
        } else {
            Write-Host "❌ Failed: $fileName (exit code: $LASTEXITCODE)" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "❌ Error running migration: $_" -ForegroundColor Red
        exit 1
    } finally {
        Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
    }
}

Write-Host "✨ All migrations completed successfully!" -ForegroundColor Green
Write-Host ""

# Verify tables were created
Write-Host "🔍 Verifying tables..." -ForegroundColor Cyan
$verifyQuery = @"
SELECT tablename 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'admin_users', 
    'admin_sessions', 
    'feature_flags', 
    'experiments',
    'email_campaigns',
    'social_posts',
    'meta_ad_campaigns'
)
ORDER BY tablename;
"@

try {
    $env:PGPASSWORD = $DB_PASSWORD
    $tables = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -A -c $verifyQuery
    
    if ($tables) {
        Write-Host "✅ Tables created:" -ForegroundColor Green
        $tables -split "`n" | Where-Object { $_ } | ForEach-Object {
            Write-Host "   - $_" -ForegroundColor Gray
        }
    } else {
        Write-Host "⚠️  Warning: No tables found (check migration logs)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Could not verify tables: $_" -ForegroundColor Yellow
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Create admin user:" -ForegroundColor Yellow
Write-Host "     node -e `"const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('yourpassword', 10));`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Insert admin user (replace <hash> with output above):" -ForegroundColor Yellow
Write-Host "     psql `$DATABASE_URL -c `"INSERT INTO admin_users (email, password_hash, name, role) VALUES ('admin@everreach.app', '<hash>', 'Admin', 'super_admin');`"" -ForegroundColor Gray
Write-Host ""
Write-Host "  3. Test login:" -ForegroundColor Yellow
Write-Host "     curl -X POST https://ever-reach-be.vercel.app/api/admin/auth/signin -H `"Content-Type: application/json`" -d '{`"email`":`"admin@everreach.app`",`"password`":`"yourpassword`"}'" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Dashboard API ready to deploy!" -ForegroundColor Green
