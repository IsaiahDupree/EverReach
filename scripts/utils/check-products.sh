#!/bin/bash

# Check Products Loading Script
# Run this to verify RevenueCat products are loading

echo "🔍 Checking StoreKit Configuration..."
echo ""

# Check if StoreKit file exists
if [ -f "ios/Products.storekit" ]; then
    echo "✅ Products.storekit exists"
else
    echo "❌ Products.storekit NOT FOUND"
    exit 1
fi

# Check if StoreKit is in Xcode scheme
if grep -q "StoreKitConfigurationFileReference" ios/AIEnhancedPersonalCRM.xcodeproj/xcshareddata/xcschemes/AIEnhancedPersonalCRM.xcscheme; then
    echo "✅ StoreKit configured in Xcode scheme"
else
    echo "❌ StoreKit NOT in Xcode scheme"
    exit 1
fi

echo ""
echo "🚀 Building and running app..."
echo ""

# Build and run, filtering for important logs
npx expo run:ios 2>&1 | tee /tmp/expo-build.log | grep -E "(Store products|offerings|BUILD SUCCEEDED|BUILD FAILED|Product loaded|Error fetching)" &

# Wait a bit for build to start
sleep 5

echo ""
echo "📊 Monitoring for product loading (press Ctrl+C to stop)..."
echo ""

# Tail the log and highlight important lines
tail -f /tmp/expo-build.log | grep --line-buffered -E "(Store products|offerings|Product loaded|Error fetching|com.everreach.core)" | while read line; do
    if echo "$line" | grep -q "Error"; then
        echo "❌ $line"
    elif echo "$line" | grep -q "Product loaded\|Found products"; then
        echo "✅ $line"
    else
        echo "ℹ️  $line"
    fi
done
