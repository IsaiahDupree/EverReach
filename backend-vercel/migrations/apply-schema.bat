@echo off
setlocal

echo.
echo ============================================================================
echo     MARKETING INTELLIGENCE SCHEMA MIGRATION
echo ============================================================================
echo.

set PGPASSWORD=everreach123!@#
set PGHOST=db.utasetfxiqcrnwyfforx.supabase.co
set PGPORT=5432
set PGDATABASE=postgres
set PGUSER=postgres
set MIGRATION_FILE=marketing-intelligence-schema.sql

echo [1/3] Checking migration file...
if not exist "%MIGRATION_FILE%" (
    echo   [ERROR] Migration file not found: %MIGRATION_FILE%
    pause
    exit /b 1
)
echo   [OK] Found: %MIGRATION_FILE%
echo.

echo [2/3] Connecting to Supabase database...
echo   Host: db.utasetfxiqcrnwyfforx.supabase.co
echo   Database: postgres
echo.

echo [3/3] Executing migration...
echo   This will create tables, views, and functions...
echo.

psql -f "%MIGRATION_FILE%"

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ============================================================================
    echo     MIGRATION COMPLETED SUCCESSFULLY!
    echo ============================================================================
    echo.
    echo Next steps:
    echo   1. Re-run comprehensive tests to verify API endpoints work
    echo      .\test\agent\run-comprehensive-tests.ps1
    echo.
) else (
    echo.
    echo ============================================================================
    echo     MIGRATION FAILED
    echo ============================================================================
    echo.
    echo Error code: %ERRORLEVEL%
    echo.
    echo Please check the error message above.
    echo.
)
