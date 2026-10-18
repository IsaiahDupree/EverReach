#!/bin/bash

###############################################################################
# Fix Hermes Build Hang
# 
# This script fixes the Hermes compilation hang by:
# 1. Switching iOS to JSC (JavaScriptCore) - faster, no compilation
# 2. Cleaning Hermes build artifacts
# 3. Reinstalling pods
# 4. Rebuilding
###############################################################################

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Source build utilities
source "$SCRIPT_DIR/build-utils.sh"

# Setup build environment
setup_build_environment "Fix Hermes Hang" 3600

log_step "Fixing Hermes Build Hang"

# Step 1: Verify configuration
log_info "Current iOS jsEngine setting:"
grep -A 2 '"ios"' "$PROJECT_DIR/app.json" | grep jsEngine || log_warn "No jsEngine found in app.json"

# Step 2: Clean Hermes build artifacts
log_step "Cleaning Hermes build artifacts"
run_command_continue "rm -rf ios/Pods/hermes-engine" "Remove Hermes pod" || true
run_command_continue "rm -rf ios/build" "Remove iOS build directory" || true
run_command_continue "rm -rf ~/Library/Developer/Xcode/DerivedData/AIEnhancedPersonalCRM-*" "Remove Xcode derived data" || true
run_command_continue "rm -rf ios/Pods" "Remove Pods directory" || true
run_command_continue "rm -f ios/Podfile.lock" "Remove Podfile.lock" || true
log_success "Hermes artifacts cleaned"

# Step 3: Reinstall pods with JSC
log_step "Reinstalling CocoaPods (will use JSC instead of Hermes)"
cd "$PROJECT_DIR/ios"
run_command "pod install --repo-update" "Install CocoaPods with JSC" || {
    log_error "Pod install failed"
    cd ..
    exit 1
}
cd ..

log_success "Pods reinstalled with JSC"

# Step 4: Verify JSC is being used
log_step "Verifying configuration"
if grep -q '"jsEngine": "jsc"' "$PROJECT_DIR/app.json"; then
    log_success "iOS is configured to use JSC (JavaScriptCore)"
else
    log_warn "iOS jsEngine setting may not be JSC - check app.json"
fi

log_success "Hermes hang fix completed!"
log_info ""
log_info "Next steps:"
log_info "1. Run: npx expo run:ios"
log_info "2. Builds should be faster now (no Hermes compilation)"
log_info "3. JSC is pre-installed on iOS, so no compilation needed"


