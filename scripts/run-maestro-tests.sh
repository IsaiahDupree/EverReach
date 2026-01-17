#!/bin/bash

# Run Maestro Tests with Better Output
# Usage: bash scripts/run-maestro-tests.sh [test-file]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${BLUE}║                                                              ║${NC}"
echo "${BLUE}║           ${GREEN}MAESTRO AUTOMATED TESTS${NC}${BLUE}                          ║${NC}"
echo "${BLUE}║                                                              ║${NC}"
echo "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if Maestro is installed
if ! command -v maestro &> /dev/null; then
    echo "${RED}❌ Maestro not installed!${NC}"
    echo "${YELLOW}Run: bash scripts/setup-automation.sh${NC}"
    exit 1
fi

# Check if simulator is running
if ! xcrun simctl list devices | grep -q "Booted"; then
    echo "${YELLOW}⚠️  No simulator running${NC}"
    echo "${CYAN}Starting simulator...${NC}"
    open -a Simulator
    echo "${GREEN}✓ Waiting for simulator...${NC}"
    sleep 5
fi

# Check if Metro is running
if ! ps aux | grep -q "[e]xpo start"; then
    echo "${YELLOW}⚠️  Metro bundler not running${NC}"
    echo "${CYAN}Please start: npm run ios${NC}"
    exit 1
fi

echo "${GREEN}✓ Simulator running${NC}"
echo "${GREEN}✓ Metro running${NC}"
echo ""

# Determine which test to run
TEST_FILE=${1:-"test-suite.yaml"}

if [ ! -f "maestro/$TEST_FILE" ]; then
    echo "${RED}❌ Test file not found: maestro/$TEST_FILE${NC}"
    echo ""
    echo "${YELLOW}Available tests:${NC}"
    ls -1 maestro/*.yaml | sed 's/maestro\//  • /'
    exit 1
fi

echo "${CYAN}Running: $TEST_FILE${NC}"
echo ""

# Create screenshots directory
mkdir -p maestro/screenshots

# Run Maestro test
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
maestro test "maestro/$TEST_FILE"
TEST_EXIT_CODE=$?
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Show results
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "${GREEN}${BOLD}✓ ALL TESTS PASSED!${NC}"
    echo ""
    echo "${CYAN}Screenshots saved to: maestro/screenshots/${NC}"
    exit 0
else
    echo "${RED}${BOLD}✗ TESTS FAILED${NC}"
    echo ""
    echo "${YELLOW}Check screenshots in: maestro/screenshots/${NC}"
    exit 1
fi
