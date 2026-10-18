@echo off
REM Apply screenshot migration to Supabase database
set PGPASSWORD=everreach123!@#

echo Applying screenshot migration...
psql -h db.utasetfxiqcrnwyfforx.supabase.co -p 5432 -U postgres -d postgres -f migrations\00XX_screenshots.sql

if %ERRORLEVEL% EQU 0 (
    echo Migration applied successfully!
) else (
    echo Migration failed with error code %ERRORLEVEL%
)

pause
