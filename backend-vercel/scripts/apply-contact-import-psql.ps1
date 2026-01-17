$ErrorActionPreference = "Stop"

Write-Host "Applying Contact Import Migration via psql..." -ForegroundColor Cyan

# Database credentials
$DB_HOST = "db.utasetfxiqcrnwyfforx.supabase.co"
$DB_PORT = "5432"
$DB_NAME = "postgres"
$DB_USER = "postgres"
$DB_PASSWORD = "everreach123!@#"

# Migration file
$MIGRATION_FILE = "supabase\migrations\20251102_contact_imports.sql"

if (-not (Test-Path $MIGRATION_FILE)) {
    Write-Host "ERROR: Migration file not found: $MIGRATION_FILE" -ForegroundColor Red
    exit 1
}

Write-Host "Applying migration from: $MIGRATION_FILE" -ForegroundColor Yellow
Write-Host ""

# Set PGPASSWORD environment variable for psql
$env:PGPASSWORD = $DB_PASSWORD

try {
    # Run psql
    $result = psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $MIGRATION_FILE 2>&1
    
    Write-Host $result
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "SUCCESS! Migration Applied" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Database objects created:" -ForegroundColor Cyan
        Write-Host "  - contact_import_jobs table" -ForegroundColor Gray
        Write-Host "  - imported_contacts table" -ForegroundColor Gray
        Write-Host "  - 7 indexes for performance" -ForegroundColor Gray
        Write-Host "  - 3 helper functions" -ForegroundColor Gray
        Write-Host "  - RLS policies for security" -ForegroundColor Gray
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Cyan
        Write-Host "  1. Add OAuth credentials to Vercel" -ForegroundColor Gray
        Write-Host "     GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET" -ForegroundColor Gray
        Write-Host "     MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  2. Test health endpoint:" -ForegroundColor Gray
        Write-Host "     curl https://ever-reach-be.vercel.app/api/v1/contacts/import/health" -ForegroundColor Gray
        Write-Host ""
        Write-Host "  3. Test OAuth flow:" -ForegroundColor Gray
        Write-Host "     node test/backend/test-contact-import.mjs" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host ""
        Write-Host "ERROR: Migration failed with exit code: $LASTEXITCODE" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: $_" -ForegroundColor Red
    exit 1
} finally {
    # Clear password from environment
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}
