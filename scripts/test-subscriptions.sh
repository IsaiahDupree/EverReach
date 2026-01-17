#!/bin/bash

# 🧪 Subscription Testing Automation Script
# Quick test runner for subscription flows

set -e

echo "🧪 EverReach Subscription Test Runner"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Parse arguments
TEST_TYPE="${1:-all}"
VERBOSE="${2:-false}"

run_unit_tests() {
  echo -e "${YELLOW}📋 Running Unit Tests...${NC}"
  cd "$(dirname "$0")/.."
  
  if [ "$VERBOSE" = "true" ]; then
    yarn test SubscriptionProvider.test.tsx --verbose
  else
    yarn test SubscriptionProvider.test.tsx
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Unit tests passed!${NC}"
    return 0
  else
    echo -e "${RED}❌ Unit tests failed!${NC}"
    return 1
  fi
}

run_e2e_tests() {
  echo -e "${YELLOW}🎭 Running E2E Tests...${NC}"
  cd "$(dirname "$0")/.."
  
  # Check if Detox is installed
  if ! command -v detox &> /dev/null; then
    echo -e "${RED}❌ Detox not installed!${NC}"
    echo "Run: yarn add --dev detox"
    return 1
  fi
  
  # Build app if needed
  if [ ! -d "ios/build/Build/Products/Debug-iphonesimulator/AIEnhancedPersonalCRM.app" ]; then
    echo "Building app..."
    detox build -c ios.debug
  fi
  
  # Run E2E tests
  if [ "$VERBOSE" = "true" ]; then
    DEBUG=detox* detox test -c ios.debug --take-screenshots failing
  else
    detox test -c ios.debug
  fi
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ E2E tests passed!${NC}"
    return 0
  else
    echo -e "${RED}❌ E2E tests failed!${NC}"
    return 1
  fi
}

test_backend_sync() {
  echo -e "${YELLOW}🔄 Testing Backend Sync...${NC}"
  
  # Check if backend is running
  if ! curl -s http://localhost:3000/api/health > /dev/null; then
    echo -e "${RED}❌ Backend not running on port 3000!${NC}"
    echo "Start backend: cd backend/backend-vercel && npm run dev"
    return 1
  fi
  
  echo -e "${GREEN}✅ Backend is healthy${NC}"
  
  # Test entitlements endpoint
  echo "Testing /api/v1/me/entitlements..."
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/me/entitlements)
  
  if [ "$RESPONSE" = "401" ]; then
    echo -e "${YELLOW}⚠️  Endpoint requires authentication (expected)${NC}"
    return 0
  elif [ "$RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Endpoint accessible${NC}"
    return 0
  else
    echo -e "${RED}❌ Unexpected response: $RESPONSE${NC}"
    return 1
  fi
}

test_subscription_flow() {
  echo -e "${YELLOW}💳 Testing Complete Purchase Flow...${NC}"
  
  echo "1. Testing backend connectivity..."
  test_backend_sync || return 1
  
  echo ""
  echo "2. Running unit tests..."
  run_unit_tests || return 1
  
  echo ""
  echo "3. Running E2E purchase flow test..."
  cd "$(dirname "$0")/.."
  detox test -c ios.debug --grep="should complete Core plan purchase"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Complete subscription flow tested successfully!${NC}"
    return 0
  else
    echo -e "${RED}❌ Subscription flow test failed!${NC}"
    return 1
  fi
}

# Main execution
case "$TEST_TYPE" in
  unit)
    run_unit_tests
    ;;
  e2e)
    run_e2e_tests
    ;;
  backend)
    test_backend_sync
    ;;
  flow)
    test_subscription_flow
    ;;
  all)
    echo "Running all tests..."
    echo ""
    
    test_backend_sync
    BACKEND_STATUS=$?
    
    echo ""
    run_unit_tests
    UNIT_STATUS=$?
    
    echo ""
    echo -e "${YELLOW}⏩ Skipping E2E tests (use './test-subscriptions.sh e2e' to run)${NC}"
    
    echo ""
    echo "======================================"
    echo "📊 Test Summary:"
    echo "======================================"
    [ $BACKEND_STATUS -eq 0 ] && echo -e "Backend Sync: ${GREEN}PASS${NC}" || echo -e "Backend Sync: ${RED}FAIL${NC}"
    [ $UNIT_STATUS -eq 0 ] && echo -e "Unit Tests: ${GREEN}PASS${NC}" || echo -e "Unit Tests: ${RED}FAIL${NC}"
    echo -e "E2E Tests: ${YELLOW}SKIPPED${NC}"
    
    if [ $BACKEND_STATUS -eq 0 ] && [ $UNIT_STATUS -eq 0 ]; then
      echo ""
      echo -e "${GREEN}✅ All automated tests passed!${NC}"
      exit 0
    else
      echo ""
      echo -e "${RED}❌ Some tests failed!${NC}"
      exit 1
    fi
    ;;
  *)
    echo "Usage: ./test-subscriptions.sh [unit|e2e|backend|flow|all] [verbose]"
    echo ""
    echo "Options:"
    echo "  unit    - Run unit tests only"
    echo "  e2e     - Run end-to-end tests"
    echo "  backend - Test backend connectivity"
    echo "  flow    - Test complete purchase flow"
    echo "  all     - Run all tests (default)"
    echo ""
    echo "Examples:"
    echo "  ./test-subscriptions.sh unit"
    echo "  ./test-subscriptions.sh e2e verbose"
    echo "  ./test-subscriptions.sh all"
    exit 1
    ;;
esac
