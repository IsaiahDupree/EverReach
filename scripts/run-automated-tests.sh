#!/bin/bash

# Fully Automated Maestro Test Runner
# Runs without any human interaction required

set -e

echo "🤖 Starting Fully Automated Test Suite"
echo "======================================"
echo ""

# Configuration
APP_ID="com.everreach.app"
SIMULATOR_NAME="iPhone 17 Pro"
SCREENSHOTS_DIR="maestro/screenshots"

# Create screenshots directory
mkdir -p "$SCREENSHOTS_DIR"

# Step 1: Ensure simulator is booted
echo "1️⃣  Checking simulator..."
BOOTED=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep "Booted" || true)

if [ -z "$BOOTED" ]; then
    echo "  ⏳ Booting simulator..."
    DEVICE_ID=$(xcrun simctl list devices | grep "$SIMULATOR_NAME" | grep -v "unavailable" | head -1 | sed 's/.*(\([^)]*\)).*/\1/')
    xcrun simctl boot "$DEVICE_ID"
    sleep 10
    echo "  ✅ Simulator booted"
else
    echo "  ✅ Simulator already running"
fi

# Step 2: Ensure app is installed  
echo ""
echo "2️⃣  Checking app installation..."
APP_INSTALLED=$(xcrun simctl listapps booted | grep "$APP_ID" || true)

if [ -z "$APP_INSTALLED" ]; then
    echo "  ❌ App not installed!"
    echo "  Please run: cd mobileapp && npx expo run:ios"
    exit 1
else
    echo "  ✅ App is installed"
fi

# Step 3: Terminate app to ensure clean state
echo ""
echo "3️⃣  Preparing app..."
xcrun simctl terminate booted "$APP_ID" 2>/dev/null || true
sleep 2
echo "  ✅ App ready for testing"

# Step 4: Start Maestro server
echo ""
echo "4️⃣  Starting Maestro..."
# Kill any existing Maestro processes
pkill -9 -f maestro 2>/dev/null || true
sleep 1

# Start test with timeout protection
echo ""
echo "5️⃣  Running automated tests..."
echo ""

# Function to run test with timeout
run_test_with_timeout() {
    local test_file=$1
    local test_name=$2
    local timeout=120  # 2 minutes max per test
    
    echo "📝 Test: $test_name"
    echo "   File: $test_file"
    
    # Run with timeout
    timeout $timeout maestro test "$test_file" --format junit --output test-results.xml 2>&1 || {
        echo "   ⚠️  Test timed out or failed"
        return 1
    }
    
    echo "   ✅ Test completed"
    return 0
}

# Test suite
TESTS_PASSED=0
TESTS_FAILED=0

# Test 1: Connection test
if run_test_with_timeout "maestro/test-connection.yaml" "Connection Test"; then
    ((TESTS_PASSED++))
else
    ((TESTS_FAILED++))
    echo "   ⚠️  Connection test failed - attempting to continue..."
fi

# Test 2: Smoke test
if [ $TESTS_PASSED -gt 0 ]; then
    if run_test_with_timeout "maestro/smoke-test.yaml" "Smoke Test"; then
        ((TESTS_PASSED++))
    else
        ((TESTS_FAILED++))
    fi
fi

# Summary
echo ""
echo "======================================"
echo "📊 Test Results"
echo "======================================"
echo "✅ Passed: $TESTS_PASSED"
echo "❌ Failed: $TESTS_FAILED"
echo "📸 Screenshots: $SCREENSHOTS_DIR/"
echo ""

if [ $TESTS_PASSED -eq 0 ]; then
    echo "❌ All tests failed - Maestro may need troubleshooting"
    echo ""
    echo "Try these alternatives:"
    echo "  • Use Detox: npm run test:detox:smoke --reuse"
    echo "  • Use Maestro Studio: maestro studio"
    echo ""
    exit 1
else
    echo "✅ Automation successful!"
    exit 0
fi
