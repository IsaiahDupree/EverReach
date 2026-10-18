# PowerShell script to run Supabase migrations using .env file
# Reads credentials from .env file

Write-Host "🚀 Running Supabase Migration from CLI (using .env)" -ForegroundColor Cyan
Write-Host ""

# Load .env file
if (-not (Test-Path ".env")) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    Write-Host "Create .env with:" -ForegroundColor Yellow
    Write-Host "  SUPABASE_PROJECT_REF=utasetfxiqcrnwyfforx" -ForegroundColor Cyan
    Write-Host "  SUPABASE_DB_PASSWORD=your-password" -ForegroundColor Cyan
    Write-Host "  SUPABASE_ACCESS_TOKEN=sbp_..." -ForegroundColor Cyan
    exit 1
}

# Parse .env file
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $name = $matches[1].Trim()
        $value = $matches[2].Trim()
        Set-Variable -Name $name -Value $value -Scope Script
    }
}

# Check required variables
if (-not $SUPABASE_PROJECT_REF) {
    Write-Host "❌ SUPABASE_PROJECT_REF not found in .env" -ForegroundColor Red
    exit 1
}

if (-not $SUPABASE_DB_PASSWORD) {
    Write-Host "❌ SUPABASE_DB_PASSWORD not found in .env" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Project: $SUPABASE_PROJECT_REF" -ForegroundColor Green
Write-Host "✅ Password: ***" -ForegroundColor Green
Write-Host ""

# Build connection string
$connectionString = "postgresql://postgres.$SUPABASE_PROJECT_REF`:$SUPABASE_DB_PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres"

# Check which migration to run
$migrationFile = $args[0]
if (-not $migrationFile) {
    Write-Host "Usage: .\run-migration-with-env.ps1 <migration-file>" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Available migrations:" -ForegroundColor Cyan
    Write-Host "  1. migrations/fix-missing-functions.sql" -ForegroundColor White
    Write-Host "  2. migrations/public-api-improvements.sql" -ForegroundColor White
    Write-Host "  3. migrations/enable-e2e-test-data.sql" -ForegroundColor White
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Yellow
    Write-Host "  .\run-migration-with-env.ps1 migrations/fix-missing-functions.sql" -ForegroundColor Cyan
    exit 1
}

if (-not (Test-Path $migrationFile)) {
    Write-Host "❌ Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

Write-Host "📋 Running migration: $migrationFile" -ForegroundColor Yellow
Write-Host ""

# Check if psql is available
$psqlVersion = psql --version 2>$null
if ($psqlVersion) {
    Write-Host "✅ Using psql: $psqlVersion" -ForegroundColor Green
    Write-Host ""
    
    # Run with psql
    psql $connectionString -f $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        exit 1
    }
} else {
    # Try with supabase CLI
    Write-Host "⚠️  psql not found, trying supabase CLI..." -ForegroundColor Yellow
    Write-Host ""
    
    $env:SUPABASE_ACCESS_TOKEN = $SUPABASE_ACCESS_TOKEN
    $env:SUPABASE_DB_PASSWORD = $SUPABASE_DB_PASSWORD
    
    supabase link --project-ref $SUPABASE_PROJECT_REF --password $SUPABASE_DB_PASSWORD
    supabase db push --file $migrationFile
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "❌ Migration failed!" -ForegroundColor Red
        Write-Host ""
        Write-Host "💡 Install psql for better error messages:" -ForegroundColor Yellow
        Write-Host "   https://www.postgresql.org/download/windows/" -ForegroundColor Cyan
        exit 1
    }
}

Write-Host ""
Write-Host "📋 Verifying migration..." -ForegroundColor Yellow
node test-supabase-connection.js

Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
