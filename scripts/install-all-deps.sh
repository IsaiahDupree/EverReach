#!/bin/bash
# Install All Dependencies - Scans codebase and installs missing packages

echo "🔍 Scanning codebase for imports..."

# Extract all npm package imports (not relative imports)
grep -rh "from ['\"]" app/ components/ providers/ hooks/ lib/ 2>/dev/null \
  | grep -oE "from ['\"][^./][^'\"]+['\"]" \
  | sed "s/from ['\"]//g" \
  | sed "s/['\"]//g" \
  | sort -u \
  | grep -v "^react$" \
  | grep -v "^react-native$" \
  > /tmp/all_imports.txt

echo "📦 Found $(wc -l < /tmp/all_imports.txt) unique imports"

# Check which ones are NOT in package.json
missing_deps=()
while read -r pkg; do
  if ! grep -q "\"$pkg\"" package.json; then
    missing_deps+=("$pkg")
    echo "❌ Missing: $pkg"
  fi
done < /tmp/all_imports.txt

if [ ${#missing_deps[@]} -eq 0 ]; then
  echo "✅ All dependencies are installed!"
  exit 0
fi

echo ""
echo "📥 Installing ${#missing_deps[@]} missing dependencies..."
npm install "${missing_deps[@]}"

echo ""
echo "✅ Done! Run 'npx expo start --clear' to reload"
