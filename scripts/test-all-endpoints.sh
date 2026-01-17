#!/bin/bash
# Endpoint Comparison Test Script
# Tests all endpoints against both local and production

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

LOCAL_URL="http://localhost:3000"
PROD_URL="https://ever-reach-be.vercel.app"

# Get auth token (pass as argument or set here)
AUTH_TOKEN="${1:-}"

echo "========================================"
echo "🧪 ENDPOINT COMPARISON TEST"
echo "========================================"
echo ""
echo "📍 Local:      $LOCAL_URL"
echo "📍 Production: $PROD_URL"
echo "🔐 Auth Token: ${AUTH_TOKEN:0:20}..."
echo ""

# Function to test endpoint
test_endpoint() {
    local name="$1"
    local path="$2"
    local method="$3"
    local needs_auth="$4"
    local body="$5"
    
    local headers="-H 'Content-Type: application/json'"
    
    if [ "$needs_auth" = "true" ] && [ -n "$AUTH_TOKEN" ]; then
        headers="$headers -H 'Authorization: Bearer $AUTH_TOKEN'"
    fi
    
    local curl_opts="-s -o /dev/null -w '%{http_code},%{time_total}'"
    
    if [ -n "$body" ]; then
        curl_opts="$curl_opts -d '$body'"
    fi
    
    # Test local
    local local_result=$(eval "curl $curl_opts -X $method $headers '$LOCAL_URL$path'" 2>/dev/null || echo "000,0")
    local local_status=$(echo $local_result | cut -d',' -f1)
    local local_time=$(echo $local_result | cut -d',' -f2)
    
    # Test production
    local prod_result=$(eval "curl $curl_opts -X $method $headers '$PROD_URL$path'" 2>/dev/null || echo "000,0")
    local prod_status=$(echo $prod_result | cut -d',' -f1)
    local prod_time=$(echo $prod_result | cut -d',' -f2)
    
    # Format output
    local local_icon="❌"
    local prod_icon="❌"
    
    if [ "$local_status" = "200" ] || [ "$local_status" = "201" ]; then
        local_icon="${GREEN}✅${NC}"
    elif [ "$local_status" != "000" ]; then
        local_icon="${YELLOW}⚠️${NC}"
    fi
    
    if [ "$prod_status" = "200" ] || [ "$prod_status" = "201" ]; then
        prod_icon="${GREEN}✅${NC}"
    elif [ "$prod_status" != "000" ]; then
        prod_icon="${YELLOW}⚠️${NC}"
    fi
    
    local match_icon="${RED}❌${NC}"
    if [ "$local_status" = "$prod_status" ]; then
        match_icon="${GREEN}✅${NC}"
    fi
    
    printf "%-25s %-6s | Local: %s %-4s %5ss | Prod: %s %-4s %5ss | Match: %b\n" \
        "$name" "$method" "$local_icon" "$local_status" "$local_time" "$prod_icon" "$prod_status" "$prod_time" "$match_icon"
}

echo "=========================================================================================================="
printf "%-25s %-6s | %-20s | %-20s | %s\n" "Endpoint" "Method" "Local" "Production" "Match"
echo "=========================================================================================================="

# No Auth Required
echo ""
echo -e "${BLUE}--- NO AUTH REQUIRED ---${NC}"
test_endpoint "health" "/api/health" "GET" "false"
test_endpoint "version" "/api/version" "GET" "false"
test_endpoint "paywall-strategy" "/api/v1/config/paywall-strategy" "GET" "false"
test_endpoint "warmth-modes" "/api/v1/warmth/modes" "GET" "false"

# Auth Required - GET
echo ""
echo -e "${BLUE}--- AUTH REQUIRED (GET) ---${NC}"
test_endpoint "me" "/api/v1/me" "GET" "true"
test_endpoint "entitlements" "/api/v1/me/entitlements" "GET" "true"
test_endpoint "compose-settings" "/api/v1/me/compose-settings" "GET" "true"
test_endpoint "onboarding-status" "/api/v1/me/onboarding-status" "GET" "true"
test_endpoint "persona-notes" "/api/v1/me/persona-notes" "GET" "true"
test_endpoint "contacts" "/api/v1/contacts" "GET" "true"
test_endpoint "contacts-import-health" "/api/v1/contacts/import/health" "GET" "true"
test_endpoint "contacts-import-list" "/api/v1/contacts/import/list" "GET" "true"
test_endpoint "pipelines" "/api/v1/pipelines" "GET" "true"
test_endpoint "templates" "/api/v1/templates" "GET" "true"
test_endpoint "interactions" "/api/v1/interactions" "GET" "true"
test_endpoint "goals" "/api/v1/goals" "GET" "true"
test_endpoint "paywall-live" "/api/v1/config/paywall-live" "GET" "true"

# Auth Required - POST
echo ""
echo -e "${BLUE}--- AUTH REQUIRED (POST) ---${NC}"
test_endpoint "billing-restore" "/api/v1/billing/restore" "POST" "true" '{}'
test_endpoint "files" "/api/v1/files" "POST" "true" '{"path":"test.txt","contentType":"text/plain"}'
test_endpoint "search" "/api/v1/search" "POST" "true" '{"query":"test"}'
test_endpoint "events-track" "/api/v1/events/track" "POST" "true" '{"event_type":"test","metadata":{}}'
test_endpoint "feature-requests" "/api/v1/feature-requests" "POST" "true" '{"type":"feature","title":"Test","description":"Test"}'
test_endpoint "agent-chat" "/api/v1/agent/chat" "POST" "true" '{"message":"ping"}'

echo ""
echo "=========================================================================================================="
echo "✅ Test complete!"
echo ""
echo "Legend:"
echo "  ✅ 2xx - Success"
echo "  ⚠️  4xx - Reachable but error (auth/validation)"
echo "  ❌ 000 - Network error / unreachable"
echo "=========================================================================================================="

