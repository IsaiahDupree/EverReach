#!/bin/bash
# Auto-start Metro bundler for Xcode builds
# This script is called as a pre-action in the Xcode scheme

export PATH="$PATH:/opt/homebrew/bin:/usr/local/bin"
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

PROJECT_ROOT="$SRCROOT/.."
METRO_PORT=8081

# Check if Metro is already running
if lsof -i :$METRO_PORT > /dev/null 2>&1; then
    echo "✅ Metro already running on port $METRO_PORT"
    exit 0
fi

echo "🚀 Starting Metro bundler..."

# Start Metro in the background
cd "$PROJECT_ROOT"
osascript -e "tell application \"Terminal\" to do script \"cd '$PROJECT_ROOT' && npx expo start --dev-client --port $METRO_PORT\""

# Wait for Metro to start
for i in {1..30}; do
    if lsof -i :$METRO_PORT > /dev/null 2>&1; then
        echo "✅ Metro started successfully on port $METRO_PORT"
        exit 0
    fi
    sleep 1
done

echo "⚠️ Metro may still be starting..."
exit 0
