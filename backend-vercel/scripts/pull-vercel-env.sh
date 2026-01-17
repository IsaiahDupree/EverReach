#!/bin/bash
# Pull environment variables from Vercel
# This script helps sync Vercel environment variables to local .env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend-vercel"

cd "$BACKEND_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔧 Pulling Environment Variables from Vercel"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if Vercel CLI is installed
if ! command -v vercel >/dev/null 2>&1; then
  echo "❌ Vercel CLI not installed"
  echo "Install with: npm install -g vercel"
  exit 1
fi

# Check if project is linked
if [ ! -f ".vercel/project.json" ]; then
  echo "⚠️  Project not linked to Vercel"
  echo "Linking project..."
  vercel link
fi

# Backup existing .env
if [ -f ".env" ]; then
  echo "📦 Backing up existing .env..."
  cp .env .env.backup-$(date +%Y%m%d-%H%M%S)
  echo "✅ Backup created"
fi

# Pull environment variables
echo ""
echo "📥 Pulling environment variables from Vercel..."
echo ""

# Pull for development environment
vercel env pull .env.local --environment=development --yes

# Merge with existing .env if it exists
if [ -f ".env" ] && [ -f ".env.local" ]; then
  echo ""
  echo "🔄 Merging with existing .env..."
  # Keep existing .env values, add new ones from .env.local
  cat .env.local >> .env
  # Remove duplicates (keep first occurrence)
  awk '!seen[$0]++' .env > .env.tmp && mv .env.tmp .env
  echo "✅ Merged"
fi

# Or just use .env.local if no .env exists
if [ ! -f ".env" ] && [ -f ".env.local" ]; then
  mv .env.local .env
  echo "✅ Created .env from Vercel"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Environment Variables Pulled"
echo ""
echo "Variables pulled from Vercel:"
grep -E "^[A-Z_]+=" .env 2>/dev/null | wc -l | xargs echo "  Total:"
echo ""
echo "⚠️  Restart backend to use new variables:"
echo "  npm run dev"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

