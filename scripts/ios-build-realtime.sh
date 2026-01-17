#!/bin/bash
#
# iOS Build with Real-time Output
# Forces unbuffered output from Expo CLI
#

DEVICE_NAME="${1:-iPhone 16e}"
LOG_FILE="build-logs/ios-build-$(date +%Y%m%d-%H%M%S).log"

mkdir -p build-logs

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         iOS BUILD - REAL-TIME OUTPUT                         ║"
echo "║  Device: $DEVICE_NAME"
echo "║  Log: $LOG_FILE"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Use script command to force pseudo-tty which makes Expo output in real-time
# Also use unbuffer if available, or stdbuf as fallback
if command -v unbuffer &> /dev/null; then
    echo "[Using unbuffer for real-time output]"
    unbuffer npx expo run:ios --device "$DEVICE_NAME" 2>&1 | tee "$LOG_FILE"
elif command -v stdbuf &> /dev/null; then
    echo "[Using stdbuf for real-time output]"
    stdbuf -oL -eL npx expo run:ios --device "$DEVICE_NAME" 2>&1 | tee "$LOG_FILE"
else
    echo "[Using script command for real-time output]"
    # script -q runs without header/footer, forces pty allocation
    script -q /dev/null npx expo run:ios --device "$DEVICE_NAME" 2>&1 | tee "$LOG_FILE"
fi

EXIT_CODE=${PIPESTATUS[0]}

echo ""
echo "══════════════════════════════════════════════════════════════"
if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ BUILD SUCCEEDED"
else
    echo "❌ BUILD FAILED (exit code: $EXIT_CODE)"
fi
echo "Log saved to: $LOG_FILE"
echo "══════════════════════════════════════════════════════════════"

exit $EXIT_CODE
