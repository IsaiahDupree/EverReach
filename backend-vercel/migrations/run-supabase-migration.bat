@echo off
echo ============================================================
echo SUPABASE MIGRATION - Marketing Intelligence Schema
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Setting Supabase access token...
set SUPABASE_ACCESS_TOKEN=sbp_604c288bee5faac07529185d8cbe4f40b0c5ad0a
echo   [OK] Token set
echo.

echo [2/4] Linking to Supabase project...
cd ..
supabase link --project-ref utasetfxiqcrnwyfforx
if errorlevel 1 (
    echo   [ERROR] Failed to link project
    pause
    exit /b 1
)
echo   [OK] Project linked
echo.

echo [3/4] Checking migration file...
if not exist "migrations\marketing-intelligence-schema.sql" (
    echo   [ERROR] Migration file not found
    pause
    exit /b 1
)
echo   [OK] Migration file found
echo.

echo [4/4] Running database migration...
echo   This will create:
echo   - 15 tables
echo   - 5 views
echo   - 3 functions
echo.
echo   Executing migration...
supabase db push
if errorlevel 1 (
    echo   [ERROR] Migration failed
    pause
    exit /b 1
)

echo.
echo ============================================================
echo MIGRATION COMPLETED SUCCESSFULLY!
echo ============================================================
echo.
echo Next steps:
echo   1. Re-run comprehensive tests
echo      .\test\agent\run-comprehensive-tests.ps1
echo.
pause
