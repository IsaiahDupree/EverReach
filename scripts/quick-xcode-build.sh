#!/bin/bash

# Quick script to build and run in Xcode programmatically
# Usage: ./scripts/quick-xcode-build.sh [device]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

DEVICE="${1:-iPad Pro 13-inch (M4)}"

echo "🚀 Quick Xcode Build & Run"
echo "Device: $DEVICE"
echo ""

cd "$PROJECT_DIR"

# Run the full build script
"$SCRIPT_DIR/xcode-build.sh" "$DEVICE" "Debug" "build-and-run"

