@echo off
echo Listing all deployments...
echo.
vercel ls
echo.
echo To remove a specific deployment, use:
echo   vercel rm [deployment-url] --yes
echo.
echo To remove ALL deployments (careful!):
echo   vercel rm --yes --safe
echo.
pause
