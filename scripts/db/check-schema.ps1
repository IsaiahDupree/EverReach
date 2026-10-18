# Check Current Database Schema

Write-Host "Checking current database schema...`n" -ForegroundColor Cyan

$env:PGPASSWORD = "everreach123!@#"

$PSQL = "C:\Program Files\PostgreSQL\16\bin\psql.exe"
$DBHOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$PORT = "5432"
$DATABASE = "postgres"
$USER = "postgres"

# Check for campaigns table
Write-Host "Checking campaigns table..." -ForegroundColor Yellow
$SQL = @"
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'campaigns' 
ORDER BY ordinal_position;
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

Write-Host "`nChecking templates table..." -ForegroundColor Yellow
$SQL = @"
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'templates' 
ORDER BY ordinal_position;
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

Write-Host "`nChecking deliveries table..." -ForegroundColor Yellow
$SQL = @"
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'deliveries' 
ORDER BY ordinal_position;
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

Write-Host "`nCounting existing data..." -ForegroundColor Yellow
$SQL = @"
SELECT 'campaigns' as table_name, COUNT(*) as count FROM campaigns
UNION ALL
SELECT 'templates', COUNT(*) FROM templates
UNION ALL
SELECT 'deliveries', COUNT(*) FROM deliveries;
"@

$SQL | & $PSQL -h $DBHOST -p $PORT -U $USER -d $DATABASE

$env:PGPASSWORD = ""
