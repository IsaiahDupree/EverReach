@echo off
echo Removing errored deployments...
echo.

vercel rm https://web-b0shl7ftd-isaiahduprees-projects.vercel.app --yes
vercel rm https://web-3cx8iy3rb-isaiahduprees-projects.vercel.app --yes
vercel rm https://web-1if1e04d2-isaiahduprees-projects.vercel.app --yes
vercel rm https://web-671z4nhe8-isaiahduprees-projects.vercel.app --yes
vercel rm https://web-b149mo0rt-isaiahduprees-projects.vercel.app --yes

echo.
echo Done! All errored deployments removed.
echo.
vercel ls
pause
