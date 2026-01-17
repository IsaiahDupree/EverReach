#!/bin/bash

# Script to programmatically build and run iOS app using Expo
# Usage: ./scripts/build-ios-expo.sh [device_name] [action] [timeout_minutes]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source build utilities
source "$SCRIPT_DIR/build-utils.sh"

# Default device (iPad Pro 13-inch M4 for screenshots)
DEFAULT_DEVICE="iPad Pro 13-inch (M4)"
DEVICE_NAME="${1:-$DEFAULT_DEVICE}"
ACTION="${2:-run}"
TIMEOUT_MINUTES="${3:-60}"  # Default 60 minutes
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

# Setup build environment with verbose logging and timeout
setup_build_environment "iOS Expo Build - $ACTION" "$TIMEOUT_SECONDS"

log_info "Device: $DEVICE_NAME"
log_info "Action: $ACTION"
log_info "Timeout: ${TIMEOUT_MINUTES} minutes"
log_info ""

cd "$PROJECT_DIR"

# Function to get device UDID
get_device_udid() {
    local device_name="$1"
    # Extract UDID - redirect verbose logs to stderr so they don't pollute stdout
    log_verbose "Searching for device: $device_name" >&2
    # Get UDID from simctl, extract just the UUID part
    local udid=$(xcrun simctl list devices available 2>/dev/null | grep -i "$device_name" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/' | tr -d '[:space:]')
    # Validate it's a proper UUID format
    if [ -n "$udid" ] && [ ${#udid} -eq 36 ] && echo "$udid" | grep -qE '^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$'; then
        log_verbose "Found device UDID: $udid" >&2
        echo "$udid"
    else
        log_warn "Device not found: $device_name" >&2
        echo ""
    fi
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
        if xcrun simctl list devices | grep -q "$udid.*Booted"; then
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

# Function to open Xcode
open_xcode() {
    log_step "Opening Xcode project"
    
    run_command "npx expo prebuild --platform ios --clean" "Prebuild iOS project" || {
        log_error "Prebuild failed"
        return 1
    }
    
    run_command "npx expo run:ios --no-build" "Open Xcode (no build)" || {
        log_error "Failed to open Xcode"
        return 1
    }
}

# Function to build and run using Expo
build_and_run() {
    local device_name="$1"
    
    log_step "Building and running iOS app with Expo"
    
    # Get device UDID
    DEVICE_UDID=$(get_device_udid "$device_name")
    
    if [ -z "$DEVICE_UDID" ]; then
        log_warn "Device '$device_name' not found, using default"
        log_verbose "Available devices:"
        xcrun simctl list devices available 2>&1 | grep -E "iPad|iPhone" | head -5 | while read -r line; do
            log_verbose "  $line"
        done
        log_info "Running with Expo's device selection..."
        run_command "npx expo run:ios" "Build and run iOS app (default device)" || return 1
    else
        log_success "Found device: $device_name ($DEVICE_UDID)"
        boot_simulator "$DEVICE_UDID" "$device_name"
        
        # Run with specific device - use UDID directly, not device name
        run_command "npx expo run:ios --device $DEVICE_UDID" "Build and run iOS app on $device_name" || return 1
    fi
}

# Function to just build (no run)
build_only() {
    log_step "Building iOS project (prebuild only)"
    
    run_command "npx expo prebuild --platform ios --clean" "Prebuild iOS project" || {
        log_error "Prebuild failed"
        return 1
    }
    
    log_success "Prebuild completed!"
    log_info ""
    log_info "To build in Xcode, run:"
    log_info "  cd ios && xcodebuild -workspace AIEnhancedPersonalCRM.xcworkspace -scheme AIEnhancedPersonalCRM -configuration Debug"
}

# Main execution
case "$ACTION" in
    open)
        open_xcode
        ;;
    build)
        build_only
        ;;
    run|build-and-run)
        build_and_run "$DEVICE_NAME"
        ;;
    *)
        log_error "Unknown action: $ACTION"
        log_info ""
        log_info "Usage: $0 [device_name] [action] [timeout_minutes]"
        log_info ""
        log_info "Actions:"
        log_info "  open          - Prebuild and open Xcode"
        log_info "  build         - Prebuild iOS project only"
        log_info "  run           - Build and run on simulator (default)"
        log_info "  build-and-run - Same as 'run'"
        log_info ""
        log_info "Examples:"
        log_info "  $0                                    # Build and run on default device (60min timeout)"
        log_info "  $0 'iPad Pro 13-inch (M4)' open      # Prebuild and open Xcode"
        log_info "  $0 'iPad Pro 13-inch (M4)' run 90    # Build and run on iPad (90min timeout)"
        log_info "  $0 'iPhone 17 Pro' run                # Build and run on iPhone"
        exit 1
        ;;
esac

log_success "Build script completed successfully!"

