# Apply Warmth EWMA System Migration
# Uses psql to directly execute the SQL migration

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    APPLYING WARMTH EWMA SYSTEM MIGRATION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details  
$dbHost = "db.utasetfxiqcrnwyfforx.supabase.co"
$dbPort = "5432"
$dbName = "postgres"
$dbUser = "postgres"
$dbPassword = "everreach123!@#"
$migrationFile = "warmth-ewma-system.sql"

Write-Host "[1/3] Checking migration file..." -ForegroundColor Yellow
if (-not (Test-Path $migrationFile)) {
    Write-Host "  [ERROR] Migration file not found: $migrationFile" -ForegroundColor Red
    exit 1
}

$fileSize = (Get-Item $migrationFile).Length
Write-Host "  [OK] Found: $migrationFile ($([math]::Round($fileSize / 1KB, 2)) KB)" -ForegroundColor Green
Write-Host ""

Write-Host "[2/3] Connecting to Supabase database..." -ForegroundColor Yellow
Write-Host "  Host: $dbHost" -ForegroundColor Cyan
Write-Host "  Database: $dbName" -ForegroundColor Cyan
Write-Host ""

# Set password as environment variable
$env:PGPASSWORD = $dbPassword

Write-Host "[3/3] Executing migration..." -ForegroundColor Yellow
Write-Host ""

try {
    # Execute the migration using psql with individual flags
    $output = & psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host "    MIGRATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host ""
        
        # Count successes in output
        $alterCount = ([regex]::Matches($output, 'ALTER TABLE')).Count
        $createCount = ([regex]::Matches($output, 'CREATE INDEX')).Count
        Write-Host "  Tables altered: $alterCount" -ForegroundColor Green
        Write-Host "  Indexes created: $createCount" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Redeploy backend to activate EWMA warmth scoring" -ForegroundColor White
        Write-Host "  2. Run tests to verify warmth increase & decrease" -ForegroundColor White
        Write-Host "     node test\backend\test-latest-endpoints.mjs" -ForegroundColor Cyan
        Write-Host ""
        
        exit 0
    } else {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Red
        Write-Host "    MIGRATION FAILED" -ForegroundColor Red
        Write-Host "============================================================================" -ForegroundColor Red
        Write-Host ""
        Write-Host "Error output:" -ForegroundColor Red
        Write-Host $output -ForegroundColor Gray
        Write-Host ""
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "[ERROR] Failed to execute migration: $_" -ForegroundColor Red
    Write-Host ""
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
