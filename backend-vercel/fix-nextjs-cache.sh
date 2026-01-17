#!/bin/bash

###############################################################################
# Fix Next.js Cache Corruption
# Fixes "SyntaxError: Unexpected end of JSON input" errors
###############################################################################

set -e

echo "🧹 Cleaning Next.js cache..."

# Stop the dev server if running
echo "Stopping any running dev servers..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true

# Remove Next.js cache
echo "Removing .next directory..."
rm -rf .next

# Remove node_modules/.cache
echo "Removing node_modules cache..."
rm -rf node_modules/.cache

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

echo "✅ Cache cleared!"
echo ""
echo "Now run: npm run dev"
