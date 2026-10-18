#!/bin/bash
# Set EAS environment variables for production builds

set -e

ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: .env file not found"
  exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Setting EAS Environment Variables for Production"
echo ""

# Critical variables that must be set
VARS=(
  "EXPO_PUBLIC_SUPABASE_URL"
  "EXPO_PUBLIC_SUPABASE_KEY"
  "EXPO_PUBLIC_API_BASE_URL"
  "EXPO_PUBLIC_API_URL"
  "EXPO_PUBLIC_BACKEND_URL"
  "EXPO_PUBLIC_REVENUECAT_IOS_KEY"
  "EXPO_PUBLIC_SUPERWALL_IOS_KEY"
)

for var in "${VARS[@]}"; do
  value=$(grep "^${var}=" "$ENV_FILE" | cut -d'=' -f2- | sed 's/^"//;s/"$//' | tr -d '\n')
  
  if [ -z "$value" ]; then
    echo "⚠️  $var not found in .env, skipping..."
    continue
  fi
  
  echo "Setting $var..."
  
  # Try to create with plain text visibility (for EXPO_PUBLIC_ variables)
  eas env:create \
    --name "$var" \
    --value "$value" \
    --environment production \
    --scope project \
    --visibility plain \
    --non-interactive 2>&1 | grep -E "(created|already exists|Error)" | head -1 || echo "  ✓ Set"
done

echo ""
echo "✅ Environment variables configured!"
echo ""
echo "To verify: eas env:list --environment production"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
