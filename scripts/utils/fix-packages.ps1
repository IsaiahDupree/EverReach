# Fix Package Versions - Metro Bundler Error Resolution
# This script pins critical packages to exact versions to prevent drift

Write-Host "🔧 Fixing package versions to resolve Metro bundler error..." -ForegroundColor Cyan
Write-Host ""

# Step 1: Fix react-native-svg
Write-Host "📦 Step 1: Pinning react-native-svg to 15.11.2..." -ForegroundColor Yellow
npm install react-native-svg@15.11.2 --save-exact

# Step 2: Fix expo-router  
Write-Host "📦 Step 2: Pinning expo-router to 5.1.7..." -ForegroundColor Yellow
npm install expo-router@5.1.7 --save-exact

# Step 3: Update @react-navigation/native
Write-Host "📦 Step 3: Updating @react-navigation/native to 7.1.8..." -ForegroundColor Yellow
npm install @react-navigation/native@7.1.8 --save-exact

Write-Host ""
Write-Host "✅ Package versions fixed!" -ForegroundColor Green
Write-Host ""

# Step 4: Verify versions
Write-Host "🔍 Verifying installed versions:" -ForegroundColor Cyan
Write-Host "  react-native-svg: $(npm list react-native-svg --depth=0 2>$null | Select-String 'react-native-svg')"
Write-Host "  expo-router: $(npm list expo-router --depth=0 2>$null | Select-String 'expo-router')"
Write-Host "  @react-navigation/native: $(npm list @react-navigation/native --depth=0 2>$null | Select-String '@react-navigation/native')"
Write-Host ""

# Step 5: Test instructions
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "  1. Test the build: npx expo start --clear --android"
Write-Host "  2. If it builds successfully, commit the changes"
Write-Host "  3. Then add paywall config display (see PAYWALL_CONFIG_FIX_PLAN.md)"
Write-Host ""
Write-Host "🔬 To verify stability, run this test:" -ForegroundColor Cyan
Write-Host "  Remove-Item -Recurse -Force node_modules, package-lock.json"
Write-Host "  npm install"
Write-Host "  npx expo start --clear --android"
Write-Host ""
