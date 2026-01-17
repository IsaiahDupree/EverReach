#!/bin/bash
# Start Expo with filtered logs to reduce noise

# Colors for better visibility
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Expo with filtered logs...${NC}"
echo -e "${YELLOW}⚠️  Filtering out: avatarUrl undefined logs${NC}"
echo ""

# Start Expo and filter out the noisy logs
npx expo start --dev-client 2>&1 | grep -v "avatarUrl = undefined" | grep -v "avatar_url = undefined"
