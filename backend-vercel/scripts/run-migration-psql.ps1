$ErrorActionPreference = "Stop"

Write-Host "Running Personal Profile API migration..." -ForegroundColor Cyan
Write-Host ""

# Connection details - use direct connection, not pooler
$dbHost = "db.bvhqolnytimehzpwdiqd.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"
$dbPass = "everreach123!@#"

# Set PGPASSWORD environment variable
$env:PGPASSWORD = $dbPass

Write-Host "Connecting to Supabase database..." -ForegroundColor Yellow
Write-Host "Host: $dbHost" -ForegroundColor Gray
Write-Host "Port: $dbPort" -ForegroundColor Gray
Write-Host "User: $dbUser" -ForegroundColor Gray
Write-Host ""

# Run migration
Write-Host "Executing migration..." -ForegroundColor Yellow
psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f migrations/personal-profile-api.sql

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    Write-Host ""
    
    # Verify tables
    Write-Host "Verifying tables..." -ForegroundColor Yellow
    $verifySQL = "SELECT table_name, (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count FROM information_schema.tables t WHERE table_schema = 'public' AND table_name IN ('compose_settings', 'persona_notes') ORDER BY table_name;"
    
    psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $verifySQL
    
    Write-Host ""
    Write-Host "✅ Tables verified!" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    exit 1
}

# Clear password
Remove-Item Env:PGPASSWORD
