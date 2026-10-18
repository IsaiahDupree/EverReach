@echo off
echo Running Social Platform Integration Tests...
echo.

REM Load environment from .env
for /f "tokens=1,2 delims==" %%a in (.env) do (
    if "%%a"=="SUPABASE_URL" set "SUPABASE_URL=%%b"
    if "%%a"=="SUPABASE_ANON_KEY" set "SUPABASE_ANON_KEY=%%b"
    if "%%a"=="TEST_EMAIL" set "TEST_USER_EMAIL=%%b"
    if "%%a"=="TEST_PASSWORD" set "TEST_USER_PASSWORD=%%b"
)

REM Set test-specific variables
set "NEXT_PUBLIC_API_URL=https://backend-vercel-19y0hqopd-isaiahduprees-projects.vercel.app"
set "TEST_BASE_URL=%NEXT_PUBLIC_API_URL%"
set "NEXT_PUBLIC_SUPABASE_URL=%SUPABASE_URL%"
set "NEXT_PUBLIC_SUPABASE_ANON_KEY=%SUPABASE_ANON_KEY%"
if "%TEST_USER_EMAIL%"=="" set "TEST_USER_EMAIL=isaiahdupree33@gmail.com"
if "%TEST_USER_PASSWORD%"=="" set "TEST_USER_PASSWORD=frogger12"

echo Backend URL: %NEXT_PUBLIC_API_URL%
echo.

REM Run the test
node test/agent/integration-social-platforms.mjs

echo.
echo Tests complete!
pause
