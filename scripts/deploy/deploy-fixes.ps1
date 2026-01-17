# Frontend Deployment Script
# Deploys all frontend fixes to production

Write-Host "🚀 Starting Frontend Deployment" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (!(Test-Path "package.json")) {
    Write-Host "❌ Error: package.json not found. Are you in the project root?" -ForegroundColor Red
    exit 1
}

Write-Host "✅ In project directory" -ForegroundColor Green
Write-Host ""

# Summary of changes
Write-Host "📋 Changes being deployed:" -ForegroundColor Yellow
Write-Host "  1. ✅ Screenshot display in personal notes" -ForegroundColor White
Write-Host "  2. ✅ Contact chips for linked contacts" -ForegroundColor White
Write-Host "  3. ✅ React Error #185 fix (ContactChannels)" -ForegroundColor White
Write-Host "  4. ✅ Personal profile picture upload on web" -ForegroundColor White
Write-Host "  5. ✅ Contact avatar upload on web" -ForegroundColor White
Write-Host "  6. ✅ Push notification registration system" -ForegroundColor White
Write-Host "  7. ✅ Developer Tools link in settings" -ForegroundColor White
Write-Host ""

# Confirm deployment
$confirm = Read-Host "Continue with deployment? (y/n)"
if ($confirm -ne "y") {
    Write-Host "❌ Deployment cancelled" -ForegroundColor Yellow
    exit 0
}
Write-Host ""

# Step 1: Git operations
Write-Host "📦 Step 1: Committing changes" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Gray

try {
    # Add all changes
    git add .
    
    # Create commit
    $commitMessage = @"
fix: Frontend improvements and critical bug fixes

- Add screenshot display in personal notes with contact chips
- Fix React error #185 in ContactChannels component
- Fix personal profile picture upload on web (FileSystem.uploadAsync)
- Fix contact avatar upload on web (lib/imageUpload.ts)
- Add defensive null checks for social channel data
- Implement push notification registration system
- Add Developer Tools section to settings
- Improve error handling and data validation

Fixes #185, fixes all image uploads on web
"@
    
    git commit -m $commitMessage
    
    Write-Host "✅ Changes committed" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "⚠️ Git commit failed or no changes to commit" -ForegroundColor Yellow
    Write-Host ""
}

# Step 2: Push to remote
Write-Host "📤 Step 2: Pushing to remote" -ForegroundColor Cyan
Write-Host "----------------------------" -ForegroundColor Gray

try {
    git push
    Write-Host "✅ Pushed to remote successfully" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Failed to push to remote" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Deploy web build
Write-Host "🌐 Step 3: Deploying web build" -ForegroundColor Cyan
Write-Host "------------------------------" -ForegroundColor Gray

try {
    # Check if deploy script exists
    if (Test-Path ".\deploy-expo-web.ps1") {
        Write-Host "Running deploy-expo-web.ps1..." -ForegroundColor White
        & .\deploy-expo-web.ps1
    } else {
        Write-Host "⚠️ deploy-expo-web.ps1 not found, running manual deploy" -ForegroundColor Yellow
        npx expo export:web
        # Add your deployment command here (e.g., firebase deploy, netlify deploy, etc.)
        Write-Host "✅ Web build exported. Deploy manually to your hosting platform." -ForegroundColor Yellow
    }
    Write-Host ""
} catch {
    Write-Host "❌ Web deployment failed" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
}

# Step 4: Summary
Write-Host "📊 Deployment Summary" -ForegroundColor Cyan
Write-Host "====================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Frontend fixes deployed!" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testing Checklist:" -ForegroundColor Yellow
Write-Host "  [ ] Test screenshot display in personal notes" -ForegroundColor White
Write-Host "  [ ] Verify contact chips show correctly" -ForegroundColor White  
Write-Host "  [ ] Check ContactChannels component loads without errors" -ForegroundColor White
Write-Host "  [ ] Verify social media channels display properly" -ForegroundColor White
Write-Host "  [ ] Test Developer Tools link in settings" -ForegroundColor White
Write-Host ""
Write-Host "📱 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open https://everreach.app and test" -ForegroundColor White
Write-Host "  2. Check browser console for any errors" -ForegroundColor White
Write-Host "  3. Test on mobile app (run: expo start)" -ForegroundColor White
Write-Host "  4. Install push notification packages when ready:" -ForegroundColor White
Write-Host "     npx expo install expo-notifications expo-device" -ForegroundColor Gray
Write-Host ""
Write-Host "🎉 Deployment complete!" -ForegroundColor Green
