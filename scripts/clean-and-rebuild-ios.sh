#!/bin/bash

# Script to clean and rebuild iOS project, fixing database locked and build errors
# Usage: ./scripts/clean-and-rebuild-ios.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

echo "🧹 Cleaning iOS Build Environment"
echo "==================================="
echo ""

cd "$PROJECT_DIR"

# Step 1: Kill any running Xcode/build processes
echo "🛑 Step 1: Stopping any running builds..."
killall -9 Xcode xcodebuild 2>/dev/null || echo "  ✅ No processes to kill"
sleep 2
echo ""

# Step 2: Clean Xcode derived data
echo "🗑️  Step 2: Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/AIEnhancedPersonalCRM-*
rm -rf ~/Library/Developer/Xcode/DerivedData/*/Build/Intermediates.noindex
echo "  ✅ Derived data cleaned"
echo ""

# Step 3: Clean iOS build artifacts
echo "🧹 Step 3: Cleaning iOS build artifacts..."
rm -rf "$IOS_DIR/build"
rm -rf "$IOS_DIR/Pods"
rm -rf "$IOS_DIR/Podfile.lock"
rm -rf "$IOS_DIR/.xcode.env.local"
rm -rf "$IOS_DIR/DerivedData"
echo "  ✅ Build artifacts cleaned"
echo ""

# Step 4: Clean CocoaPods cache (optional but thorough)
echo "📦 Step 4: Cleaning CocoaPods cache..."
pod cache clean --all 2>/dev/null || echo "  ⚠️  Pod cache clean skipped (not critical)"
echo ""

# Step 5: Reinstall pods
echo "📦 Step 5: Installing CocoaPods dependencies..."
cd "$IOS_DIR"
pod install --repo-update
echo "  ✅ Pods installed"
echo ""

# Step 6: Clean Xcode workspace
echo "🔧 Step 6: Final cleanup..."
rm -rf "$IOS_DIR/build"
echo "  ✅ Ready for build"
echo ""

echo "✨ Clean and rebuild complete!"
echo ""
echo "Next steps:"
echo "  1. Open Xcode: ./scripts/open-xcode-project.sh"
echo "  2. Or build with Expo: npx expo run:ios --device 'iPad Pro 13-inch (M4)'"
echo "  3. In Xcode: Product → Clean Build Folder (Cmd+Shift+K)"
echo ""

