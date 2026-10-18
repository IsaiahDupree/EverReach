@echo off
echo ============================================================
echo Running Comprehensive Test Suite
echo ============================================================
echo.

REM Set environment variables for testing
set "NEXT_PUBLIC_API_URL=https://backend-vercel-9m8imclhq-isaiahduprees-projects.vercel.app"
set "TEST_BASE_URL=https://backend-vercel-9m8imclhq-isaiahduprees-projects.vercel.app"
set "NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co"
if not defined NEXT_PUBLIC_SUPABASE_ANON_KEY (echo NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in the environment & exit /b 1)
if not defined SUPABASE_SERVICE_ROLE_KEY (echo SUPABASE_SERVICE_ROLE_KEY must be set in the environment & exit /b 1)
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
