#!/bin/bash

# Setup iOS Automation Tools
# Run: bash scripts/setup-automation.sh

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║                                                              ║${NC}"
echo "${BLUE}║           ${GREEN}iOS AUTOMATION SETUP${NC}${BLUE}                             ║${NC}"
echo "${BLUE}║                                                              ║${NC}"
echo "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Homebrew is installed
echo "${YELLOW}Checking for Homebrew...${NC}"
if ! command -v brew &> /dev/null; then
    echo "${RED}❌ Homebrew not found!${NC}"
    echo "${YELLOW}Install from: https://brew.sh${NC}"
    exit 1
fi
echo "${GREEN}✓ Homebrew installed${NC}"
echo ""

# Install Maestro
echo "${YELLOW}Installing Maestro...${NC}"
if command -v maestro &> /dev/null; then
    echo "${GREEN}✓ Maestro already installed${NC}"
    maestro --version
else
    brew tap mobile-dev-inc/tap
    brew install maestro
    echo "${GREEN}✓ Maestro installed successfully${NC}"
fi
echo ""

# Create screenshots directory
echo "${YELLOW}Setting up directories...${NC}"
mkdir -p maestro/screenshots
echo "${GREEN}✓ Directories created${NC}"
echo ""

# Verify installation
echo "${YELLOW}Verifying installation...${NC}"
if command -v maestro &> /dev/null; then
    echo "${GREEN}✓ Maestro is ready!${NC}"
    echo ""
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "${GREEN}✓ Setup Complete!${NC}"
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "${YELLOW}Quick Start:${NC}"
    echo ""
    echo "1. Make sure simulator is running:"
    echo "   ${BLUE}open -a Simulator${NC}"
    echo ""
    echo "2. Make sure app is running:"
    echo "   ${BLUE}npm run ios${NC}"
    echo ""
    echo "3. Run automated test:"
    echo "   ${BLUE}npm run test:automated${NC}"
    echo ""
    echo "   OR"
    echo ""
    echo "   ${BLUE}maestro test maestro/subscription-automated.yaml${NC}"
    echo ""
    echo "${YELLOW}📚 Documentation:${NC}"
    echo "   • AUTOMATION_SETUP.md - Full setup guide"
    echo "   • maestro/subscription-automated.yaml - Test file"
    echo ""
    echo "${YELLOW}🎥 Visual Test Builder:${NC}"
    echo "   ${BLUE}maestro studio${NC}"
    echo ""
else
    echo "${RED}❌ Installation failed${NC}"
    exit 1
fi
