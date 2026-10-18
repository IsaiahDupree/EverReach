#!/bin/bash

###############################################################################
# Interactive Manual Test Script
# 
# This script guides you through manual testing step-by-step.
# You perform each action in the app, then press ENTER to continue.
###############################################################################

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Test credentials (from .env.test or provided)
TEST_EMAIL="${TEST_EMAIL:-lcreator34@gmail.com}"
TEST_PASSWORD="${TEST_PASSWORD:-[Your Password]}"

# Clear screen and show header
clear
echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}║           ${BOLD}INTERACTIVE SUBSCRIPTION TEST SCRIPT${NC}${CYAN}            ║${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "${YELLOW}This script guides you through testing the subscription flow.${NC}"
echo "${YELLOW}You perform actions in the app, then press ENTER to continue.${NC}"
echo ""
echo "${CYAN}📸 Automatic screenshots will be captured after each step!${NC}"
echo "${CYAN}📝 Automatic logs will be captured from backend & mobile app!${NC}"
echo ""

# Function to take screenshot
take_screenshot() {
    local step_num=$1
    local step_name=$2
    local screenshot_file="$SCREENSHOT_DIR/step-${step_num}-${step_name// /-}.png"
    
    echo ""
    echo "${CYAN}📸 Taking screenshot...${NC}"
    
    # Try to find simulator window and take screenshot
    if screencapture -l$(osascript -e 'tell app "Simulator" to id of window 1') "$screenshot_file" 2>/dev/null; then
        echo "${GREEN}✓ Screenshot saved: $(basename "$screenshot_file")${NC}"
        SCREENSHOTS+=("$screenshot_file")
    else
        # Fallback: capture entire screen
        screencapture -x "$screenshot_file" 2>/dev/null
        if [ -f "$screenshot_file" ]; then
            echo "${YELLOW}⚠ Screenshot saved (full screen): $(basename "$screenshot_file")${NC}"
            SCREENSHOTS+=("$screenshot_file")
        else
            echo "${YELLOW}⚠ Could not take screenshot (simulator may not be visible)${NC}"
        fi
    fi
    
    sleep 0.5
}

# Function to wait for user
wait_for_user() {
    local message="${1:-Press ENTER when ready to continue}"
    echo ""
    echo "${CYAN}➜ ${message}${NC}"
    read -r
}

# Function to show step header
show_step() {
    local step_num=$1
    local step_name=$2
    echo ""
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo "${GREEN}${BOLD}STEP ${step_num}: ${step_name}${NC}"
    echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
}

# Function to show action item
show_action() {
    local action=$1
    echo "${CYAN}  ▸ ${action}${NC}"
}

# Function to show verification
show_verify() {
    local item=$1
    echo "  ${YELLOW}✓ Verify:${NC} ${item}"
}

# Function to prompt yes/no
prompt_result() {
    local question=$1
    echo ""
    echo "${YELLOW}${question}${NC}"
    echo "  ${GREEN}[y]${NC} Yes - Passed"
    echo "  ${RED}[n]${NC} No - Failed"
    echo "  ${CYAN}[s]${NC} Skip"
    read -p "Your answer: " -r answer
    case $answer in
        y|Y) return 0 ;;
        n|N) return 1 ;;
        s|S) return 2 ;;
        *) prompt_result "$question" ;;
    esac
}

# Test results tracking
PASSED=0
FAILED=0
SKIPPED=0

# Arrays to track individual test results
declare -a PASSED_TESTS=()
declare -a FAILED_TESTS=()
declare -a SKIPPED_TESTS=()

# Screenshot tracking
TEST_RUN_ID="$(date +%Y%m%d-%H%M%S)"
SCREENSHOT_DIR="test-screenshots-$TEST_RUN_ID"
mkdir -p "$SCREENSHOT_DIR"
declare -a SCREENSHOTS=()

# Log tracking
LOG_DIR="test-logs-$TEST_RUN_ID"
mkdir -p "$LOG_DIR"
BACKEND_LOG_FILE="$LOG_DIR/backend.log"
MOBILE_LOG_FILE="$LOG_DIR/mobile.log"
COMBINED_LOG_FILE="$LOG_DIR/combined.log"

# Start log capture
echo "=== Test started at $(date) ===" > "$BACKEND_LOG_FILE"
echo "=== Test started at $(date) ===" > "$MOBILE_LOG_FILE"
echo "=== Test started at $(date) ===" > "$COMBINED_LOG_FILE"

# Function to capture logs at a specific moment
capture_logs() {
    local step_num=$1
    local step_name=$2
    local timestamp=$(date '+%H:%M:%S')
    
    # Add marker to all log files
    echo "" >> "$BACKEND_LOG_FILE"
    echo "========================================" >> "$BACKEND_LOG_FILE"
    echo "STEP $step_num: $step_name [$timestamp]" >> "$BACKEND_LOG_FILE"
    echo "========================================" >> "$BACKEND_LOG_FILE"
    
    echo "" >> "$MOBILE_LOG_FILE"
    echo "========================================" >> "$MOBILE_LOG_FILE"
    echo "STEP $step_num: $step_name [$timestamp]" >> "$MOBILE_LOG_FILE"
    echo "========================================" >> "$MOBILE_LOG_FILE"
    
    echo "" >> "$COMBINED_LOG_FILE"
    echo "========================================" >> "$COMBINED_LOG_FILE"
    echo "STEP $step_num: $step_name [$timestamp]" >> "$COMBINED_LOG_FILE"
    echo "========================================" >> "$COMBINED_LOG_FILE"
    
    # Capture recent backend logs (from backend directory)
    if [ -d "../backend/backend-vercel" ]; then
        # Try to get logs from backend process
        # Look for node processes running in backend directory
        backend_pids=$(ps aux | grep -E "node.*backend-vercel|npm.*dev.*backend" | grep -v grep | awk '{print $2}')
        
        if [ -n "$backend_pids" ]; then
            echo "  [Capturing backend logs from running process]" >> "$BACKEND_LOG_FILE"
            # Get recent log entries from system log related to these PIDs
            for pid in $backend_pids; do
                log show --predicate "process == $pid" --last 30s --style compact 2>/dev/null >> "$BACKEND_LOG_FILE" || true
            done
        fi
    fi
    
    # Capture recent mobile/Metro logs
    metro_pids=$(ps aux | grep -E "expo start|metro|react-native" | grep -v grep | awk '{print $2}')
    
    if [ -n "$metro_pids" ]; then
        echo "  [Capturing mobile logs from Metro]" >> "$MOBILE_LOG_FILE"
        for pid in $metro_pids; do
            log show --predicate "process == $pid" --last 30s --style compact 2>/dev/null >> "$MOBILE_LOG_FILE" || true
        done
    fi
    
    # Also capture console output if available
    # Look for any .log files in the project
    if [ -f ".expo/metro.log" ]; then
        tail -n 50 .expo/metro.log >> "$MOBILE_LOG_FILE" 2>/dev/null || true
    fi
    
    # Combine logs with timestamps
    echo "[$timestamp] BACKEND:" >> "$COMBINED_LOG_FILE"
    tail -n 20 "$BACKEND_LOG_FILE" >> "$COMBINED_LOG_FILE" 2>/dev/null || true
    echo "" >> "$COMBINED_LOG_FILE"
    echo "[$timestamp] MOBILE:" >> "$COMBINED_LOG_FILE"
    tail -n 20 "$MOBILE_LOG_FILE" >> "$COMBINED_LOG_FILE" 2>/dev/null || true
    echo "" >> "$COMBINED_LOG_FILE"
}

# Function to record result
record_result() {
    local test_name=$1
    local step_num=$2
    
    # Capture logs and take screenshot before asking for result
    if [ -n "$step_num" ]; then
        capture_logs "$step_num" "$test_name"
        take_screenshot "$step_num" "$test_name"
    fi
    
    prompt_result "Did this test pass?"
    result=$?
    if [ $result -eq 0 ]; then
        echo "${GREEN}✓ PASSED${NC}: $test_name"
        ((PASSED++))
        PASSED_TESTS+=("$test_name")
    elif [ $result -eq 1 ]; then
        echo "${RED}✗ FAILED${NC}: $test_name"
        ((FAILED++))
        FAILED_TESTS+=("$test_name")
        
        # Ask for failure reason
        echo ""
        echo "${YELLOW}Why did this test fail? (optional, press ENTER to skip)${NC}"
        read -r failure_reason
        if [ -n "$failure_reason" ]; then
            FAILED_TESTS+=("  Reason: $failure_reason")
        fi
    else
        echo "${YELLOW}⊘ SKIPPED${NC}: $test_name"
        ((SKIPPED++))
        SKIPPED_TESTS+=("$test_name")
    fi
}

###############################################################################
# PRE-FLIGHT CHECKS
###############################################################################

show_step "0" "Pre-Flight Checks"

echo "${YELLOW}Checking if backend is running...${NC}"
if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "${GREEN}✓ Backend is running${NC}"
else
    echo "${RED}✗ Backend is NOT running${NC}"
    echo ""
    echo "Please start the backend:"
    echo "  ${CYAN}cd ../backend/backend-vercel && npm run dev${NC}"
    echo ""
    wait_for_user "Press ENTER once backend is started"
fi

echo ""
echo "${YELLOW}Checking if app is running...${NC}"
if pgrep -f "expo start" > /dev/null || pgrep -f "metro" > /dev/null; then
    echo "${GREEN}✓ App appears to be running${NC}"
else
    echo "${YELLOW}⚠ App may not be running${NC}"
    echo ""
    echo "If app is not running, start it:"
    echo "  ${CYAN}npm start${NC}"
    echo ""
    wait_for_user "Press ENTER when app is running in simulator"
fi

echo ""
echo "${GREEN}✓ Pre-flight checks complete!${NC}"
wait_for_user

###############################################################################
# TEST 1: SIGN IN
###############################################################################

show_step "1" "Sign In"

echo "Test credentials:"
echo "  Email: ${CYAN}${TEST_EMAIL}${NC}"
echo "  Password: ${CYAN}${TEST_PASSWORD}${NC}"
echo ""

show_action "Open the app on your simulator"
show_action "If already signed in, sign out first"
show_action "Tap 'Sign In'"
show_action "Enter email: ${TEST_EMAIL}"
show_action "Enter password: (your password)"
show_action "Tap 'Sign In'"
echo ""

show_verify "Sign in succeeds"
show_verify "App navigates to main screen"
show_verify "Console shows: [Auth] ✅ Entitlements refreshed automatically"

record_result "Sign In" "1"

###############################################################################
# TEST 2: CHECK CURRENT STATUS
###############################################################################

show_step "2" "Check Current Subscription Status"

show_action "Go to Settings"
show_action "Scroll to 'Account & Subscription' section"
show_action "Look at subscription status"
echo ""

show_verify "Shows current tier (Free Trial / Pro / etc)"
show_verify "Shows trial days remaining (if trial)"
show_verify "Shows payment method (if subscribed)"

wait_for_user "Press ENTER after checking status"

current_status=""
echo ""
echo "What is the current status?"
echo "  ${CYAN}[1]${NC} Free Trial"
echo "  ${CYAN}[2]${NC} Pro (active)"
echo "  ${CYAN}[3]${NC} Expired"
echo "  ${CYAN}[4]${NC} Other"
read -p "Your answer: " -r status_answer

case $status_answer in
    1) current_status="free_trial" ;;
    2) current_status="pro_active" ;;
    3) current_status="expired" ;;
    *) current_status="unknown" ;;
esac

record_result "Check Current Status" "2"

###############################################################################
# TEST 3: PURCHASE SUBSCRIPTION
###############################################################################

show_step "3" "Purchase Subscription (StoreKit)"

echo "${YELLOW}NOTE: This uses StoreKit test purchases (no real money)${NC}"
echo ""

show_action "Go to Subscription Plans (from Settings or onboarding)"
show_action "Tap on 'Core Monthly' plan"
show_action "Complete the StoreKit purchase dialog"
show_action "Wait for 'Subscription Activated!' alert"
echo ""

show_verify "Purchase completes successfully"
show_verify "Alert shows: 'Subscription Activated!'"
show_verify "Console shows: [SubscriptionPlans] Purchase succeeded"
show_verify "Console shows: 🧪 StoreKit test detected - auto-syncing backend..."
show_verify "Console shows: ✅ Backend synced successfully"

record_result "Purchase Subscription" "3"

###############################################################################
# TEST 4: VERIFY AUTO-SYNC
###############################################################################

show_step "4" "Verify Auto-Sync (NEW FEATURE!)"

echo "${YELLOW}This tests the NEW auto-sync feature after StoreKit purchases${NC}"
echo ""

show_action "Wait 3-5 seconds after purchase alert"
show_action "Go back to Settings"
show_action "Check subscription status"
echo ""

show_verify "Status shows: 'Pro (active)' ✅"
show_verify "NOT 'Free Trial' or 'Trial Expired'"
show_verify "Payment method shows: 'Apple'"
show_verify "Shows renewal date"

record_result "Auto-Sync After Purchase" "4"

###############################################################################
# TEST 5: VERIFY FEATURES UNLOCKED
###############################################################################

show_step "5" "Verify Premium Features Unlocked"

show_action "Try to use CRM Assistant"
show_action "Try to compose a message"
show_action "Check for any paywalls"
echo ""

show_verify "NO paywall appears"
show_verify "All features are accessible"
show_verify "No usage limits shown"

record_result "Premium Features Unlocked" "5"

###############################################################################
# TEST 6: MANUAL SYNC (if auto-sync failed)
###############################################################################

show_step "6" "Manual Sync (Fallback Test)"

echo "${YELLOW}This tests the manual sync button as a fallback${NC}"
echo ""

show_action "Go to Settings"
show_action "Scroll down to 'Payments (Dev)' section"
show_action "Tap 'Backend Recompute Entitlements'"
show_action "Wait for success alert"
echo ""

show_verify "Alert shows: 'Success'"
show_verify "Status updates to 'Pro (active)'"

record_result "Manual Backend Sync" "6"

###############################################################################
# TEST 7: RESTORE PURCHASES
###############################################################################

show_step "7" "Restore Purchases"

show_action "Go to Subscription Plans"
show_action "Scroll to bottom"
show_action "Tap 'Restore Purchases'"
show_action "Wait for result"
echo ""

show_verify "Shows 'Success' message"
show_verify "Subscription status remains 'Pro (active)'"

record_result "Restore Purchases" "7"

###############################################################################
# TEST 8: CANCEL SUBSCRIPTION (Optional)
###############################################################################

show_step "8" "Cancel Subscription (Optional)"

echo "${YELLOW}WARNING: This will cancel your test subscription${NC}"
echo ""
echo "Do you want to test cancellation?"
echo "  ${CYAN}[y]${NC} Yes - Test cancellation"
echo "  ${CYAN}[n]${NC} No - Skip this test"
read -p "Your answer: " -r cancel_answer

if [[ $cancel_answer =~ ^[Yy]$ ]]; then
    show_action "Go to iOS Settings app"
    show_action "Tap on your name at top"
    show_action "Tap 'Subscriptions'"
    show_action "Find 'EverReach Core'"
    show_action "Tap 'Cancel Subscription'"
    show_action "Confirm cancellation"
    show_action "Go back to EverReach app"
    show_action "Go to Settings → 'Backend Recompute Entitlements'"
    echo ""
    
    show_verify "Subscription shows: 'Expires on [date]'"
    show_verify "Not 'Renews on [date]'"
    show_verify "Still has access until period end"
    
    record_result "Cancel Subscription" "8"
else
    echo "${YELLOW}⊘ Skipped cancellation test${NC}"
    ((SKIPPED++))
fi

###############################################################################
# TEST 9: SIGN OUT / SIGN IN
###############################################################################

show_step "9" "Sign Out and Sign Back In"

show_action "Go to Settings"
show_action "Tap 'Sign Out'"
show_action "Sign back in with same credentials"
show_action "Wait for auto-refresh"
echo ""

show_verify "Sign in succeeds"
show_verify "Subscription status restored correctly"
show_verify "Console shows auto-refresh"

record_result "Sign Out / Sign In" "9"

###############################################################################
# TEST SUMMARY
###############################################################################

clear
echo ""
echo "${CYAN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}║                   ${BOLD}TEST SUMMARY${NC}${CYAN}                             ║${NC}"
echo "${CYAN}║                                                              ║${NC}"
echo "${CYAN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""

TOTAL=$((PASSED + FAILED + SKIPPED))

echo "Total Tests: ${BOLD}${TOTAL}${NC}"
echo ""
echo "${GREEN}✓ Passed:  ${PASSED}${NC}"
if [ $FAILED -gt 0 ]; then
    echo "${RED}✗ Failed:  ${FAILED}${NC}"
fi
if [ $SKIPPED -gt 0 ]; then
    echo "${YELLOW}⊘ Skipped: ${SKIPPED}${NC}"
fi

echo ""
echo "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Save results to file
RESULTS_FILE="test-results-$(date +%Y%m%d-%H%M%S).txt"
cat > "$RESULTS_FILE" << EOF
========================================
SUBSCRIPTION TEST RESULTS
========================================
Date: $(date)
Total Tests: $TOTAL
Passed: $PASSED
Failed: $FAILED
Skipped: $SKIPPED

Status: $([ $FAILED -eq 0 ] && echo "✓ ALL PASSED" || echo "✗ SOME FAILED")
========================================

DETAILED BREAKDOWN
========================================

EOF

# Add passed tests
if [ ${#PASSED_TESTS[@]} -gt 0 ]; then
    echo "PASSED TESTS ($PASSED):" >> "$RESULTS_FILE"
    for test in "${PASSED_TESTS[@]}"; do
        echo "  ✓ $test" >> "$RESULTS_FILE"
    done
    echo "" >> "$RESULTS_FILE"
fi

# Add failed tests
if [ ${#FAILED_TESTS[@]} -gt 0 ]; then
    echo "FAILED TESTS ($FAILED):" >> "$RESULTS_FILE"
    for test in "${FAILED_TESTS[@]}"; do
        echo "  ✗ $test" >> "$RESULTS_FILE"
    done
    echo "" >> "$RESULTS_FILE"
fi

# Add skipped tests
if [ ${#SKIPPED_TESTS[@]} -gt 0 ]; then
    echo "SKIPPED TESTS ($SKIPPED):" >> "$RESULTS_FILE"
    for test in "${SKIPPED_TESTS[@]}"; do
        echo "  ⊘ $test" >> "$RESULTS_FILE"
    done
    echo "" >> "$RESULTS_FILE"
fi

cat >> "$RESULTS_FILE" << EOF
========================================
SCREENSHOTS
========================================

EOF

if [ ${#SCREENSHOTS[@]} -gt 0 ]; then
    echo "Total screenshots: ${#SCREENSHOTS[@]}" >> "$RESULTS_FILE"
    echo "Location: $SCREENSHOT_DIR/" >> "$RESULTS_FILE"
    echo "" >> "$RESULTS_FILE"
    for screenshot in "${SCREENSHOTS[@]}"; do
        echo "  📸 $(basename "$screenshot")" >> "$RESULTS_FILE"
    done
else
    echo "No screenshots captured." >> "$RESULTS_FILE"
fi

cat >> "$RESULTS_FILE" << EOF

========================================
LOGS
========================================

Backend logs: $BACKEND_LOG_FILE
Mobile logs: $MOBILE_LOG_FILE
Combined logs: $COMBINED_LOG_FILE

Location: $LOG_DIR/

EOF

# Add note about which logs were captured
if [ -f "$BACKEND_LOG_FILE" ] && [ -s "$BACKEND_LOG_FILE" ]; then
    backend_lines=$(wc -l < "$BACKEND_LOG_FILE")
    echo "Backend log entries: $backend_lines lines" >> "$RESULTS_FILE"
fi

if [ -f "$MOBILE_LOG_FILE" ] && [ -s "$MOBILE_LOG_FILE" ]; then
    mobile_lines=$(wc -l < "$MOBILE_LOG_FILE")
    echo "Mobile log entries: $mobile_lines lines" >> "$RESULTS_FILE"
fi

cat >> "$RESULTS_FILE" << EOF

========================================
NOTES
========================================

Next run will be after fixes applied.
Check SUPERWALL_TIMEOUT_FIX.md for solutions.

Screenshots saved in: $SCREENSHOT_DIR/
Logs saved in: $LOG_DIR/

Review logs to see backend/mobile activity during each test step.

========================================
EOF

echo ""
echo "${CYAN}Results saved to: ${RESULTS_FILE}${NC}"
if [ ${#SCREENSHOTS[@]} -gt 0 ]; then
    echo "${CYAN}Screenshots saved to: ${SCREENSHOT_DIR}/ (${#SCREENSHOTS[@]} total)${NC}"
fi
echo "${CYAN}Logs saved to: $LOG_DIR/${NC}"
echo "${CYAN}  - backend.log (backend API logs)${NC}"
echo "${CYAN}  - mobile.log (Metro/React Native logs)${NC}"
echo "${CYAN}  - combined.log (both, with timestamps)${NC}"
echo ""

# Export to dashboard
echo "${CYAN}📊 Exporting results to dashboard...${NC}"
node scripts/test-result-collector.js "$RESULTS_FILE" 2>/dev/null || {
    echo "${YELLOW}⚠ Could not export to dashboard (run 'npm run test:dashboard' to view)${NC}"
}
echo ""

if [ $FAILED -eq 0 ]; then
    echo ""
    echo "${GREEN}${BOLD}🎉 ALL TESTS PASSED! 🎉${NC}"
    echo ""
    echo "Subscription flow is working correctly!"
    exit 0
else
    echo ""
    echo "${RED}${BOLD}❌ SOME TESTS FAILED${NC}"
    echo ""
    echo "Please review failed tests and investigate issues."
    echo ""
    echo "${YELLOW}Common issues:${NC}"
    echo "  • Superwall timeout → Check Superwall dashboard configuration"
    echo "  • Purchase fails → Verify StoreKit config in Xcode"
    echo "  • Status not updating → Tap 'Backend Recompute Entitlements'"
    exit 1
fi
