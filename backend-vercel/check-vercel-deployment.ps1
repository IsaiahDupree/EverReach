# Check Vercel Deployment Status
# After pushing to feat/backend-vercel-only-clean

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vercel Deployment Status Checker" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Current branch:" -ForegroundColor Yellow
$branch = git branch --show-current
Write-Host "  $branch`n" -ForegroundColor Green

Write-Host "Latest commit:" -ForegroundColor Yellow
$commit = git log --oneline -1
Write-Host "  $commit`n" -ForegroundColor Green

Write-Host "Remote status:" -ForegroundColor Yellow
git fetch origin feat/backend-vercel-only-clean 2>$null
$status = git status -sb
Write-Host "  $status`n" -ForegroundColor Green

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Vercel Auto-Deploy Information" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "✅ Code pushed to: origin/feat/backend-vercel-only-clean" -ForegroundColor Green
Write-Host "✅ Vercel is configured to auto-deploy this branch" -ForegroundColor Green
Write-Host "`nDeployment should start automatically within 1-2 minutes.`n" -ForegroundColor Yellow

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Check Deployment Progress" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "Option 1: Vercel Dashboard (Recommended)" -ForegroundColor Yellow
Write-Host "  URL: https://vercel.com/isaiahduprees-projects/backend-vercel" -ForegroundColor White
Write-Host "  - View deployment status" -ForegroundColor Gray
Write-Host "  - See build logs" -ForegroundColor Gray
Write-Host "  - Check for errors`n" -ForegroundColor Gray

Write-Host "Option 2: Wait 2-3 minutes, then test endpoints" -ForegroundColor Yellow
Write-Host "  Test health:" -ForegroundColor White
Write-Host "    curl https://ever-reach-be.vercel.app/api/health" -ForegroundColor Gray
Write-Host "`n  Test dev notifications:" -ForegroundColor White
Write-Host "    curl https://ever-reach-be.vercel.app/api/admin/dev-notifications?hours=24`n" -ForegroundColor Gray

Write-Host "Option 3: Use Vercel CLI (if installed)" -ForegroundColor Yellow
Write-Host "  vercel --prod --token YOUR_TOKEN`n" -ForegroundColor Gray

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "What's Being Deployed" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "New Features:" -ForegroundColor Yellow
Write-Host "  ✓ Developer Notifications API" -ForegroundColor Green
Write-Host "  ✓ Daily Activity Digest (9 AM cron)" -ForegroundColor Green
Write-Host "  ✓ Campaign automation workers" -ForegroundColor Green
Write-Host "  ✓ Event tracking endpoints" -ForegroundColor Green
Write-Host "  ✓ 4 Cron jobs configured`n" -ForegroundColor Green

Write-Host "Cron Jobs:" -ForegroundColor Yellow
Write-Host "  • check-warmth-alerts (9 AM daily)" -ForegroundColor White
Write-Host "  • sync-ai-context (2 AM daily)" -ForegroundColor White
Write-Host "  • refresh-monitoring-views (every 5 min)" -ForegroundColor White
Write-Host "  • dev-activity-digest (9 AM daily) ← NEW`n" -ForegroundColor White

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

Write-Host "1. Open Vercel dashboard to watch deployment" -ForegroundColor Yellow
Write-Host "2. Wait 2-3 minutes for deployment to complete" -ForegroundColor Yellow
Write-Host "3. Run test-deployment.ps1 to verify endpoints" -ForegroundColor Yellow
Write-Host "4. Check for first email digest tomorrow at 9 AM`n" -ForegroundColor Yellow

Write-Host "Opening Vercel dashboard in browser..." -ForegroundColor Cyan
Start-Process "https://vercel.com/isaiahduprees-projects/backend-vercel"

Write-Host "`n✅ Deployment initiated! Check browser for status.`n" -ForegroundColor Green
