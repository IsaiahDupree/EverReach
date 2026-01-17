#!/bin/bash
# EverReach - Xcode Development Launcher
# Starts Metro, Backend, and opens Xcode

set -e

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_ROOT="$PROJECT_ROOT/backend-vercel"
METRO_PORT=8081
BACKEND_PORT=3000

echo "🚀 EverReach Xcode Development Setup"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Kill any existing processes
echo "🧹 Cleaning up existing processes..."
pkill -f "expo start" 2>/dev/null || true
pkill -f "next dev" 2>/dev/null || true
lsof -ti:$METRO_PORT | xargs kill -9 2>/dev/null || true
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null || true
sleep 1

# Start Backend
echo "📦 Starting Backend on port $BACKEND_PORT..."
osascript -e "tell application \"Terminal\" to do script \"cd '$BACKEND_ROOT' && npm run dev\""
sleep 2

# Start Metro
echo "⚡ Starting Metro bundler on port $METRO_PORT..."
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT' && npx expo start --dev-client --port $METRO_PORT\""

# Wait for Metro to be ready
echo "⏳ Waiting for Metro to start..."
for i in {1..30}; do
    if curl -s http://localhost:$METRO_PORT > /dev/null 2>&1; then
        echo "✅ Metro is ready!"
        break
    fi
    sleep 1
done

# Open Xcode
echo "🔨 Opening Xcode..."
open "$PROJECT_ROOT/ios/AIEnhancedPersonalCRM.xcworkspace"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Ready! Press ⌘R in Xcode to build and run"
echo ""
echo "Services running:"
echo "  • Metro:   http://localhost:$METRO_PORT"
echo "  • Backend: http://localhost:$BACKEND_PORT"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
