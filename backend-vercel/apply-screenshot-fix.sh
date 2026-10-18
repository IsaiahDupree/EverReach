#!/bin/bash

###############################################################################
# Apply Screenshot Analysis Schema Fix
# 
# This script applies the fix_screenshot_analysis.sql migration to Supabase
###############################################################################

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${YELLOW}🔧 Applying Screenshot Analysis Schema Fix${NC}"
echo ""

# Load environment variables
if [ -f .env.local ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

# Check for required env vars
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    echo "   SUPABASE_URL"
    echo "   SUPABASE_SERVICE_ROLE_KEY"
    echo ""
    echo "Please set these in .env.local"
    exit 1
fi

echo -e "${GREEN}✅ Environment loaded${NC}"
echo "   Supabase URL: $SUPABASE_URL"
echo ""

# Read the migration file
MIGRATION_SQL=$(cat migrations/fix_screenshot_analysis.sql)

echo -e "${YELLOW}▶  Applying migration...${NC}"
echo ""

# Apply migration using Supabase REST API
RESPONSE=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d "{\"query\": $(echo "$MIGRATION_SQL" | jq -Rs .)}")

# Check if successful
if echo "$RESPONSE" | grep -q "error"; then
    echo -e "${RED}❌ Migration failed:${NC}"
    echo "$RESPONSE" | jq .
    echo ""
    echo -e "${YELLOW}💡 Alternative: Apply manually in Supabase Dashboard${NC}"
    echo "   1. Go to https://supabase.com/dashboard"
    echo "   2. Select your project"
    echo "   3. Go to SQL Editor"
    echo "   4. Copy and paste the contents of:"
    echo "      migrations/fix_screenshot_analysis.sql"
    echo "   5. Click 'Run'"
    exit 1
fi

echo -e "${GREEN}✅ Migration applied successfully!${NC}"
echo ""

# Verify the changes
echo -e "${YELLOW}▶  Verifying changes...${NC}"
echo ""

# Check if functions exist
echo "Checking functions..."
FUNCTIONS=$(curl -s -X POST \
    "${SUPABASE_URL}/rest/v1/rpc/exec_sql" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: application/json" \
    -d '{"query": "SELECT proname FROM pg_proc WHERE proname IN ('"'"'can_use_screenshot_analysis'"'"', '"'"'increment_screenshot_usage'"'"')"}')

if echo "$FUNCTIONS" | grep -q "can_use_screenshot_analysis"; then
    echo -e "${GREEN}  ✅ can_use_screenshot_analysis function exists${NC}"
else
    echo -e "${RED}  ❌ can_use_screenshot_analysis function missing${NC}"
fi

if echo "$FUNCTIONS" | grep -q "increment_screenshot_usage"; then
    echo -e "${GREEN}  ✅ increment_screenshot_usage function exists${NC}"
else
    echo -e "${RED}  ❌ increment_screenshot_usage function missing${NC}"
fi

echo ""
echo -e "${GREEN}✅ Schema fix complete!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "  1. Restart your backend server"
echo "  2. Test screenshot analysis"
echo "  3. Check for errors in logs"
echo ""
