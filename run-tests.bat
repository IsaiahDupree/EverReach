@echo off
echo ============================================================
echo Running Comprehensive Test Suite
echo ============================================================
echo.

REM Set environment variables for testing
set "NEXT_PUBLIC_API_URL=https://backend-vercel-9m8imclhq-isaiahduprees-projects.vercel.app"
set "TEST_BASE_URL=https://backend-vercel-9m8imclhq-isaiahduprees-projects.vercel.app"
set "NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co"
set "NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg1MDc0MzQsImV4cCI6MjA3NDA4MzQzNH0.obsHbYThUPkmTBn57T8cWcEP_32QxPclSk3Mx36TE04"
set "SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0YXNldGZ4aXFjcm53eWZmb3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODUwNzQzNCwiZXhwIjoyMDc0MDgzNDM0fQ.Dpm9YMA2FvCy2Ztxrm_ZTXksAX55sjvmgfiO0bwvgrY"
set "TEST_USER_EMAIL=isaiahdupree33@gmail.com"
set "TEST_USER_PASSWORD=frogger12"

echo Testing against: %NEXT_PUBLIC_API_URL%
echo.

REM Run the test suite
node test\agent\run-recent-developments.mjs

echo.
echo ============================================================
echo Test Suite Complete
echo ============================================================
pause
