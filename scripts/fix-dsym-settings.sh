#!/bin/bash

# Fix dSYM Settings for iOS Build
# This enables proper crash symbolication in production

set -e

echo "🔧 Fixing iOS dSYM Settings..."
echo ""

PROJECT_PATH="ios/AIEnhancedPersonalCRM.xcodeproj/project.pbxproj"

if [ ! -f "$PROJECT_PATH" ]; then
  echo "❌ Error: Could not find project file at $PROJECT_PATH"
  exit 1
fi

echo "📂 Found project file: $PROJECT_PATH"

# Backup original file
cp "$PROJECT_PATH" "$PROJECT_PATH.backup"
echo "✅ Created backup: $PROJECT_PATH.backup"

# Replace DEBUG_INFORMATION_FORMAT settings
# Change from "dwarf" to "dwarf-with-dsym" for Debug builds
sed -i '' 's/DEBUG_INFORMATION_FORMAT = dwarf;/DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";/g' "$PROJECT_PATH"

echo "✅ Updated DEBUG_INFORMATION_FORMAT settings"

# Verify changes
echo ""
echo "🔍 Verifying changes..."
if grep -q 'DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym"' "$PROJECT_PATH"; then
  echo "✅ dSYM settings updated successfully"
else
  echo "⚠️  Warning: Could not verify changes"
fi

echo ""
echo "✨ Done! dSYM files will now be generated for crash symbolication"
echo ""
echo "Next steps:"
echo "1. Clean build: cd ios && xcodebuild clean && cd .."
echo "2. Rebuild: npx expo run:ios"
echo "3. dSYM files will be generated in ios/build/Debug-iphonesimulator/"
