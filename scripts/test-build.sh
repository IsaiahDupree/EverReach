#!/bin/bash

# Script to programmatically test the iOS build and detect failures
# Usage: ./scripts/test-build.sh [device_name] [build_config]
# Returns: 0 on success, non-zero on failure

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"

# Default values
DEFAULT_DEVICE="iPad Pro 13-inch (M4)"
DEVICE_NAME="${1:-$DEFAULT_DEVICE}"
BUILD_CONFIG="${2:-Debug}"

# Xcode project paths
WORKSPACE="$IOS_DIR/AIEnhancedPersonalCRM.xcworkspace"
PROJECT="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"
SCHEME="AIEnhancedPersonalCRM"

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🧪 Testing iOS Build                 ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}→${NC} Device: $DEVICE_NAME"
echo -e "${YELLOW}→${NC} Configuration: $BUILD_CONFIG"
echo ""

# Check if iOS project exists
if [ ! -d "$IOS_DIR" ] || ([ ! -f "$WORKSPACE" ] && [ ! -f "$PROJECT/project.pbxproj" ]); then
    echo -e "${YELLOW}⚠${NC} iOS project not found. Running prebuild..."
    cd "$PROJECT_DIR"
    npx expo prebuild --platform ios --clean
    echo -e "${GREEN}✓${NC} Prebuild completed"
fi

# Get device UDID if device name provided
DEVICE_UDID=""
if [ "$DEVICE_NAME" != "generic" ]; then
    echo -e "${YELLOW}→${NC} Finding device UDID..."
    DEVICE_UDID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | grep -v "unavailable" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/' | xargs)
    if [ -z "$DEVICE_UDID" ]; then
        echo -e "${YELLOW}⚠${NC} Device '$DEVICE_NAME' not found, using generic simulator"
        DEVICE_UDID=""
    else
        echo -e "${GREEN}✓${NC} Found device: $DEVICE_NAME ($DEVICE_UDID)"
    fi
fi

# Determine destination
# xcodebuild prefers name-based matching, but we'll try both
if [ -n "$DEVICE_UDID" ]; then
    # Try with name first (more reliable)
    DESTINATION="platform=iOS Simulator,name=$DEVICE_NAME"
else
    DESTINATION="generic/platform=iOS Simulator"
fi

# Build command
echo ""
echo -e "${BLUE}🔨 Starting build...${NC}"
echo ""

BUILD_START_TIME=$(date +%s)

# Use xcodebuild to build (without running)
if [ -f "$WORKSPACE" ]; then
    BUILD_COMMAND="xcodebuild \
        -workspace \"$WORKSPACE\" \
        -scheme \"$SCHEME\" \
        -configuration \"$BUILD_CONFIG\" \
        -destination \"$DESTINATION\" \
        -derivedDataPath \"$IOS_DIR/build\" \
        clean build \
        2>&1"
else
    BUILD_COMMAND="xcodebuild \
        -project \"$PROJECT\" \
        -scheme \"$SCHEME\" \
        -configuration \"$BUILD_CONFIG\" \
        -destination \"$DESTINATION\" \
        -derivedDataPath \"$IOS_DIR/build\" \
        clean build \
        2>&1"
fi

# Run build and capture output
cd "$IOS_DIR"

# Create log file
LOG_FILE="$PROJECT_DIR/build-test-$(date +%Y%m%d-%H%M%S).log"
echo "Build log: $LOG_FILE"
echo ""

# Run build and tee to log file
eval $BUILD_COMMAND | tee "$LOG_FILE"
BUILD_EXIT_CODE=${PIPESTATUS[0]}

BUILD_END_TIME=$(date +%s)
BUILD_DURATION=$((BUILD_END_TIME - BUILD_START_TIME))

# Check if build actually succeeded by looking for "BUILD SUCCEEDED" in output
BUILD_SUCCEEDED=$(grep -i "BUILD SUCCEEDED" "$LOG_FILE" 2>/dev/null || echo "")
BUILD_FAILED=$(grep -i "BUILD FAILED" "$LOG_FILE" 2>/dev/null || echo "")

if [ $BUILD_EXIT_CODE -eq 0 ] && [ -n "$BUILD_SUCCEEDED" ] && [ -z "$BUILD_FAILED" ]; then
    echo ""
    echo -e "${GREEN}╔═══════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ Build Succeeded!                    ║${NC}"
    echo -e "${GREEN}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${GREEN}✓${NC} Build completed successfully"
    echo -e "${GREEN}✓${NC} Duration: ${BUILD_DURATION}s"
    echo -e "${GREEN}✓${NC} Log saved to: $LOG_FILE"
    echo ""
    
    # Check for warnings in the log
    WARNING_COUNT=$(grep -c "warning:" "$LOG_FILE" 2>/dev/null | tr -d '\n' || echo "0")
    ERROR_COUNT=$(grep -c "error:" "$LOG_FILE" 2>/dev/null | tr -d '\n' || echo "0")
    
    # Ensure we have valid integers
    WARNING_COUNT=${WARNING_COUNT:-0}
    ERROR_COUNT=${ERROR_COUNT:-0}
    
    # Remove any non-numeric characters
    WARNING_COUNT=$(echo "$WARNING_COUNT" | tr -d '[:alpha:][:space:]' || echo "0")
    ERROR_COUNT=$(echo "$ERROR_COUNT" | tr -d '[:alpha:][:space:]' || echo "0")
    
    if [ -n "$WARNING_COUNT" ] && [ "$WARNING_COUNT" -gt 0 ] 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} Found $WARNING_COUNT warning(s) in build log"
    fi
    
    if [ -n "$ERROR_COUNT" ] && [ "$ERROR_COUNT" -gt 0 ] 2>/dev/null; then
        echo -e "${YELLOW}⚠${NC} Found $ERROR_COUNT error message(s) in build log"
        echo -e "${YELLOW}→${NC} These may be non-fatal errors or false positives. Check the log file."
    fi
    
    exit 0
else
    echo ""
    echo -e "${RED}╔═══════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ Build Failed!                      ║${NC}"
    echo -e "${RED}╚═══════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${RED}✗${NC} Build failed with exit code: $BUILD_EXIT_CODE"
    echo -e "${RED}✗${NC} Duration: ${BUILD_DURATION}s"
    echo -e "${RED}✗${NC} Log saved to: $LOG_FILE"
    echo ""
    
    # Extract errors from log
    echo -e "${YELLOW}📋 Extracting errors from build log...${NC}"
    echo ""
    
    # Get last 20 error lines
    ERROR_LINES=$(grep -i "error:" "$LOG_FILE" | tail -20)
    if [ -n "$ERROR_LINES" ]; then
        echo -e "${RED}Key errors:${NC}"
        echo "$ERROR_LINES" | head -10
        echo ""
    fi
    
    # Get build failure summary
    FAILURE_SUMMARY=$(grep -A 5 "BUILD FAILED" "$LOG_FILE" | head -10)
    if [ -n "$FAILURE_SUMMARY" ]; then
        echo -e "${RED}Build failure summary:${NC}"
        echo "$FAILURE_SUMMARY"
        echo ""
    fi
    
    echo -e "${YELLOW}→${NC} Full build log: $LOG_FILE"
    echo -e "${YELLOW}→${NC} To view errors: grep -i 'error:' $LOG_FILE | tail -20"
    echo ""
    
    exit $BUILD_EXIT_CODE
fi

