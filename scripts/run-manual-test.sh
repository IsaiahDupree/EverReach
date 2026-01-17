#!/bin/bash

# 🧪 Manual Subscription Test Runner
# Tests subscription flow with existing user account (for manual testing only)

set -e

echo "🧪 Manual Subscription Flow Test"
echo "================================"
echo ""
echo "⚠️  SECURITY NOTE:"
echo "This script tests with a real user account."
echo "For automated CI/CD, use mocked tests instead."
echo ""

# Check if backend is running
echo "1️⃣  Checking backend..."
if ! curl -s http://localhost:3000/api/health > /dev/null; then
  echo "❌ Backend not running!"
  echo "Start with: cd backend/backend-vercel && npm run dev"
  exit 1
fi
echo "✅ Backend healthy"
echo ""

# Warm up backend
echo "2️⃣  Warming up backend..."
cd "$(dirname "$0")/../.."
bash backend/backend-vercel/scripts/warmup-backend.sh > /dev/null 2>&1
echo "✅ Backend warmed up"
echo ""

# Launch app
echo "3️⃣  Launching app..."
cd mobileapp
npx expo start --clear > /tmp/expo.log 2>&1 &
EXPO_PID=$!

# Wait for Metro to start
echo "⏳ Waiting for Metro bundler..."
sleep 5

# Check if app is ready
if ps -p $EXPO_PID > /dev/null; then
  echo "✅ App launched (PID: $EXPO_PID)"
else
  echo "❌ App failed to launch"
  exit 1
fi
echo ""

# Instructions
echo "📋 Manual Test Checklist:"
echo "========================"
echo ""
echo "✅ Backend: Running"
echo "✅ App: Launched"
echo ""
echo "Now perform these manual tests:"
echo ""
echo "1. 🔐 Sign In"
echo "   - Email: (your test account)"
echo "   - Password: (your password)"
echo "   → Verify: Auth successful"
echo ""
echo "2. 📊 Check Subscription Status"
echo "   - Go to Settings"
echo "   - Tap 'View Plans'"
echo "   → Verify: Current status displayed correctly"
echo ""
echo "3. 💳 Test Purchase Flow"
echo "   - Select 'Core' plan"
echo "   - Complete purchase in iOS sandbox"
echo "   → Verify: 'Subscription Activated!' alert shows"
echo ""
echo "4. 🔄 Verify Sync"
echo "   - Go back to Settings"
echo "   - Check subscription status"
echo "   → Verify: Shows 'Pro (active)'"
echo ""
echo "5. 🔄 Test Refresh"
echo "   - Tap 'Refresh Entitlements'"
echo "   → Verify: Status updates correctly"
echo ""
echo "6. ❌ Test Cancellation"
echo "   - Tap 'Cancel Subscription'"
echo "   - Confirm in iOS settings"
echo "   → Verify: Shows 'Not renewing' or expiry date"
echo ""
echo "7. 🔍 Check Logs"
echo "   - Look for these in console:"
echo "     • '[Auth] Sign in successful, refreshing entitlements...'"
echo "     • '[SubscriptionProvider] ✅ Entitlements loaded'"
echo "     • '[SubscriptionPlans] Purchase succeeded'"
echo ""
echo "Press CTRL+C when done testing"
echo ""

# Keep script running
trap "kill $EXPO_PID 2>/dev/null; echo ''; echo '🛑 Tests stopped'; exit 0" INT TERM

tail -f /tmp/expo.log | grep -E "(Auth|Subscription|Purchase|Error)" &
TAIL_PID=$!

wait $EXPO_PID 2>/dev/null

kill $TAIL_PID 2>/dev/null
