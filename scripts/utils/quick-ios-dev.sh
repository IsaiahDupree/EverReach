#!/bin/bash

###############################################################################
# Quick iOS Development Build Script
# 
# Fast rebuild for daily development - skips manual steps
#
# Usage:
#   ./quick-ios-dev.sh
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo -e "${BLUE}⚡ Quick iOS Development Build${NC}"
echo ""

# Kill existing Metro bundler
echo -e "${YELLOW}▶  Stopping existing Metro bundler...${NC}"
lsof -ti:8081 | xargs kill -9 2>/dev/null || echo "   (none running)"

# Clear cache
echo -e "${YELLOW}▶  Clearing cache...${NC}"
npx expo start --clear > /dev/null 2>&1 &
sleep 2

# Build and run
echo -e "${YELLOW}▶  Building iOS app...${NC}"
echo ""
npx expo run:ios

echo ""
echo -e "${GREEN}✅ Build complete!${NC}"
echo ""
