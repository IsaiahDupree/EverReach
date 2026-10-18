#!/bin/bash

# ==========================================
# iPad 13" Display Screenshot Capture
# ==========================================
# Captures screenshots for iPad Pro 13-inch (M4)
# for App Store submission.
# ==========================================

set -eo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATE=$(date +"%Y-%m-%d-%H%M")
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUTPUT_DIR="$PROJECT_ROOT/marketing/screenshots/appstore-ipad-$DATE"
DEVICE_NAME="iPad Air 13-inch (M3)"
RESOLUTION="2064x2752"

# Screenshot list
SCREENSHOTS=(
    "01-contacts-list:Home screen with contacts list"
    "02-contact-detail:Contact detail with context summary"
    "03-voice-note:Voice note recording or transcription"
    "04-search-tags:Search with tags and filters"
    "05-warmth-score:Warmth score and relationship tracking"
    "06-goal-compose:Goal-based message composition"
    "07-subscription:Subscription plans and pricing"
    "08-settings:Settings and privacy"
)

echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  iPad 13\" Screenshot Capture        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo -e "${GREEN}✓${NC} Output directory: $OUTPUT_DIR"
echo ""

# Find device UDID
echo -e "${YELLOW}→${NC} Finding iPad simulator..."
DEVICE_ID=$(xcrun simctl list devices available | grep "$DEVICE_NAME" | grep -v "unavailable" | head -1 | grep -oE '\([A-F0-9-]+\)' | tr -d '()')

if [ -z "$DEVICE_ID" ]; then
    echo -e "${RED}✗${NC} Device not found: $DEVICE_NAME"
    echo -e "${YELLOW}→${NC} Available devices:"
    xcrun simctl list devices available | grep -i "iPad"
    exit 1
fi

echo -e "${GREEN}✓${NC} Found device: $DEVICE_ID"
echo ""

# Boot device
echo -e "${YELLOW}→${NC} Booting simulator..."
if xcrun simctl list devices | grep "$DEVICE_ID" | grep -q "Booted"; then
    echo -e "${GREEN}✓${NC} Device already booted"
else
    xcrun simctl boot "$DEVICE_ID"
    sleep 5
    echo -e "${GREEN}✓${NC} Device booted"
fi

# Set status bar
echo -e "${YELLOW}→${NC} Configuring status bar..."
xcrun simctl status_bar "$DEVICE_ID" override --time "9:41" --batteryLevel 100 --batteryState charged --cellularMode active --cellularBars 4 --wifiMode active --wifiBars 3
echo -e "${GREEN}✓${NC} Status bar configured (9:41 AM, 100% battery)"

# Grant permissions
echo -e "${YELLOW}→${NC} Granting permissions..."
xcrun simctl privacy "$DEVICE_ID" grant all com.everreach.app > /dev/null 2>&1 || true
echo -e "${GREEN}✓${NC} Permissions granted"
echo ""

# Find the built app
echo -e "${YELLOW}→${NC} Looking for built app..."
APP_PATH=$(find ~/Library/Developer/Xcode/DerivedData/AIEnhancedPersonalCRM-*/Build/Products/Debug-iphonesimulator -name "AIEnhancedPersonalCRM.app" -type d 2>/dev/null | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}✗${NC} App not found in DerivedData"
    echo -e "${YELLOW}→${NC} Checking if app is installed on simulator..."
    
    # Check if app is already installed
    if xcrun simctl listapps "$DEVICE_ID" | grep -q "com.everreach.app"; then
        echo -e "${GREEN}✓${NC} App is already installed on simulator"
    else
        echo -e "${YELLOW}⚠${NC}  App not found. Please build first:"
        echo "  cd $PROJECT_ROOT"
        echo "  npx expo run:ios --device \"$DEVICE_NAME\""
        echo ""
        echo -e "${YELLOW}→${NC} Waiting for build to complete..."
        echo -e "${YELLOW}→${NC} Or press Ctrl+C to exit and build manually"
        read -p "Press ENTER when build is complete... " </dev/tty
    fi
fi

# Launch app
echo -e "${YELLOW}→${NC} Launching app..."
xcrun simctl launch "$DEVICE_ID" com.everreach.app || {
    echo -e "${RED}✗${NC} Failed to launch app"
    echo -e "${YELLOW}→${NC} Make sure the app is built and installed"
    exit 1
}

sleep 5
echo -e "${GREEN}✓${NC} App launched"
echo ""

# Interactive capture
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${BLUE}  $DEVICE_NAME ($RESOLUTION)${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

for screenshot_info in "${SCREENSHOTS[@]}"; do
    IFS=':' read -r filename description <<< "$screenshot_info"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}Screenshot: ${NC}$description"
    echo -e "${YELLOW}File: ${NC}$filename.png"
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}Instructions:${NC}"
    echo "1. Navigate to: $description"
    echo "2. Ensure the screen looks good for iPad"
    echo "3. Press ENTER when ready to capture"
    echo ""
    read -p "Press ENTER to capture screenshot... " </dev/tty
    
    # Capture screenshot
    if xcrun simctl io "$DEVICE_ID" screenshot "$OUTPUT_DIR/$filename.png" 2>/dev/null; then
        # Verify dimensions
        actual_size=$(sips -g pixelWidth -g pixelHeight "$OUTPUT_DIR/$filename.png" 2>/dev/null | grep -E 'pixelWidth|pixelHeight' | awk '{print $2}' | tr '\n' 'x' | sed 's/x$//')
        
        if [ "$actual_size" = "$RESOLUTION" ]; then
            echo -e "${GREEN}✓${NC} Screenshot saved: $filename.png ($actual_size)"
        else
            echo -e "${YELLOW}⚠${NC}  Screenshot saved: $filename.png (got $actual_size, expected $RESOLUTION)"
        fi
    else
        echo -e "${RED}✗${NC} Failed to capture screenshot"
    fi
    echo ""
done

echo -e "${GREEN}✓${NC} All screenshots captured for $DEVICE_NAME"
echo -e "${GREEN}✓${NC} Saved to: $OUTPUT_DIR"
echo ""

# Summary
echo -e "${BLUE}╔═══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Screenshot Capture Complete!        ║${NC}"
echo -e "${BLUE}╚═══════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}✓${NC} Output directory: $OUTPUT_DIR"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Review screenshots in: $OUTPUT_DIR"
echo "2. Upload to App Store Connect:"
echo "   - Go to your app → App Store → Screenshots"
echo "   - Select 'iPad 13\" Display'"
echo "   - Drag and drop screenshots"
echo ""
echo -e "${GREEN}Done!${NC} 🎉"

