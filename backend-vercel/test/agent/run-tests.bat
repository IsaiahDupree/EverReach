@echo off
REM Feature Requests Integration Tests Runner
REM Loads .env and runs the tests

echo Loading environment variables from .env...

REM Load key env vars from .env file
for /f "usebackq tokens=1,* delims==" %%a in ("..\..\\.env") do (
    set "line=%%a"
    if not "!line:~0,1!"=="#" (
        set "%%a=%%b"
    )
)

REM Set test credentials
set TEST_EMAIL=isaiahdupree33@gmail.com
set TEST_PASSWORD=frogger12

echo.
echo Running Feature Requests Integration Tests...
echo   SUPABASE_URL: %SUPABASE_URL:~0,30%...
echo   TEST_EMAIL: %TEST_EMAIL%
echo.

REM Run the test
node feature-requests-integration.mjs

REM Capture exit code
set EXIT_CODE=%ERRORLEVEL%

if %EXIT_CODE%==0 (
    echo.
    echo All tests passed!
) else (
    echo.
    echo Some tests failed exit code: %EXIT_CODE%
)

exit /b %EXIT_CODE%
