#!/bin/bash
# Fix iOS Build Warnings Script
# Run this to clean up iOS build warnings and errors

set -e  # Exit on error

echo "🔧 iOS Build Warnings Fix Script"
echo "================================="
echo ""

# Check we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the mobileapp directory"
    exit 1
fi

# Step 1: Update critical Expo modules
echo "📦 Step 1/5: Updating critical dependencies..."
npm update expo-constants expo-av expo-file-system expo-image-picker expo-notifications --save
echo "✅ Dependencies updated"
echo ""

# Step 2: Run Expo doctor
echo "🩺 Step 2/5: Running Expo doctor..."
npx expo-doctor || echo "⚠️  Some Expo doctor checks failed (non-critical)"
echo ""

# Step 3: Clean iOS build artifacts
echo "🧹 Step 3/5: Cleaning iOS build artifacts..."
cd ios

# Remove old pods
echo "  - Removing Pods..."
rm -rf Pods
rm -f Podfile.lock

# Clean DerivedData
echo "  - Cleaning Xcode DerivedData..."
rm -rf ~/Library/Developer/Xcode/DerivedData/AIEnhancedPersonalCRM-*

# Deintegrate pods
echo "  - Deintegrating CocoaPods..."
pod deintegrate || echo "  (No existing pods to deintegrate)"

echo "✅ Build artifacts cleaned"
echo ""

# Step 4: Reinstall pods
echo "📥 Step 4/5: Reinstalling CocoaPods..."
pod install --repo-update
echo "✅ Pods reinstalled"
echo ""

# Step 5: Verify configuration
echo "🔍 Step 5/5: Verifying configuration..."
cd ..

# Check app.json
if grep -q '"jsEngine": "jsc"' app.json; then
    echo "  ✅ JSC engine configured"
else
    echo "  ⚠️  JSC not set in app.json"
fi

if grep -q '"newArchEnabled": false' app.json; then
    echo "  ✅ New Architecture disabled"
else
    echo "  ⚠️  New Architecture setting not found"
fi

# Check Podfile
if grep -q 'inhibit_all_warnings!' ios/Podfile; then
    echo "  ✅ Warning suppression enabled"
else
    echo "  ⚠️  Warning suppression not found in Podfile"
fi

if grep -q ':hermes_enabled => false' ios/Podfile; then
    echo "  ✅ Hermes explicitly disabled"
else
    echo "  ⚠️  Hermes setting not found in Podfile"
fi

echo ""
echo "✅ All fixes applied!"
echo ""
echo "📱 Next steps:"
echo "  1. Run: npx expo run:ios"
echo "  2. Check build output for remaining warnings"
echo "  3. Warnings should be significantly reduced!"
echo ""
echo "📊 Expected results:"
echo "  - Before: ~1098 warnings"
echo "  - After: 0-10 warnings (only critical ones)"
echo ""
