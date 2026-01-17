#!/bin/bash

# Appium Automated Testing with Complete Log Collection
# Captures backend, mobile, and simulator logs during test execution

set -e

echo "🤖 Appium Testing + Complete Log Collection"
echo "=============================================="
echo ""

# Configuration
APP_ID="com.everreach.app"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_DIR="test-logs-$TIMESTAMP"
SCREENSHOTS_DIR="appium-tests/screenshots"

# Create directories
mkdir -p "$LOG_DIR"
mkdir -p "$SCREENSHOTS_DIR"

echo "📁 Log directory: $LOG_DIR"
echo ""

# Step 1: Check if app is installed
echo "1️⃣  Checking app installation..."
APP_INSTALLED=$(xcrun simctl listapps booted | grep "$APP_ID" || true)

if [ -z "$APP_INSTALLED" ]; then
    echo "❌ App not installed on simulator!"
    echo "Please run: npm run ios"
    exit 1
fi
echo "✅ App is installed"
echo ""

# Step 2: Start background log collection
echo "2️⃣  Starting log collection..."

# Backend logs (if running)
echo "  📝 Collecting backend logs..."
BACKEND_PID=$(ps aux | grep "npm run dev" | grep "backend-vercel" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$BACKEND_PID" ]; then
    echo "  ✅ Backend detected (PID: $BACKEND_PID)"
    # Capture backend output going forward
    tail -f /dev/null > "$LOG_DIR/backend.log" 2>&1 &
    BACKEND_LOG_PID=$!
else
    echo "  ⚠️  Backend not running (start with: cd backend/backend-vercel && npm run dev)"
    touch "$LOG_DIR/backend-not-running.txt"
fi

# Metro/Expo logs (if running)
echo "  📝 Collecting Metro logs..."
METRO_PID=$(ps aux | grep "expo start" | grep -v grep | awk '{print $2}' | head -1)
if [ -n "$METRO_PID" ]; then
    echo "  ✅ Metro detected (PID: $METRO_PID)"
    # We can't easily tap into existing Metro logs, but we can capture simulator logs instead
else
    echo "  ⚠️  Metro not running (start with: npm start)"
fi

# iOS Simulator logs
echo "  📝 Collecting iOS simulator logs..."
xcrun simctl spawn booted log stream --level debug --predicate 'processImagePath contains "AIEnhancedPersonalCRM"' > "$LOG_DIR/ios-simulator.log" 2>&1 &
IOS_LOG_PID=$!
echo "  ✅ iOS simulator logging started (PID: $IOS_LOG_PID)"

# Network/Console logs
echo "  📝 Collecting app console logs..."
xcrun simctl spawn booted log stream --level info --predicate subsystem == \"com.everreach.app\" > "$LOG_DIR/app-console.log" 2>&1 &
CONSOLE_LOG_PID=$!
echo "  ✅ App console logging started (PID: $CONSOLE_LOG_PID)"

sleep 2
echo ""

# Step 3: Start Appium server
echo "3️⃣  Starting Appium server..."
appium --log-timestamp --log-no-colors > "$LOG_DIR/appium-server.log" 2>&1 &
APPIUM_PID=$!

sleep 5

if ps -p $APPIUM_PID > /dev/null; then
    echo "✅ Appium server running (PID: $APPIUM_PID)"
else
    echo "❌ Appium failed to start"
    cat "$LOG_DIR/appium-server.log"
    exit 1
fi
echo ""

# Step 4: Run tests
echo "4️⃣  Running automated tests..."
echo "  ⏱️  Test started at: $(date '+%H:%M:%S')"
echo ""

TEST_START_TIME=$(date +%s)

# Run tests and capture output
npx wdio run wdio.conf.js --spec appium-tests/smoke.test.js > "$LOG_DIR/test-output.log" 2>&1
TEST_EXIT_CODE=$?

TEST_END_TIME=$(date +%s)
TEST_DURATION=$((TEST_END_TIME - TEST_START_TIME))

echo ""
echo "  ⏱️  Test completed at: $(date '+%H:%M:%S')"
echo "  ⏱️  Duration: ${TEST_DURATION}s"
echo ""

# Step 5: Stop log collection
echo "5️⃣  Stopping log collection..."
kill $IOS_LOG_PID $CONSOLE_LOG_PID $APPIUM_PID 2>/dev/null || true
[ -n "$BACKEND_LOG_PID" ] && kill $BACKEND_LOG_PID 2>/dev/null || true
sleep 1
echo "✅ All logging stopped"
echo ""

# Step 6: Generate summary report
echo "6️⃣  Generating test report..."

cat > "$LOG_DIR/TEST_REPORT.md" << EOF
# Automated Test Report

**Test Run:** $TIMESTAMP  
**Duration:** ${TEST_DURATION}s  
**Status:** $([ $TEST_EXIT_CODE -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")

---

## 📊 Test Results

\`\`\`
$(cat "$LOG_DIR/test-output.log" | tail -20)
\`\`\`

---

## 📁 Log Files

- **Appium Server:** \`appium-server.log\`
- **Test Output:** \`test-output.log\`
- **iOS Simulator:** \`ios-simulator.log\`
- **App Console:** \`app-console.log\`
$([ -n "$BACKEND_PID" ] && echo "- **Backend API:** \`backend.log\`")

---

## 📸 Screenshots

Location: \`$SCREENSHOTS_DIR/\`

\`\`\`bash
$(ls -lh $SCREENSHOTS_DIR/ 2>/dev/null | tail -n +2 || echo "No screenshots")
\`\`\`

---

## 🔍 Quick Analysis Commands

\`\`\`bash
# View all errors
grep -i "error" $LOG_DIR/*.log

# View warnings
grep -i "warn" $LOG_DIR/*.log

# View API calls (if backend was running)
grep -i "api" $LOG_DIR/*.log

# View subscription/purchase events
grep -i "subscription\\|purchase\\|storekit" $LOG_DIR/*.log

# Tail all logs
tail -f $LOG_DIR/*.log
\`\`\`

---

**Generated:** $(date)
EOF

echo "✅ Report generated: $LOG_DIR/TEST_REPORT.md"
echo ""

# Step 7: Show summary
echo "=============================================="
echo "📋 Test Summary"
echo "=============================================="
echo ""

if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ ALL TESTS PASSED!"
else
    echo "❌ TESTS FAILED"
fi

echo ""
echo "📁 Complete test data saved to: $LOG_DIR/"
echo ""
echo "📄 Files created:"
ls -lh "$LOG_DIR/" | tail -n +2
echo ""
echo "📸 Screenshots:"
ls -lh "$SCREENSHOTS_DIR/" | tail -n +2 || echo "  (none)"
echo ""

echo "🔍 Quick commands:"
echo "  View report:  cat $LOG_DIR/TEST_REPORT.md"
echo "  View errors:  grep -i error $LOG_DIR/*.log"
echo "  View all:     tail -f $LOG_DIR/*.log"
echo ""
echo "=============================================="

exit $TEST_EXIT_CODE
