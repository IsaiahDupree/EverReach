#!/bin/bash

# Maestro Troubleshooting Script
# Helps diagnose Maestro connection issues

echo "🔍 Maestro Diagnostics"
echo "======================="
echo ""

# Check 1: Maestro installed
echo "1. Checking Maestro installation..."
if command -v maestro &> /dev/null; then
    echo "✓ Maestro installed: $(maestro --version 2>&1 | head -1)"
else
    echo "✗ Maestro not found!"
    echo "  Install: brew tap mobile-dev-inc/tap && brew install maestro"
    exit 1
fi
echo ""

# Check 2: Simulator running
echo "2. Checking simulator status..."
BOOTED=$(xcrun simctl list devices | grep "Booted" | head -1)
if [ -n "$BOOTED" ]; then
    echo "✓ Simulator booted:"
    echo "  $BOOTED"
else
    echo "✗ No booted simulator!"
    echo "  Start with: open -a Simulator"
    exit 1
fi
echo ""

# Check 3: App installed
echo "3. Checking app installation..."
APP_INSTALLED=$(xcrun simctl listapps booted | grep "com.everreach.app")
if [ -n "$APP_INSTALLED" ]; then
    echo "✓ App installed: com.everreach.app"
else
    echo "✗ App not installed!"
    echo "  Build and install: cd mobileapp && npx expo run:ios"
    exit 1
fi
echo ""

# Check 4: App running
echo "4. Checking if app is running..."
APP_RUNNING=$(xcrun simctl launch --console booted com.everreach.app 2>&1)
if [[ $APP_RUNNING == *"error"* ]]; then
    echo "⚠ App launch returned error (may already be running)"
else
    echo "✓ App launched successfully"
fi
echo ""

# Check 5: Maestro can see devices
echo "5. Checking Maestro device connection..."
echo "  Running: maestro test --dry-run maestro/test-connection.yaml"
timeout 10 maestro test --dry-run maestro/test-connection.yaml 2>&1 | head -20
echo ""

# Tips
echo "📋 Troubleshooting Tips:"
echo "  • If Maestro hangs, try: brew upgrade maestro"
echo "  • Restart Maestro Studio: maestro studio"
echo "  • Kill hanging processes: pkill -f maestro"
echo "  • Check logs: maestro test --debug maestro/test-connection.yaml"
echo ""

echo "🎯 Next Steps:"
echo "  1. Fix any ✗ issues above"
echo "  2. Try simple test: maestro test maestro/test-connection.yaml"
echo "  3. If successful, run: npm run test:nav:smoke"
echo ""
