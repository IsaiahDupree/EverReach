# Commit only backend-vercel files to feat/backend-vercel-only-clean

Write-Host "Current branch:" -ForegroundColor Cyan
git branch --show-current

Write-Host "`nCommitting backend-vercel files only..." -ForegroundColor Yellow

# Add only backend-vercel related files
git add backend-vercel/

# Also add DEPLOYMENT_SUMMARY.md (deployment documentation)
git add DEPLOYMENT_SUMMARY.md

Write-Host "`nStaged files:" -ForegroundColor Cyan
git diff --cached --name-only --diff-filter=A

Write-Host "`nCommitting..." -ForegroundColor Yellow
git commit -m "feat: Developer notifications with daily digest and API"

Write-Host "`nPushing to origin..." -ForegroundColor Yellow
git push origin feat/backend-vercel-only-clean

Write-Host "`n✅ Backend files committed and pushed!" -ForegroundColor Green
Write-Host "Branch: feat/backend-vercel-only-clean" -ForegroundColor Cyan
Write-Host "Vercel URL: https://vercel.com/isaiahduprees-projects/backend-vercel" -ForegroundColor Cyan
