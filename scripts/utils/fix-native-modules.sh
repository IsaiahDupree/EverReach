#!/bin/bash

###############################################################################
# Fix Native Modules Script
# 
# Fixes "Cannot find native module" errors by:
# 1. Cleaning build artifacts
# 2. Running prebuild to generate native projects
# 3. Installing iOS pods
# 4. Rebuilding the app
###############################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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
    echo -e "${YELLOW}▶  $1${NC}"
}

print_header "Fixing Native Module Errors"

# Step 1: Clean Metro bundler cache
print_info "Cleaning Metro bundler cache..."
rm -rf node_modules/.cache
rm -rf .expo
print_success "Cache cleared"

# Step 2: Kill existing Metro bundler
print_info "Stopping Metro bundler..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "   (none running)"
print_success "Metro stopped"

# Step 3: Clean iOS build
print_info "Cleaning iOS build artifacts..."
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/AIEnhancedPersonalCRM-*
print_success "iOS build cleaned"

# Step 4: Prebuild (regenerate native projects)
print_header "Regenerating Native Projects"
print_info "Running: npx expo prebuild --clean"
print_info "This will regenerate iOS and Android native code..."
echo ""

npx expo prebuild --clean --platform ios

print_success "Prebuild completed"

# Step 5: Install iOS pods
print_header "Installing iOS Pods"
print_info "Running: pod install in ios/"
echo ""

cd ios
pod install --repo-update
cd ..

print_success "Pods installed"

# Step 6: Rebuild the app
print_header "Rebuilding iOS App"
print_info "Running: npx expo run:ios"
echo ""

npx expo run:ios

print_success "Build complete!"

print_header "✅ Native Modules Fixed"
echo ""
echo -e "${GREEN}The app should now launch without 'Cannot find native module' errors.${NC}"
echo ""
