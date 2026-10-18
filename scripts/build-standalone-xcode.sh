#!/bin/bash

###############################################################################
# Build Standalone App in Xcode (No Metro Required)
# 
# Builds a Release configuration that embeds the JavaScript bundle,
# so the app runs completely from Xcode without needing Metro bundler.
# 
# Usage: ./scripts/build-standalone-xcode.sh [device_name]
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
setup_build_environment "Xcode Standalone Build (Release)" 3600

log_info "Device: $DEVICE_NAME"
log_info "Configuration: Release (standalone bundle)"
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
    log_warn "Device '$DEVICE_NAME' not found, will use generic iOS Simulator"
    DEVICE_UDID=""
else
    log_success "Found device: $DEVICE_NAME ($DEVICE_UDID)"
    
    # Boot simulator
    log_step "Booting simulator"
    run_command_continue "xcrun simctl boot \"$DEVICE_UDID\" 2>&1" "Boot simulator" || log_verbose "Simulator already booted"
    
    # Open Simulator app
    open -a Simulator 2>/dev/null || true
fi

# Note: Xcode will automatically bundle JavaScript during Release build
# No need to pre-export - the build phase handles it
log_step "Preparing for Release build"
log_info "Xcode will automatically bundle JavaScript during Release build"
log_info "No pre-export needed - build phase handles bundling"

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
log_info "📱 Standalone Build Instructions"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info ""
log_info "This build will run COMPLETELY from Xcode (no Metro needed!)"
log_info ""
log_info "Steps:"
log_info "1. Wait for Xcode to finish indexing"
log_info "2. Select device: $DEVICE_NAME"
if [ -n "$DEVICE_UDID" ]; then
    log_info "   (UDID: $DEVICE_UDID)"
fi
log_info "3. Change build configuration to RELEASE:"
log_info "   • Click the scheme dropdown (next to Play button)"
log_info "   • Select 'Edit Scheme...'"
log_info "   • Go to 'Run' → 'Info' tab"
log_info "   • Set 'Build Configuration' to 'Release'"
log_info "   • Click 'Close'"
log_info ""
log_info "4. Press ⌘R to build and run"
log_info ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "🔍 How It Works:"
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info ""
log_info "DEBUG Mode (default):"
log_info "  • Needs Metro bundler running"
log_info "  • JavaScript loaded from Metro server"
log_info "  • Hot reload enabled"
log_info "  • Slower startup"
log_info ""
log_info "RELEASE Mode (standalone):"
log_info "  • JavaScript bundle embedded in app"
log_info "  • No Metro bundler needed"
log_info "  • Faster startup"
log_info "  • Production-ready"
log_info ""
log_info "The JavaScript bundle has been pre-built and will be"
log_info "embedded during the Xcode build process."
log_info ""
log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

