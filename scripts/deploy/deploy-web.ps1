# Deploy Web Frontend with Legal Pages
# PowerShell script for commit, push, and Vercel deployment

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  EverReach Web Frontend Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Commit
Write-Host "Step 1: Committing legal pages..." -ForegroundColor Yellow
$commitMessage = "Add legal pages for Twilio verification: Privacy Policy, Terms of Service, SMS Consent"

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Commit failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Commit successful!" -ForegroundColor Green
Write-Host ""

# Step 2: Push
Write-Host "Step 2: Pushing to GitHub..." -ForegroundColor Yellow
git push origin web-scratch-2

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Push successful!" -ForegroundColor Green
Write-Host ""

# Step 3: Deploy to Vercel
Write-Host "Step 3: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Target: https://everreach.app" -ForegroundColor Cyan
Write-Host ""

Set-Location web

# Deploy to production
vercel --prod --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Vercel deployment failed with exit code: $LASTEXITCODE" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Legal pages now live at:" -ForegroundColor Cyan
Write-Host "  🔒 https://everreach.app/privacy" -ForegroundColor White
Write-Host "  📄 https://everreach.app/terms" -ForegroundColor White
Write-Host "  📱 https://everreach.app/sms-consent" -ForegroundColor White
Write-Host ""
Write-Host "Ready for Twilio verification submission!" -ForegroundColor Yellow
