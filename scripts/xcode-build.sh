#!/bin/bash

# Script to programmatically run Xcode custom build
# Usage: ./scripts/xcode-build.sh [device_name] [build_config] [action] [timeout_minutes]
# Actions: build, run, archive, clean-build

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

# Source build utilities
source "$SCRIPT_DIR/build-utils.sh"

# Default values
DEFAULT_DEVICE="iPad Pro 13-inch (M4)"
DEVICE_NAME="${1:-$DEFAULT_DEVICE}"
BUILD_CONFIG="${2:-Debug}"
ACTION="${3:-build}"
TIMEOUT_MINUTES="${4:-90}"  # Default 90 minutes for Xcode builds
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

# Xcode project paths
WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
SCHEME="AIEnhancedPersonalCRM"

# Setup build environment with verbose logging and timeout
setup_build_environment "Xcode Build - $ACTION ($BUILD_CONFIG)" "$TIMEOUT_SECONDS"

log_info "Device: $DEVICE_NAME"
log_info "Configuration: $BUILD_CONFIG"
log_info "Action: $ACTION"
log_info "Timeout: ${TIMEOUT_MINUTES} minutes"
log_info ""

# Function to ensure iOS project exists
ensure_ios_project() {
    if [ ! -d "$IOS_DIR" ] || [ ! -f "$WORKSPACE" ] && [ ! -f "$PROJECT/project.pbxproj" ]; then
        log_step "iOS project not found. Running prebuild..."
        cd "$PROJECT_DIR"
        run_command "npx expo prebuild --platform ios --clean" "Prebuild iOS project" || {
            log_error "Prebuild failed"
            return 1
        }
    fi
}

# Function to get device UDID
get_device_udid() {
    local device_name="$1"
    log_verbose "Searching for device: $device_name"
    local udid=$(xcrun simctl list devices available 2>&1 | grep "$device_name" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/' | xargs)
    if [ -n "$udid" ]; then
        log_verbose "Found device UDID: $udid"
    else
        log_warn "Device not found: $device_name"
    fi
    echo "$udid"
}

# Function to boot simulator
boot_simulator() {
    local udid="$1"
    local device_name="$2"
    
    log_step "Booting simulator: $device_name ($udid)"
    run_command_continue "xcrun simctl boot \"$udid\" 2>&1" "Boot simulator" || log_verbose "Simulator already booted or booting..."
    
    # Wait for simulator to be ready
    log_verbose "Waiting for simulator to be ready..."
    local wait_count=0
    while [ $wait_count -lt 10 ]; do
        if xcrun simctl list devices 2>&1 | grep -q "$udid.*Booted"; then
            log_success "Simulator is ready"
            break
        fi
        sleep 1
        wait_count=$((wait_count + 1))
    done
    
    # Open Simulator app
    log_verbose "Opening Simulator app"
    open -a Simulator 2>/dev/null || log_warn "Could not open Simulator app"
}

# Function to get destination string for xcodebuild
get_destination() {
    local device_udid="$1"
    if [ -n "$device_udid" ]; then
        echo "id=$device_udid"
    else
        echo "generic/platform=iOS Simulator"
    fi
}

# Function to clean build
clean_build() {
    local device_udid="$1"
    local destination=$(get_destination "$device_udid")
    
    log_step "Cleaning build"
    
    local clean_cmd=""
    if [ -f "$WORKSPACE" ]; then
        clean_cmd="xcodebuild \
            -workspace \"$WORKSPACE\" \
            -scheme \"$SCHEME\" \
            -configuration \"$BUILD_CONFIG\" \
            -destination \"$destination\" \
            clean"
    else
        clean_cmd="xcodebuild \
            -project \"$PROJECT\" \
            -scheme \"$SCHEME\" \
            -configuration \"$BUILD_CONFIG\" \
            -destination \"$destination\" \
            clean"
    fi
    
    run_command "$clean_cmd" "Clean Xcode build" || return 1
}

# Function to build project
build_project() {
    local device_udid="$1"
    local destination=$(get_destination "$device_udid")
    local derived_data="$IOS_DIR/build"
    
    log_step "Building project"
    log_info "   Scheme: $SCHEME"
    log_info "   Configuration: $BUILD_CONFIG"
    log_info "   Destination: $destination"
    log_info "   Derived Data: $derived_data"
    
    local build_cmd=""
    if [ -f "$WORKSPACE" ]; then
        build_cmd="xcodebuild \
            -workspace \"$WORKSPACE\" \
            -scheme \"$SCHEME\" \
            -configuration \"$BUILD_CONFIG\" \
            -destination \"$destination\" \
            -derivedDataPath \"$derived_data\" \
            build"
    else
        build_cmd="xcodebuild \
            -project \"$PROJECT\" \
            -scheme \"$SCHEME\" \
            -configuration \"$BUILD_CONFIG\" \
            -destination \"$destination\" \
            -derivedDataPath \"$derived_data\" \
            build"
    fi
    
    run_command "$build_cmd" "Build Xcode project" || return 1
    
    log_success "Build completed!"
    log_info "   Build output: $derived_data/Build/Products/$BUILD_CONFIG-iphonesimulator/"
}

# Function to run app on simulator
run_app() {
    local device_udid="$1"
    local device_name="$2"
    
    echo "▶️  Installing and running app on $device_name..."
    
    # Find the built app
    local app_path="$IOS_DIR/build/Build/Products/$BUILD_CONFIG-iphonesimulator/AIEnhancedPersonalCRM.app"
    
    if [ ! -d "$app_path" ]; then
        echo "❌ App not found at $app_path"
        echo "   Please build the project first using: $0 $DEVICE_NAME $BUILD_CONFIG build"
        exit 1
    fi
    
    # Install app on simulator
    echo "📱 Installing app..."
    xcrun simctl install "$device_udid" "$app_path"
    
    # Launch app
    echo "🚀 Launching app..."
    xcrun simctl launch "$device_udid" app.rork.ai-enhanced-personal-crm
    
    echo "✅ App launched!"
}

# Function to archive (for distribution)
archive_project() {
    local archive_path="$IOS_DIR/build/archive/AIEnhancedPersonalCRM.xcarchive"
    
    echo "📦 Creating archive..."
    
    mkdir -p "$(dirname "$archive_path")"
    
    if [ -f "$WORKSPACE" ]; then
        xcodebuild \
            -workspace "$WORKSPACE" \
            -scheme "$SCHEME" \
            -configuration Release \
            -archivePath "$archive_path" \
            archive
    else
        xcodebuild \
            -project "$PROJECT" \
            -scheme "$SCHEME" \
            -configuration Release \
            -archivePath "$archive_path" \
            archive
    fi
    
    echo "✅ Archive created at: $archive_path"
}

# Function to open Xcode
open_xcode() {
    echo "🚀 Opening Xcode..."
    if [ -f "$WORKSPACE" ]; then
        open "$WORKSPACE"
    elif [ -f "$PROJECT" ]; then
        open "$PROJECT"
    else
        echo "❌ Xcode project not found. Run prebuild first."
        exit 1
    fi
}

# Main execution
cd "$PROJECT_DIR"

# Ensure iOS project exists
ensure_ios_project

# Get device UDID if device name provided
DEVICE_UDID=""
if [ "$DEVICE_NAME" != "generic" ]; then
    DEVICE_UDID=$(get_device_udid "$DEVICE_NAME")
    if [ -z "$DEVICE_UDID" ] && [ "$ACTION" != "open" ] && [ "$ACTION" != "archive" ]; then
        echo "⚠️  Device '$DEVICE_NAME' not found"
        echo "Available devices:"
        xcrun simctl list devices available | grep -E "iPad|iPhone" | head -5
        echo ""
        echo "Using generic iOS Simulator destination..."
        DEVICE_UDID=""
    elif [ -n "$DEVICE_UDID" ]; then
        echo "✅ Found device: $DEVICE_NAME ($DEVICE_UDID)"
    fi
fi

case "$ACTION" in
    open)
        open_xcode
        ;;
    clean)
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME" 2>/dev/null || true
        clean_build "$DEVICE_UDID"
        ;;
    build)
        if [ -n "$DEVICE_UDID" ]; then
            boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        fi
        build_project "$DEVICE_UDID"
        ;;
    run)
        if [ -z "$DEVICE_UDID" ]; then
            echo "❌ Device UDID required for run action"
            exit 1
        fi
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        run_app "$DEVICE_UDID" "$DEVICE_NAME"
        ;;
    clean-build)
        if [ -n "$DEVICE_UDID" ]; then
            boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        fi
        clean_build "$DEVICE_UDID"
        build_project "$DEVICE_UDID"
        ;;
    build-and-run)
        if [ -z "$DEVICE_UDID" ]; then
            echo "❌ Device UDID required for build-and-run action"
            exit 1
        fi
        boot_simulator "$DEVICE_UDID" "$DEVICE_NAME"
        build_project "$DEVICE_UDID"
        run_app "$DEVICE_UDID" "$DEVICE_NAME"
        ;;
    archive)
        archive_project
        ;;
    *)
        echo "❌ Unknown action: $ACTION"
        echo ""
        echo "Usage: $0 [device_name] [build_config] [action]"
        echo ""
        echo "Actions:"
        echo "  open          - Open Xcode with the project"
        echo "  clean         - Clean build folder"
        echo "  build         - Build the project (default)"
        echo "  run           - Run already-built app on simulator"
        echo "  clean-build   - Clean and build"
        echo "  build-and-run - Build and run the app"
        echo "  archive       - Create distribution archive"
        echo ""
        echo "Build Configs: Debug (default), Release"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Build on default device"
        echo "  $0 'iPad Pro 13-inch (M4)' Debug build"
        echo "  $0 'iPhone 17 Pro' Debug build-and-run"
        echo "  $0 generic Release archive"
        exit 1
        ;;
esac

log_success "Xcode build script completed successfully!"

