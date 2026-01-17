#!/bin/bash

# EverReach Icon Generator
# Generates all required app icons from a source 1024x1024 image

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Source image (1024x1024)
SOURCE="../assets/branding/logo-source-1024.png"

echo -e "${BLUE}🎨 EverReach Icon Generator${NC}"
echo "================================"

# Check if ImageMagick is installed
if ! command -v convert &> /dev/null; then
    echo -e "${RED}❌ ImageMagick not found${NC}"
    echo ""
    echo "Install ImageMagick:"
    echo "  macOS:   brew install imagemagick"
    echo "  Ubuntu:  sudo apt-get install imagemagick"
    echo "  Windows: Download from https://imagemagick.org/script/download.php"
    exit 1
fi

# Check if source exists
if [ ! -f "$SOURCE" ]; then
    echo -e "${RED}❌ Source image not found: $SOURCE${NC}"
    echo ""
    echo "Please save your logo as:"
    echo "  mobileapp/assets/branding/logo-source-1024.png"
    echo ""
    echo "Requirements:"
    echo "  - Size: 1024×1024px"
    echo "  - Format: PNG"
    echo "  - No transparency (or white background)"
    exit 1
fi

echo -e "${GREEN}✅ Source image found${NC}"
echo "📍 Location: $SOURCE"
echo ""

# Verify source dimensions
DIMENSIONS=$(identify -format "%wx%h" "$SOURCE")
if [ "$DIMENSIONS" != "1024x1024" ]; then
    echo -e "${YELLOW}⚠️  Warning: Source image is $DIMENSIONS, should be 1024x1024${NC}"
    echo "Proceeding anyway..."
    echo ""
fi

# Create directories if needed
echo "📁 Creating directories..."
mkdir -p ../assets/images
mkdir -p ../assets/branding/icons
mkdir -p ../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset
echo ""

# Main app icons (Expo)
echo -e "${BLUE}📱 Generating main app icons...${NC}"
convert "$SOURCE" -resize 1024x1024 ../assets/images/icon.png
echo "  ✓ icon.png (1024×1024)"

convert "$SOURCE" -resize 1024x1024 ../assets/images/adaptive-icon.png
echo "  ✓ adaptive-icon.png (1024×1024)"

convert "$SOURCE" -resize 1024x1024 ../assets/images/splash-icon.png
echo "  ✓ splash-icon.png (1024×1024)"

convert "$SOURCE" -resize 48x48 ../assets/images/favicon.png
echo "  ✓ favicon.png (48×48)"
echo ""

# Branding assets
echo -e "${BLUE}🎯 Generating branding assets...${NC}"
convert "$SOURCE" -resize 1024x1024 ../assets/branding/icons/appstore-icon-1024.png
echo "  ✓ appstore-icon-1024.png (1024×1024)"

convert "$SOURCE" -resize 1024x1024 ../assets/branding/icons/appstore-icon-1024-flat.png
echo "  ✓ appstore-icon-1024-flat.png (1024×1024)"

convert "$SOURCE" -resize 512x512 ../assets/branding/icons/play-icon-512.png
echo "  ✓ play-icon-512.png (512×512)"
echo ""

# iOS native icons
echo -e "${BLUE}🍎 Generating iOS icons...${NC}"
IOS_DIR="../ios/AIEnhancedPersonalCRM/Images.xcassets/AppIcon.appiconset"

# iOS icon sizes and filenames
declare -A IOS_ICONS=(
    ["1024"]="App-Icon-1024x1024@1x.png"
    ["20"]="App-Icon-20x20@1x.png"
    ["40"]="App-Icon-20x20@2x.png"
    ["60"]="App-Icon-20x20@3x.png"
    ["29"]="App-Icon-29x29@1x.png"
    ["58"]="App-Icon-29x29@2x.png"
    ["87"]="App-Icon-29x29@3x.png"
    ["40"]="App-Icon-40x40@1x.png"
    ["80"]="App-Icon-40x40@2x.png"
    ["120"]="App-Icon-40x40@3x.png"
    ["120"]="App-Icon-60x60@2x.png"
    ["180"]="App-Icon-60x60@3x.png"
    ["76"]="App-Icon-76x76@1x.png"
    ["152"]="App-Icon-76x76@2x.png"
    ["167"]="App-Icon-83.5x83.5@2x.png"
)

convert "$SOURCE" -resize 1024x1024 "$IOS_DIR/App-Icon-1024x1024@1x.png"
echo "  ✓ 1024×1024 (1x)"

convert "$SOURCE" -resize 20x20 "$IOS_DIR/App-Icon-20x20@1x.png"
echo "  ✓ 20×20 (1x)"

convert "$SOURCE" -resize 40x40 "$IOS_DIR/App-Icon-20x20@2x.png"
echo "  ✓ 20×20 (2x)"

convert "$SOURCE" -resize 60x60 "$IOS_DIR/App-Icon-20x20@3x.png"
echo "  ✓ 20×20 (3x)"

convert "$SOURCE" -resize 29x29 "$IOS_DIR/App-Icon-29x29@1x.png"
echo "  ✓ 29×29 (1x)"

convert "$SOURCE" -resize 58x58 "$IOS_DIR/App-Icon-29x29@2x.png"
echo "  ✓ 29×29 (2x)"

convert "$SOURCE" -resize 87x87 "$IOS_DIR/App-Icon-29x29@3x.png"
echo "  ✓ 29×29 (3x)"

convert "$SOURCE" -resize 40x40 "$IOS_DIR/App-Icon-40x40@1x.png"
echo "  ✓ 40×40 (1x)"

convert "$SOURCE" -resize 80x80 "$IOS_DIR/App-Icon-40x40@2x.png"
echo "  ✓ 40×40 (2x)"

convert "$SOURCE" -resize 120x120 "$IOS_DIR/App-Icon-40x40@3x.png"
echo "  ✓ 40×40 (3x)"

convert "$SOURCE" -resize 120x120 "$IOS_DIR/App-Icon-60x60@2x.png"
echo "  ✓ 60×60 (2x)"

convert "$SOURCE" -resize 180x180 "$IOS_DIR/App-Icon-60x60@3x.png"
echo "  ✓ 60×60 (3x)"

convert "$SOURCE" -resize 76x76 "$IOS_DIR/App-Icon-76x76@1x.png"
echo "  ✓ 76×76 (1x)"

convert "$SOURCE" -resize 152x152 "$IOS_DIR/App-Icon-76x76@2x.png"
echo "  ✓ 76×76 (2x)"

convert "$SOURCE" -resize 167x167 "$IOS_DIR/App-Icon-83.5x83.5@2x.png"
echo "  ✓ 83.5×83.5 (2x)"
echo ""

# Backend/Web icons (if needed)
if [ -d "../backend/assets/images" ]; then
    echo -e "${BLUE}🌐 Updating backend icons...${NC}"
    convert "$SOURCE" -resize 1024x1024 ../../backend/assets/images/icon.png
    echo "  ✓ backend icon.png"
    
    convert "$SOURCE" -resize 48x48 ../../backend/assets/images/favicon.png
    echo "  ✓ backend favicon.png"
    
    convert "$SOURCE" -resize 1024x1024 ../../backend/assets/images/splash-icon.png
    echo "  ✓ backend splash-icon.png"
    
    convert "$SOURCE" -resize 1024x1024 ../../backend/assets/images/adaptive-icon.png
    echo "  ✓ backend adaptive-icon.png"
    echo ""
fi

# Summary
echo -e "${GREEN}✅ Icon generation complete!${NC}"
echo ""
echo "📦 Generated:"
echo "  • 4 main app icons (Expo)"
echo "  • 3 branding assets"
echo "  • 15 iOS native icons"
if [ -d "../backend/assets/images" ]; then
    echo "  • 4 backend/web icons"
fi
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. cd .."
echo "  2. npx expo prebuild --clean"
echo "  3. npx expo start"
echo ""
echo "🚀 Your new icon will appear in the app!"
