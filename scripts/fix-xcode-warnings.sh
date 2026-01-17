#!/bin/bash

# Script to suppress nullability warnings in the main app target
# This fixes warnings from third-party pod headers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
IOS_DIR="$PROJECT_DIR/ios"
PROJECT_PATH="$IOS_DIR/AIEnhancedPersonalCRM.xcodeproj"

if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Xcode project not found at $PROJECT_PATH"
    exit 1
fi

echo "🔧 Fixing Xcode build warnings..."

# Use PlistBuddy or sed to modify the project.pbxproj file
# We'll add warning flags to the main app target's build settings

# Check if we have Python (more reliable than sed for this)
if command -v python3 &> /dev/null; then
    python3 << EOF
import re
import sys

project_file = "$PROJECT_PATH/project.pbxproj"

try:
    with open(project_file, 'r') as f:
        content = f.read()
    
    # Find the AIEnhancedPersonalCRM target build configuration section
    # We need to add WARNING_CFLAGS to suppress nullability warnings
    
    # Pattern to find buildSettings sections for the app target
    # Look for buildSettings that don't already have our warning flags
    
    # Add warning flags if not present
    warning_flags = [
        '-Wno-nullability-completeness',
        '-Wno-nullability-extension',
    ]
    
    # Check if flags are already present
    if '-Wno-nullability-completeness' in content:
        print("✅ Warning flags already present")
        sys.exit(0)
    
    # Find buildSettings blocks and add our flags
    # This is a simplified approach - we'll add to all Debug/Release configs
    pattern = r'(buildSettings = \{[^}]*)(CLANG_WARN_QUOTED_INCLUDE_IN_FRAMEWORK_HEADER[^;]*;)?'
    
    def add_warning_flags(match):
        settings = match.group(1)
        # Check if WARNING_CFLAGS already exists
        if 'WARNING_CFLAGS' not in settings:
            # Add WARNING_CFLAGS after the opening brace
            settings = settings.rstrip() + "\n\t\t\t\tWARNING_CFLAGS = (\n"
            for flag in warning_flags:
                settings += f"\t\t\t\t\t\"{flag}\",\n"
            settings += "\t\t\t\t);\n"
        return settings
    
    # More targeted: find sections that are likely the app target
    # Look for sections with PRODUCT_BUNDLE_IDENTIFIER = "com.everreach.app"
    if 'com.everreach.app' in content or 'app.rork.ai-enhanced-personal-crm' in content:
        # Add flags to buildSettings that contain the bundle identifier
        new_content = re.sub(
            r'(buildSettings = \{)([^}]*PRODUCT_BUNDLE_IDENTIFIER[^}]*)(\})',
            lambda m: m.group(1) + m.group(2) + 
            ('\n\t\t\t\tWARNING_CFLAGS = (\n' +
             '\n'.join([f'\t\t\t\t\t"{flag}",' for flag in warning_flags]) +
             '\n\t\t\t\t);\n' if 'WARNING_CFLAGS' not in m.group(2) else '') +
            m.group(3),
            content
        )
        
        if new_content != content:
            with open(project_file, 'w') as f:
                f.write(new_content)
            print("✅ Added warning flags to app target")
        else:
            print("⚠️  Could not find insertion point, flags may already be present")
    else:
        print("⚠️  Could not find app target in project file")
        sys.exit(1)

except Exception as e:
    print(f"❌ Error modifying project: {e}")
    sys.exit(1)
EOF
else
    echo "⚠️  Python3 not found, skipping automatic warning suppression"
    echo "   You can manually add these flags in Xcode:"
    echo "   -Wno-nullability-completeness"
    echo "   -Wno-nullability-extension"
fi

echo "✨ Done!"


