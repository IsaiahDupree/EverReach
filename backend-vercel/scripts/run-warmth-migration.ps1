# Run warmth modes migration
# 
# You'll need your DATABASE_URL (PostgreSQL connection string)
# Get it from: Supabase Dashboard > Project Settings > Database > Connection String (URI)

Write-Host "🔧 Running Warmth Modes Migration..." -ForegroundColor Cyan
Write-Host ""

# Check if DATABASE_URL is set
if (-not $env:DATABASE_URL) {
    Write-Host "❌ DATABASE_URL environment variable not set" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please set it first:" -ForegroundColor Yellow
    Write-Host '  $env:DATABASE_URL = "postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres"' -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Get your connection string from:" -ForegroundColor Yellow
    Write-Host "  Supabase Dashboard > Project Settings > Database > Connection String (URI)" -ForegroundColor Yellow
    exit 1
}

# Check if psql is installed
try {
    $null = Get-Command psql -ErrorAction Stop
} catch {
    Write-Host "❌ psql not found" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install PostgreSQL client:" -ForegroundColor Yellow
    Write-Host "  https://www.postgresql.org/download/windows/" -ForegroundColor Yellow
    exit 1
}

# Run the migration
Write-Host "Running migration..." -ForegroundColor Green
psql $env:DATABASE_URL -f supabase/migrations/20251102_warmth_modes.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next step: Run tests" -ForegroundColor Cyan
    Write-Host "  npm run test:warmth:modes:all" -ForegroundColor Yellow
} else {
    Write-Host ""
    Write-Host "❌ Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit $LASTEXITCODE
}
