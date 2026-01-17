#!/bin/bash

###############################################################################
# Build in Xcode GUI
# 
# Opens Xcode and builds from within Xcode so you can see the build progress
# Usage: ./scripts/build-in-xcode.sh [device_name]
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

# Source build utilities
source "$SCRIPT_DIR/build-utils.sh"

# Default device
DEFAULT_DEVICE="iPad Pro 13-inch (M4)"
DEVICE_NAME="${1:-$DEFAULT_DEVICE}"

# Setup build environment
setup_build_environment "Xcode GUI Build" 3600

log_info "Device: $DEVICE_NAME"
log_info ""

cd "$PROJECT_DIR"

# Check if iOS project exists
if [ ! -d "$IOS_DIR" ] || [ ! -f "$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace" ] && [ ! -f "$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj/project.pbxproj" ]; then
    log_step "iOS project not found. Running prebuild..."
    run_command "npx expo prebuild --platform ios --clean" "Prebuild iOS project" || {
        log_error "Prebuild failed"
        exit 1
    }
fi

# Get device UDID
log_step "Finding device: $DEVICE_NAME"
DEVICE_UDID=$(xcrun simctl list devices available 2>/dev/null | grep -i "$DEVICE_NAME" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/' | tr -d '[:space:]')

if [ -z "$DEVICE_UDID" ] || [ ${#DEVICE_UDID} -ne 36 ]; then
    log_warn "Device '$DEVICE_NAME' not found, will use default"
    DEVICE_UDID=""
else
    log_success "Found device: $DEVICE_NAME ($DEVICE_UDID)"
    
    # Boot simulator
    log_step "Booting simulator"
    run_command_continue "xcrun simctl boot \"$DEVICE_UDID\" 2>&1" "Boot simulator" || log_verbose "Simulator already booted"
    
    # Open Simulator app
    open -a Simulator 2>/dev/null || true
fi

# Open Xcode
WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"

log_step "Opening Xcode"
if [ -d "$WORKSPACE" ]; then
    log_info "Opening workspace: $WORKSPACE"
    open "$WORKSPACE"
elif [ -d "$PROJECT" ]; then
    log_info "Opening project: $PROJECT"
    open "$PROJECT"
else
    log_error "Xcode project not found"
    exit 1
fi

log_success "Xcode is opening!"
log_info ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "📱 Next Steps in Xcode:"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info ""
log_info "1. Wait for Xcode to finish indexing"
log_info "2. Select device: $DEVICE_NAME"
if [ -n "$DEVICE_UDID" ]; then
    log_info "   (UDID: $DEVICE_UDID)"
fi
log_info "3. Press ⌘R to build and run"
log_info "   OR"
log_info "   Product → Run (⌘R)"
log_info ""
log_info "You'll see the build progress in Xcode's:"
log_info "  • Navigator area (file tree)"
log_info "  • Editor area (code)"
log_info "  • Debug area (build output)"
log_info "  • Issue navigator (errors/warnings)"
log_info ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

