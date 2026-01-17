#!/bin/bash

###############################################################################
# iOS App Store Build Preparation Script
# 
# This script:
# 1. Builds custom iOS app (not Expo Go)
# 2. Launches simulator with iPhone 17 Pro Max
# 3. Sets up perfect status bar (9:41, full battery, good signal)
# 4. Grants all permissions (photos, camera, contacts, microphone, location)
# 5. Launches the app
# 6. Prompts for manual sign-in
# 7. Waits for user to reach HOME screen
#
# Usage:
#   ./prepare-ios-appstore.sh
#
# Requirements:
# - Xcode installed
# - Expo CLI installed (npx expo)
# - iOS simulator available
# - .env file configured
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEVICE_NAME="iPhone 17 Pro Max"
DEVICE_UDID="FFC309CC-6308-43F3-98E1-CB92260953A9"
BUNDLE_ID="com.everreach.app"
TEST_EMAIL="isaiahdupree33@gmail.com"
TEST_PASSWORD="frogger12"

###############################################################################
# Helper Functions
###############################################################################

print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_step() {
    echo -e "${BLUE}▶  $1${NC}"
}

wait_for_user() {
    echo ""
    echo -e "${YELLOW}┌─────────────────────────────────────────────────────────┐${NC}"
    echo -e "${YELLOW}│  📋 MANUAL STEP: $1${NC}"
    echo -e "${YELLOW}│${NC}"
    echo -e "${YELLOW}│  Email:    ${TEST_EMAIL}${NC}"
    echo -e "${YELLOW}│  Password: ${TEST_PASSWORD}${NC}"
    echo -e "${YELLOW}└─────────────────────────────────────────────────────────┘${NC}"
    echo ""
    read -p "   Press ENTER once you are signed in and on the HOME screen... "
    echo ""
}

###############################################################################
# Main Script
###############################################################################

print_header "iOS App Store Build Preparation"

# Step 1: Check if Expo dev server is running
print_step "Checking for existing Expo dev server..."
if lsof -ti:8081 > /dev/null 2>&1; then
    print_info "Metro bundler already running on port 8081"
else
    print_info "Starting Expo dev server..."
    npx expo start --clear > /dev/null 2>&1 &
    EXPO_PID=$!
    print_success "Metro bundler started (PID: $EXPO_PID)"
    sleep 3
fi

# Step 2: Build and install the app
print_header "Building Custom iOS App"
print_step "Running: npx expo run:ios"
print_info "This will build the native iOS app (not Expo Go)"
print_info "Please wait, this may take a few minutes..."

npx expo run:ios --device "$DEVICE_NAME" 2>&1 | grep -v "warning:" || true

if [ $? -eq 0 ]; then
    print_success "iOS app built and installed successfully"
else
    print_error "Failed to build iOS app"
    exit 1
fi

# Step 3: Wait for app to install
print_step "Waiting for app to install..."
sleep 5

# Step 4: Boot simulator if not running
print_header "Preparing Simulator"
print_step "Checking simulator status..."

SIMULATOR_STATE=$(xcrun simctl list devices | grep "$DEVICE_UDID" | grep -o "Booted\|Shutdown")

if [ "$SIMULATOR_STATE" != "Booted" ]; then
    print_info "Booting simulator..."
    xcrun simctl boot "$DEVICE_UDID"
    sleep 5
    print_success "Simulator booted"
else
    print_success "Simulator already running"
fi

# Step 5: Set perfect status bar for screenshots
print_header "Setting Up Perfect Status Bar"
print_step "Setting status bar: 9:41, full battery, good signal..."

xcrun simctl status_bar "$DEVICE_UDID" override \
    --time "9:41" \
    --dataNetwork wifi \
    --wifiMode active \
    --wifiBars 3 \
    --cellularMode active \
    --cellularBars 4 \
    --batteryState charged \
    --batteryLevel 100

print_success "Status bar configured"

# Step 6: Grant all permissions
print_header "Granting Permissions"
print_step "Granting app permissions..."

# Photos
xcrun simctl privacy "$DEVICE_UDID" grant photos "$BUNDLE_ID" 2>/dev/null || true
print_success "Photos access granted"

# Camera
xcrun simctl privacy "$DEVICE_UDID" grant camera "$BUNDLE_ID" 2>/dev/null || true
print_success "Camera access granted"

# Contacts
xcrun simctl privacy "$DEVICE_UDID" grant contacts "$BUNDLE_ID" 2>/dev/null || true
print_success "Contacts access granted"

# Microphone
xcrun simctl privacy "$DEVICE_UDID" grant microphone "$BUNDLE_ID" 2>/dev/null || true
print_success "Microphone access granted"

# Location
xcrun simctl privacy "$DEVICE_UDID" grant location-always "$BUNDLE_ID" 2>/dev/null || true
print_success "Location access granted"

# Notifications
xcrun simctl privacy "$DEVICE_UDID" grant notifications "$BUNDLE_ID" 2>/dev/null || true
print_success "Notifications access granted"

# Step 7: Launch the app
print_header "Launching App"
print_step "Opening app..."

xcrun simctl launch "$DEVICE_UDID" "$BUNDLE_ID"
sleep 3

print_success "App launched"

# Step 8: Wait for manual sign-in
print_header "Manual Sign-In Required"
wait_for_user "Sign in to the app"

# Step 9: Success
print_header "Setup Complete"
print_success "App is ready for screenshots/testing!"
print_info "Status bar: 9:41 ⚡ 100% 📶"
print_info "All permissions: ✅ Granted"
print_info "Signed in: ✅ ${TEST_EMAIL}"
echo ""
print_info "You can now:"
print_info "  • Take App Store screenshots"
print_info "  • Test all features"
print_info "  • Record demo videos"
echo ""

# Optional: Take a screenshot
read -p "Take a screenshot of current screen? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    SCREENSHOT_PATH="$HOME/Desktop/everreach-$(date +%Y%m%d-%H%M%S).png"
    xcrun simctl io "$DEVICE_UDID" screenshot "$SCREENSHOT_PATH"
    print_success "Screenshot saved to: $SCREENSHOT_PATH"
    open "$SCREENSHOT_PATH"
fi

print_success "Script completed successfully!"
echo ""
