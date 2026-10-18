#!/bin/bash
# Backend Test Suite Runner
# This script starts the backend server and runs comprehensive tests

set -e

echo "🚀 Starting Backend Test Environment"
echo "===================================="

# Navigate to backend directory
cd "$(dirname "$0")/../../backend-vercel"

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "❌ Error: .env file not found in backend-vercel/"
  echo "Please create it from .env.example and configure properly"
  exit 1
fi

echo "✅ Environment file found"

# Start the backend server in the background
echo "📦 Starting Next.js backend server..."
npm run dev &
BACKEND_PID=$!

# Wait for server to be ready
echo "⏳ Waiting for server to start..."
sleep 5

# Check if server is running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
  echo "❌ Backend server failed to start"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo "✅ Backend server is running on http://localhost:3000"
echo ""

# Run the comprehensive tests
echo "🧪 Running Comprehensive Test Suite"
echo "===================================="
cd ../test/comprehensive
node run-with-env.mjs

TEST_EXIT_CODE=$?

# Cleanup: Stop the backend server
echo ""
echo "🛑 Stopping backend server..."
kill $BACKEND_PID 2>/dev/null || true

if [ $TEST_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
else
  echo "❌ Some tests failed"
fi

exit $TEST_EXIT_CODE
