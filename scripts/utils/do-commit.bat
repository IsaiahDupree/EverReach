@echo off
echo ================================================
echo   Committing and Pushing Changes
echo ================================================
echo.

REM Files are already staged from previous git add
echo Committing...
git commit -m "Add analytics tracking (7 screens, 33%% coverage), CRM screenshot feature documentation, and Git automation scripts"

if errorlevel 1 (
    echo ERROR: Commit failed!
    exit /b 1
)

echo Commit successful!
echo.

REM Get current branch
for /f "tokens=*" %%b in ('git branch --show-current') do set BRANCH=%%b
echo Current branch: %BRANCH%
echo.

echo Pushing to remote...
git push origin %BRANCH%

if errorlevel 1 (
    echo ERROR: Push failed!
    exit /b 1
)

echo.
echo ================================================
echo   SUCCESS! All changes pushed to remote
echo ================================================
