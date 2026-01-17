#!/bin/bash

# CI-friendly build test script with verbose logging and error reporting
# Returns: 0 on success, non-zero on failure
# Usage: ./scripts/ci-build-test.sh [build_config] [timeout_minutes]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

# Source build utilities
source "$SCRIPT_DIR/build-utils.sh"

BUILD_CONFIG="${1:-Debug}"
TIMEOUT_MINUTES="${2:-60}"  # Default 60 minutes
TIMEOUT_SECONDS=$((TIMEOUT_MINUTES * 60))

WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
SCHEME="AIEnhancedPersonalCRM"

# Setup build environment with verbose logging and timeout
setup_build_environment "CI Build Test - $BUILD_CONFIG" "$TIMEOUT_SECONDS"

log_info "Build Configuration: $BUILD_CONFIG"
log_info "Timeout: ${TIMEOUT_MINUTES} minutes"

# Ensure iOS project exists
if [ ! -d "$IOS_DIR" ] || ([ ! -f "$WORKSPACE" ] && [ ! -f "$PROJECT/project.pbxproj" ]); then
    log_step "iOS project not found, running prebuild"
    cd "$PROJECT_DIR"
    run_command "npx expo prebuild --platform ios --clean" "Prebuild iOS project" || {
        log_error "Prebuild failed"
        exit 1
    }
fi

cd "$IOS_DIR"

# Build command
log_step "Building iOS project with xcodebuild"
BUILD_CMD=""
if [ -f "$WORKSPACE" ]; then
    BUILD_CMD="xcodebuild \
        -workspace \"$WORKSPACE\" \
        -scheme \"$SCHEME\" \
        -configuration \"$BUILD_CONFIG\" \
        -destination \"generic/platform=iOS Simulator\" \
        -derivedDataPath \"$IOS_DIR/build\" \
        clean build \
        CODE_SIGNING_ALLOWED=NO \
        CODE_SIGN_IDENTITY=\"\" \
        CODE_SIGNING_REQUIRED=NO"
else
    BUILD_CMD="xcodebuild \
        -project \"$PROJECT\" \
        -scheme \"$SCHEME\" \
        -configuration \"$BUILD_CONFIG\" \
        -destination \"generic/platform=iOS Simulator\" \
        -derivedDataPath \"$IOS_DIR/build\" \
        clean build \
        CODE_SIGNING_ALLOWED=NO \
        CODE_SIGN_IDENTITY=\"\" \
        CODE_SIGNING_REQUIRED=NO"
fi

# Run build with timeout and logging
run_command "$BUILD_CMD" "Xcode build ($BUILD_CONFIG)" || {
    BUILD_EXIT_CODE=$?
    
    # Analyze build log for warnings and errors
    if [ -f "$BUILD_LOG_FILE" ]; then
        WARNINGS=$(grep -c "warning:" "$BUILD_LOG_FILE" 2>/dev/null || echo "0")
        ERRORS=$(grep -c "error:" "$BUILD_LOG_FILE" 2>/dev/null || echo "0")
        log_warn "Build completed with $WARNINGS warnings and $ERRORS errors"
        
        if [ "$ERRORS" -gt 0 ]; then
            log_error "Last 20 error lines:"
            grep -i "error:" "$BUILD_LOG_FILE" | tail -20 | while read -r line; do
                log_error "  $line"
            done
        fi
    fi
    
    exit $BUILD_EXIT_CODE
}

# Success - analyze build log
if [ -f "$BUILD_LOG_FILE" ]; then
    WARNINGS=$(grep -c "warning:" "$BUILD_LOG_FILE" 2>/dev/null || echo "0")
    ERRORS=$(grep -c "error:" "$BUILD_LOG_FILE" 2>/dev/null || echo "0")
    log_success "Build succeeded with $WARNINGS warnings and $ERRORS errors"
fi

exit 0

