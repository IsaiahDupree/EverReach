#!/bin/bash

# Quick script to open Xcode with the iOS project
# Usage: ./scripts/open-xcode.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

cd "$PROJECT_DIR"

echo "🚀 Opening Xcode with iOS project..."

# Check if iOS directory exists
if [ ! -d "$IOS_DIR" ]; then
    echo "📦 iOS project not found. Running prebuild..."
    npx expo prebuild --platform ios
fi

# Try to open workspace, fallback to project
if [ -f "$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace" ]; then
    echo "✅ Opening workspace..."
    open "$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
elif [ -f "$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj" ]; then
    echo "✅ Opening project..."
    open "$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
else
    echo "❌ Xcode project not found. Running prebuild..."
    npx expo prebuild --platform ios --clean
    if [ -f "$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace" ]; then
        open "$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
    elif [ -f "$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj" ]; then
        open "$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
    else
        echo "❌ Failed to generate Xcode project"
        exit 1
    fi
fi

echo "✨ Xcode should be opening now!"

