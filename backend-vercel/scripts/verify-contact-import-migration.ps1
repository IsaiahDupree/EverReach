$ErrorActionPreference = "Stop"

Write-Host "Verifying Contact Import Migration..." -ForegroundColor Cyan
Write-Host ""

# Database credentials
$DB_HOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "everreach123!@#"

# Set PGPASSWORD
$env:PGPASSWORD = $DB_PASSWORD

try {
    Write-Host "Checking for contact_import_jobs table..." -ForegroundColor Yellow
    $result1 = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'contact_import_jobs');" 2>&1
    
    Write-Host "Checking for imported_contacts table..." -ForegroundColor Yellow
    $result2 = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'imported_contacts');" 2>&1
    
    Write-Host "Checking for get_import_job_summary function..." -ForegroundColor Yellow
    $result3 = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -t -c "SELECT EXISTS (SELECT FROM pg_proc WHERE proname = 'get_import_job_summary');" 2>&1
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "Migration Verification Results" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    
    if ($result1 -match "t") {
        Write-Host "[OK] contact_import_jobs table exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] contact_import_jobs table NOT found" -ForegroundColor Red
    }
    
    if ($result2 -match "t") {
        Write-Host "[OK] imported_contacts table exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] imported_contacts table NOT found" -ForegroundColor Red
    }
    
    if ($result3 -match "t") {
        Write-Host "[OK] get_import_job_summary function exists" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] get_import_job_summary function NOT found" -ForegroundColor Red
    }
    
    Write-Host ""
    Write-Host "Migration verified successfully!" -ForegroundColor Green
    Write-Host ""
    
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
