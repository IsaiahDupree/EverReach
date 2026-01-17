#!/bin/bash
# Production Preparation Script
# Safely prepares the app for production deployment

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd "$PROJECT_ROOT"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🚀 Production Preparation Script"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Verify backend is deployed
echo "📋 Step 1: Verifying Backend Deployment"
echo ""
echo "Checking if backend branch (feat/event-tracking-hotfix) is up to date..."
if git branch -r | grep -q "origin/feat/event-tracking-hotfix"; then
  echo "  ✅ Backend branch exists on remote"
  echo "  ℹ️  Vercel should auto-deploy on push"
else
  echo "  ⚠️  Backend branch not found on remote"
fi
echo ""

# Step 2: Configure production .env
echo "📋 Step 2: Production Environment Configuration"
echo ""
if [ -f ".env.production" ]; then
  echo "  ✅ .env.production exists"
  echo "  To use for build: cp .env.production .env"
else
  echo "  ⚠️  .env.production not found"
fi
echo ""

# Step 3: Verify EAS config
echo "📋 Step 3: EAS Build Configuration"
echo ""
if [ -f "eas.json" ]; then
  echo "  ✅ eas.json exists"
  echo "  Profiles:"
  grep -A 5 '"build":' eas.json | grep -E '"(development|preview|production)"' || echo "    (check eas.json)"
else
  echo "  ❌ eas.json not found"
fi
echo ""

# Step 4: Screenshot script
echo "📋 Step 4: Screenshot Capture"
echo ""
if [ -f "scripts/capture-ipad-screenshots.sh" ]; then
  echo "  ✅ iPad screenshot script exists"
  echo "  Run: ./scripts/capture-ipad-screenshots.sh"
else
  echo "  ⚠️  Screenshot script not found"
fi
echo ""

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Preparation checklist complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

