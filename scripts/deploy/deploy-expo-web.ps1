# Deploy Expo Web App to Vercel
# Includes voice notes fixes and contact import feature

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  🚀 EverReach Expo Web Deployment" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check git status
Write-Host "📋 Step 1: Checking git status..." -ForegroundColor Yellow
git status --short

Write-Host ""
$continue = Read-Host "Continue with deployment? (y/n)"
if ($continue -ne 'y') {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Red
    exit 0
}

# Step 2: Stage all changes
Write-Host ""
Write-Host "📦 Step 2: Staging changes..." -ForegroundColor Yellow
git add .

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Git add failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Changes staged" -ForegroundColor Green

# Step 3: Commit
Write-Host ""
Write-Host "💾 Step 3: Committing changes..." -ForegroundColor Yellow
$commitMessage = "Fix voice notes transcription and save functionality"

git commit -m $commitMessage

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Nothing to commit or commit failed" -ForegroundColor Yellow
    Write-Host "Continuing with deployment..." -ForegroundColor Yellow
}
else {
    Write-Host "✅ Commit successful!" -ForegroundColor Green
}

# Step 4: Push to GitHub
Write-Host ""
Write-Host "⬆️  Step 4: Pushing to GitHub..." -ForegroundColor Yellow
$branch = git rev-parse --abbrev-ref HEAD
Write-Host "Current branch: $branch" -ForegroundColor Cyan

git push origin $branch

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Push failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Push successful!" -ForegroundColor Green

# Step 5: Export Expo Web Build
Write-Host ""
Write-Host "🏗️  Step 5: Building Expo web app..." -ForegroundColor Yellow
Write-Host "This may take a few minutes..." -ForegroundColor Cyan

npx expo export --platform web

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Expo build failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build complete! Output in ./dist" -ForegroundColor Green

# Step 6: Deploy to Vercel
Write-Host ""
Write-Host "🚀 Step 6: Deploying to Vercel..." -ForegroundColor Yellow
Write-Host "Target: https://everreach.app" -ForegroundColor Cyan
Write-Host ""

# Deploy to production
vercel --prod --yes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Vercel deployment failed" -ForegroundColor Red
    exit 1
}

# Success!
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  ✅ DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host ""
Write-Host "🎉 Your app is now live at:" -ForegroundColor Cyan
Write-Host "   https://everreach.app" -ForegroundColor White
Write-Host ""
Write-Host "📝 Changes included:" -ForegroundColor Cyan
Write-Host "   ✅ Voice notes transcription fix" -ForegroundColor White
Write-Host "   ✅ Voice notes save button fix" -ForegroundColor White
Write-Host "   ✅ Contact import selection (already implemented)" -ForegroundColor White
Write-Host ""
Write-Host "🧪 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Test voice note recording" -ForegroundColor White
Write-Host "   2. Test contact import flow" -ForegroundColor White
Write-Host "   3. Verify transcription appears" -ForegroundColor White
Write-Host ""
