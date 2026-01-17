#!/bin/bash

# Script to programmatically open Xcode project/workspace
# Usage: ./scripts/open-xcode-project.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

echo "🚀 Opening Xcode Project"
echo "========================"

cd "$PROJECT_DIR"

# Check if iOS directory exists, if not run prebuild
if [ ! -d "$IOS_DIR" ]; then
    echo "📦 iOS project not found. Running prebuild..."
    npx expo prebuild --platform ios
fi

# Determine which file to open (workspace preferred, fallback to project)
WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"

if [ -d "$WORKSPACE" ]; then
    echo "✅ Opening workspace: $WORKSPACE"
    open "$WORKSPACE"
elif [ -d "$PROJECT" ]; then
    echo "✅ Opening project: $PROJECT"
    open "$PROJECT"
else
    echo "❌ Xcode project not found. Running prebuild..."
    npx expo prebuild --platform ios --clean
    if [ -d "$WORKSPACE" ]; then
        open "$WORKSPACE"
    elif [ -d "$PROJECT" ]; then
        open "$PROJECT"
    else
        echo "❌ Failed to generate Xcode project"
        exit 1
    fi
fi

echo ""
echo "✨ Xcode should be opening now!"
echo ""
echo "To build programmatically, run:"
echo "  ./scripts/xcode-build.sh 'iPad Pro 13-inch (M4)' Debug build"

