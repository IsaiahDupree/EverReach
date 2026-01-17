# Apply Marketing Intelligence Schema Migration
# Uses psql to directly execute the SQL migration

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host "    APPLYING MARKETING INTELLIGENCE SCHEMA MIGRATION" -ForegroundColor Cyan
Write-Host "============================================================================" -ForegroundColor Cyan
Write-Host ""

# Database connection details
$dbHost = "aws-0-us-east-1.pooler.supabase.com"
$dbPort = "6543"
$dbName = "postgres"
$dbUser = "postgres.utasetfxiqcrnwyfforx"
$dbPassword = "everreach123!@#"
$migrationFile = "marketing-intelligence-schema.sql"

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
    # Execute the migration using psql
    $connectionString = "postgresql://${dbUser}@${dbHost}:${dbPort}/${dbName}?sslmode=require"
    
    $output = psql $connectionString -f $migrationFile 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host "    MIGRATION COMPLETED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "============================================================================" -ForegroundColor Green
        Write-Host ""
        
        # Count successes in output
        $createCount = ([regex]::Matches($output, 'CREATE')).Count
        Write-Host "  Objects created: $createCount" -ForegroundColor Green
        Write-Host ""
        
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Re-run comprehensive tests to verify API endpoints work" -ForegroundColor White
        Write-Host "     .\test\agent\run-comprehensive-tests.ps1" -ForegroundColor Cyan
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
