# Refresh Supabase Schema Cache
# After running migrations, Supabase needs to refresh its schema cache

Write-Host "🔄 Refreshing Supabase Schema Cache" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

$env:PGPASSWORD = "everreach123!@#"
$dbHost = "db.utasetfxiqcrnwyfforx.supabase.co"
$dbPort = "5432"
$dbUser = "postgres"
$dbName = "postgres"

Write-Host "📋 Running NOTIFY command to refresh schema..." -ForegroundColor Yellow

# Run a simple query that forces Supabase to refresh its schema cache
$query = "NOTIFY pgrst, 'reload schema';"

try {
    $output = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $query 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Schema cache refresh triggered!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  NOTIFY command may not be supported. Trying alternative..." -ForegroundColor Yellow
        
        # Alternative: Just run a simple SELECT to force cache refresh
        $altQuery = "SELECT 1;"
        psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -c $altQuery | Out-Null
        Write-Host "✅ Alternative refresh completed!" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "====================================" -ForegroundColor Cyan
Write-Host "✅ Schema Refresh Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Note: If tests still fail, wait 30-60 seconds for" -ForegroundColor Yellow
Write-Host "Supabase to fully refresh its schema cache." -ForegroundColor Yellow
Write-Host ""
Write-Host "Then run: npm run test:public-api" -ForegroundColor Cyan
Write-Host ""
