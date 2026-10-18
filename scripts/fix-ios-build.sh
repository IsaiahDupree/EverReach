#!/bin/bash

# Script to fix iOS build errors, especially Folly coroutine issues
# Usage: ./scripts/fix-ios-build.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

echo "🔧 Fixing iOS Build Issues"
echo "=========================="
echo ""

cd "$PROJECT_DIR"

# Step 1: Clean everything
echo "🧹 Step 1: Cleaning build artifacts..."
rm -rf "$IOS_DIR/build"
rm -rf "$IOS_DIR/Pods"
rm -rf "$IOS_DIR/Podfile.lock"
rm -rf "$IOS_DIR/.xcode.env.local"
rm -rf "$IOS_DIR/DerivedData"
echo "✅ Clean complete"
echo ""

# Step 2: Verify Podfile has fixes (already applied)
echo "📝 Step 2: Verifying Podfile configuration..."
if grep -q "FOLLY_NO_COROUTINES" "$IOS_DIR/Podfile"; then
  echo "✅ Podfile already has Folly fixes"
else
  echo "⚠️  Podfile missing fixes - please update manually"
fi
echo ""

# Step 3: Reinstall pods
echo "📦 Step 3: Installing CocoaPods dependencies..."
cd "$IOS_DIR"
pod install --repo-update
echo "✅ Pods installed"
echo ""

# Step 4: Clean Xcode derived data
echo "🧹 Step 4: Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/*
echo "✅ Derived data cleaned"
echo ""

echo "✨ Build fixes applied!"
echo ""
echo "Next steps:"
echo "  1. Open Xcode: ./scripts/open-xcode-project.sh"
echo "  2. Or build with Expo: npx expo run:ios --device 'iPad Pro 13-inch (M4)'"
echo ""

