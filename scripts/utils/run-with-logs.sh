#!/bin/bash

echo "🚀 Starting Metro Bundler with Full Logs..."
echo ""

# Kill any existing Metro processes
pkill -f "node.*cli.js start" 2>/dev/null || true
sleep 1

# Start Metro bundler in background with logs
echo "📦 Metro Bundler starting..."
npm start -- --reset-cache > /tmp/metro.log 2>&1 &
METRO_PID=$!

# Wait for Metro to be ready
echo "⏳ Waiting for Metro to start..."
sleep 5

# Show Metro logs
echo ""
echo "📊 Metro Bundler Logs:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
tail -20 /tmp/metro.log
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Now run the app
echo "📱 Building and launching iOS app..."
echo ""

npx expo run:ios 2>&1 | tee /tmp/app-logs.log | while IFS= read -r line; do
    # Colorize important log lines
    if echo "$line" | grep -iq "error"; then
        echo "❌ $line"
    elif echo "$line" | grep -iq "success\|completed\|ready"; then
        echo "✅ $line"
    elif echo "$line" | grep -iq "revenuecat"; then
        echo "💰 $line"
    elif echo "$line" | grep -iq "superwall"; then
        echo "🎯 $line"
    elif echo "$line" | grep -iq "product\|offering"; then
        echo "🛒 $line"
    elif echo "$line" | grep -iq "storekit"; then
        echo "🏪 $line"
    else
        echo "$line"
    fi
done

echo ""
echo "Metro bundler PID: $METRO_PID"
echo "To stop Metro: kill $METRO_PID"
