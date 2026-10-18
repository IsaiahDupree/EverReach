#!/bin/bash
# Complete workflow: Screenshots + Save to GitHub
# Captures screenshots, then commits and pushes everything to e2e branch

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📸 Screenshots & Save to GitHub Workflow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Step 1: Verify we're on e2e branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "e2e" ]; then
  echo -e "${YELLOW}⚠️  Warning: Not on e2e branch (currently on: $CURRENT_BRANCH)${NC}"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# Step 2: Check backend and Metro
echo "🔍 Step 1: Verifying Services"
echo ""
if pgrep -f "next dev" > /dev/null; then
  echo -e "${GREEN}  ✅ Backend is running${NC}"
else
  echo -e "${YELLOW}  ⚠️  Backend is NOT running${NC}"
  echo "  Start with: cd backend-vercel && npm run dev"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

if pgrep -f "metro\|expo start" > /dev/null; then
  echo -e "${GREEN}  ✅ Metro is running${NC}"
else
  echo -e "${YELLOW}  ⚠️  Metro is NOT running${NC}"
  echo "  Start with: npx expo start"
  read -p "Continue anyway? (y/n) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo ""

# Step 3: Capture screenshots
echo "📸 Step 2: Capturing Screenshots"
echo ""
echo "This will run the iPad screenshot capture script."
echo "You'll need to manually navigate through the app screens."
echo ""
read -p "Ready to capture screenshots? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  if [ -f "scripts/capture-ipad-screenshots.sh" ]; then
    ./scripts/capture-ipad-screenshots.sh
    echo ""
    echo -e "${GREEN}✅ Screenshots captured!${NC}"
  else
    echo -e "${RED}❌ Screenshot script not found${NC}"
    exit 1
  fi
else
  echo "Skipping screenshots..."
fi

echo ""

# Step 4: Show what will be committed
echo "📋 Step 3: Reviewing Changes"
echo ""
echo "Files that will be committed:"
git status --short | head -20
echo ""
echo "Total changes:"
git status --short | wc -l | xargs echo "  "
echo ""

# Step 5: Commit everything
echo "💾 Step 4: Committing Changes"
echo ""
read -p "Commit all changes? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  # Add all changes
  git add -A
  
  # Create commit message
  COMMIT_MSG="WIP: Production prep - local backend config, screenshots, build status
  
- Configured app for local backend (localhost:3000)
- Captured iPad screenshots
- Production preparation work
- Build fixes and documentation
  
Branch: e2e
Date: $(date +"%Y-%m-%d %H:%M:%S")"
  
  git commit -m "$COMMIT_MSG"
  echo ""
  echo -e "${GREEN}✅ Changes committed!${NC}"
else
  echo "Skipping commit..."
  exit 0
fi

echo ""

# Step 6: Push to GitHub
echo "🚀 Step 5: Pushing to GitHub"
echo ""
read -p "Push to origin/e2e? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  git push origin e2e
  echo ""
  echo -e "${GREEN}✅ Pushed to GitHub!${NC}"
else
  echo "Skipping push..."
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Workflow Complete!"
echo ""
echo "Summary:"
echo "  • Screenshots: Captured"
echo "  • Changes: Committed to e2e branch"
echo "  • Remote: Pushed to GitHub"
echo ""
echo "Your build status is now saved! 🎉"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

