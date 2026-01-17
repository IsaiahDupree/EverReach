#!/bin/bash

# Script to programmatically build and run iOS app in Xcode
# Usage: ./scripts/build-ios-xcode.sh [device_name] [action]
# Actions: open, build, run, build-and-run

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
SCHEME="AIEnhancedPersonalCRM"

# Default device (iPad Pro 13-inch M4 for screenshots)
DEFAULT_DEVICE="iPad Pro 13-inch (M4)"
DEVICE_NAME="${1:-$DEFAULT_DEVICE}"
ACTION="${2:-open}"

echo "📱 iOS Xcode Build Script"
echo "=========================="
echo "Device: $DEVICE_NAME"
echo "Action: $ACTION"
echo ""

# Function to get device UDID
get_device_udid() {
    local device_name="$1"
    xcrun simctl list devices available | grep "$device_name" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/' | xargs
}

# Function to boot simulator
boot_simulator() {
    local udid="$1"
    local device_name="$2"
    
    echo "🔌 Booting simulator: $device_name ($udid)"
    xcrun simctl boot "$udid" 2>/dev/null || echo "Simulator already booted or booting..."
    
    # Wait for simulator to be ready
    echo "⏳ Waiting for simulator to be ready..."
    sleep 3
    
    # Open Simulator app
    open -a Simulator
}

# Function to open Xcode
open_xcode() {
    echo "🚀 Opening Xcode with project..."
    if [ -f "$WORKSPACE" ]; then
        open "$WORKSPACE"
    else
        open "$PROJECT"
    fi
}

# Function to build project
build_project() {
    local device_udid="$1"
    local device_name="$2"
    
    echo "🔨 Building project for $device_name..."
    
    if [ -f "$WORKSPACE" ]; then
        xcodebuild \
            -workspace "$WORKSPACE" \
            -scheme "$SCHEME" \
            -configuration Debug \
            -destination "id=$device_udid" \
            -derivedDataPath "$IOS_DIR/build" \
            clean build
    else
        xcodebuild \
            -project "$PROJECT" \
            -scheme "$SCHEME" \
            -configuration Debug \
            -destination "id=$device_udid" \
            -derivedDataPath "$IOS_DIR/build" \
            clean build
    fi
    
    echo "✅ Build completed!"
}

# Function to run app on simulator
run_app() {
    local device_udid="$1"
    local device_name="$2"
    
    echo "▶️  Installing and running app on $device_name..."
    
    # Find the built app
    local app_path="$IOS_DIR/build/Build/Products/Debug-iphonesimulator/AIEnhancedPersonalCRM.app"
    
    if [ ! -d "$app_path" ]; then
        echo "❌ App not found at $app_path"
        echo "   Please build the project first using: $0 $DEVICE_NAME build"
        exit 1
    fi
    
    # Install app on simulator
    xcrun simctl install "$device_udid" "$app_path"
    
    # Launch app
    xcrun simctl launch "$device_udid" app.rork.ai-enhanced-personal-crm
    
    echo "✅ App launched!"
}

# Main execution
case "$ACTION" in
    open)
        open_xcode
        ;;
    build)
        DEVICE_UDID=$(get_device_udid "$DEVICE_NAME")
        if [ -z "$DEVICE_UDID" ]; then
            echo "❌ Device '$DEVICE_NAME' not found"
            echo "Available devices:"
            xcrun simctl list devices available | grep -E "iPad|iPhone"
            exit 1
        fi
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        build_project "$DEVICE_UDID" "$DEVICE_NAME"
        ;;
    run)
        DEVICE_UDID=$(get_device_udid "$DEVICE_NAME")
        if [ -z "$DEVICE_UDID" ]; then
            echo "❌ Device '$DEVICE_NAME' not found"
            exit 1
        fi
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        run_app "$DEVICE_UDID" "$DEVICE_NAME"
        ;;
    build-and-run)
        DEVICE_UDID=$(get_device_udid "$DEVICE_NAME")
        if [ -z "$DEVICE_UDID" ]; then
            echo "❌ Device '$DEVICE_NAME' not found"
            exit 1
        fi
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        build_project "$DEVICE_UDID" "$DEVICE_NAME"
        run_app "$DEVICE_UDID" "$DEVICE_NAME"
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo ""
        echo "Usage: $0 [device_name] [action]"
        echo ""
        echo "Actions:"
        echo "  open          - Open Xcode with the project"
        echo "  build         - Build the project for specified device"
        echo "  run           - Run already-built app on simulator"
        echo "  build-and-run - Build and run the app (default)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Open Xcode"
        echo "  $0 'iPad Pro 13-inch (M4)' open      # Open Xcode"
        echo "  $0 'iPad Pro 13-inch (M4)' build     # Build for iPad"
        echo "  $0 'iPhone 17 Pro' build-and-run      # Build and run on iPhone"
        exit 1
        ;;
esac

echo ""
echo "✨ Done!"

