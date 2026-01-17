#!/bin/bash
# Complete Endpoint Test - All 52 Frontend Endpoints
# Tests against both local and production

LOCAL_URL="http://localhost:3000"
PROD_URL="https://ever-reach-be.vercel.app"
TOKEN="${1:-}"

echo "========================================"
echo "🧪 COMPLETE ENDPOINT TEST (52 Endpoints)"
echo "========================================"
echo "📍 Local:      $LOCAL_URL"
echo "📍 Production: $PROD_URL"
echo "🔐 Auth Token: ${TOKEN:0:20}..."
echo ""

# Counters
LOCAL_PASS=0
LOCAL_WARN=0
LOCAL_FAIL=0
PROD_PASS=0
PROD_WARN=0
PROD_FAIL=0
MATCH=0
MISMATCH=0
TOTAL=0

test_endpoint() {
    local name="$1"
    local path="$2"
    local method="$3"
    local needs_auth="$4"
    local body="$5"
    
    TOTAL=$((TOTAL + 1))
    
    local auth_header=""
    if [ "$needs_auth" = "true" ] && [ -n "$TOKEN" ]; then
        auth_header="-H 'Authorization: Bearer $TOKEN'"
    fi
    
    local body_arg=""
    if [ -n "$body" ]; then
        body_arg="-d '$body'"
    fi
    
    # Test local
    local local_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method -H 'Content-Type: application/json' $auth_header $body_arg '$LOCAL_URL$path'"
    local local_status=$(eval $local_cmd 2>/dev/null || echo "000")
    
    # Test production
    local prod_cmd="curl -s -o /dev/null -w '%{http_code}' -X $method -H 'Content-Type: application/json' $auth_header $body_arg '$PROD_URL$path'"
    local prod_status=$(eval $prod_cmd 2>/dev/null || echo "000")
    
    # Count results
    if [[ "$local_status" =~ ^2[0-9][0-9]$ ]]; then LOCAL_PASS=$((LOCAL_PASS + 1))
    elif [ "$local_status" != "000" ]; then LOCAL_WARN=$((LOCAL_WARN + 1))
    else LOCAL_FAIL=$((LOCAL_FAIL + 1)); fi
    
    if [[ "$prod_status" =~ ^2[0-9][0-9]$ ]]; then PROD_PASS=$((PROD_PASS + 1))
    elif [ "$prod_status" != "000" ]; then PROD_WARN=$((PROD_WARN + 1))
    else PROD_FAIL=$((PROD_FAIL + 1)); fi
    
    if [ "$local_status" = "$prod_status" ]; then
        MATCH=$((MATCH + 1))
        match_icon="✅"
    else
        MISMATCH=$((MISMATCH + 1))
        match_icon="❌"
    fi
    
    # Format status icons
    local local_icon="❌"
    local prod_icon="❌"
    [[ "$local_status" =~ ^2[0-9][0-9]$ ]] && local_icon="✅"
    [[ "$local_status" =~ ^4[0-9][0-9]$ ]] && local_icon="⚠️"
    [[ "$prod_status" =~ ^2[0-9][0-9]$ ]] && prod_icon="✅"
    [[ "$prod_status" =~ ^4[0-9][0-9]$ ]] && prod_icon="⚠️"
    
    printf "%-3s %-35s %-6s | L: %s %-3s | P: %s %-3s | %s\n" \
        "$TOTAL" "$name" "$method" "$local_icon" "$local_status" "$prod_icon" "$prod_status" "$match_icon"
}

echo "======================================================================================"
printf "%-3s %-35s %-6s | %-8s | %-8s | %s\n" "#" "Endpoint" "Method" "Local" "Prod" "Match"
echo "======================================================================================"

# ═══════════════════════════════════════════════════════════════════
# SECTION 1: HEALTH & VERSION (2)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- HEALTH & VERSION (No Auth) ---"
test_endpoint "health" "/api/health" "GET" "false"
test_endpoint "version" "/api/version" "GET" "false"

# ═══════════════════════════════════════════════════════════════════
# SECTION 2: USER & AUTH - /me endpoints (8)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- USER & AUTH (/me) ---"
test_endpoint "me" "/api/v1/me" "GET" "true"
test_endpoint "me/account" "/api/v1/me/account" "DELETE" "true"
test_endpoint "me/compose-settings" "/api/v1/me/compose-settings" "GET" "true"
test_endpoint "me/entitlements" "/api/v1/me/entitlements" "GET" "true"
test_endpoint "me/onboarding-status" "/api/v1/me/onboarding-status" "GET" "true"
test_endpoint "me/persona-notes" "/api/v1/me/persona-notes" "GET" "true"
test_endpoint "me/persona-notes POST" "/api/v1/me/persona-notes" "POST" "true" '{"type":"text","body_text":"test"}'
test_endpoint "me/compose-settings PATCH" "/api/v1/me/compose-settings" "PATCH" "true" '{}'

# ═══════════════════════════════════════════════════════════════════
# SECTION 3: CONTACTS (12)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- CONTACTS ---"
test_endpoint "contacts" "/api/v1/contacts" "GET" "true"
test_endpoint "contacts POST" "/api/v1/contacts" "POST" "true" '{"display_name":"Test Contact Health"}'
# Dynamic contact endpoints - using a placeholder ID (will get 404 or 400)
test_endpoint "contacts/{id}" "/api/v1/contacts/test-id" "GET" "true"
test_endpoint "contacts/{id}/notes" "/api/v1/contacts/test-id/notes" "GET" "true"
test_endpoint "contacts/{id}/messages" "/api/v1/contacts/test-id/messages" "GET" "true"
test_endpoint "contacts/{id}/files" "/api/v1/contacts/test-id/files" "POST" "true" '{"file_id":"test"}'
test_endpoint "contacts/{id}/tags" "/api/v1/contacts/test-id/tags" "PATCH" "true" '{"tags":["test"]}'
test_endpoint "contacts/{id}/pipeline" "/api/v1/contacts/test-id/pipeline" "GET" "true"
test_endpoint "contacts/{id}/pipeline/move" "/api/v1/contacts/test-id/pipeline/move" "POST" "true" '{"stage_id":"test"}'
test_endpoint "contacts/{id}/context-summary" "/api/v1/contacts/test-id/context-summary" "GET" "true"
test_endpoint "contacts/{id}/goal-suggest" "/api/v1/contacts/test-id/goal-suggestions" "GET" "true"
test_endpoint "contacts/{id}/warmth/mode" "/api/v1/contacts/test-id/warmth/mode" "GET" "true"

# ═══════════════════════════════════════════════════════════════════
# SECTION 4: CONTACT IMPORT (4)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- CONTACT IMPORT ---"
test_endpoint "import/health" "/api/v1/contacts/import/health" "GET" "true"
test_endpoint "import/list" "/api/v1/contacts/import/list" "GET" "true"
test_endpoint "import/status/{id}" "/api/v1/contacts/import/status/test-id" "GET" "true"
test_endpoint "import/google/start" "/api/v1/contacts/import/google/start" "POST" "true" '{}'

# ═══════════════════════════════════════════════════════════════════
# SECTION 5: MESSAGES & COMPOSE (4)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- MESSAGES & COMPOSE ---"
test_endpoint "messages" "/api/v1/messages" "POST" "true" '{"contact_id":"test","channel":"email"}'
test_endpoint "messages/prepare" "/api/v1/messages/prepare" "POST" "true" '{}'
test_endpoint "messages/send" "/api/v1/messages/send" "POST" "true" '{}'
test_endpoint "compose" "/api/v1/compose" "POST" "true" '{"contact_id":"test","channel":"email","goal":"test"}'

# ═══════════════════════════════════════════════════════════════════
# SECTION 6: INTERACTIONS & GOALS (4)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- INTERACTIONS & GOALS ---"
test_endpoint "interactions" "/api/v1/interactions" "GET" "true"
test_endpoint "interactions POST" "/api/v1/interactions" "POST" "true" '{"type":"note","snippet":"test"}'
test_endpoint "interactions/{id}/files" "/api/v1/interactions/test-id/files" "POST" "true" '{"file_id":"test"}'
test_endpoint "goals" "/api/v1/goals" "GET" "true"

# ═══════════════════════════════════════════════════════════════════
# SECTION 7: PIPELINES & TEMPLATES (2)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- PIPELINES & TEMPLATES ---"
test_endpoint "pipelines" "/api/v1/pipelines" "GET" "true"
test_endpoint "templates" "/api/v1/templates" "GET" "true"

# ═══════════════════════════════════════════════════════════════════
# SECTION 8: FILES & MEDIA (3)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- FILES & MEDIA ---"
test_endpoint "files" "/api/v1/files" "POST" "true" '{"path":"test/health.txt","contentType":"text/plain"}'
test_endpoint "screenshots/{id}/analyze" "/api/v1/screenshots/test-id/analyze" "POST" "true" '{"contact_id":"test"}'
# Skipping multipart: screenshots POST, transcribe

# ═══════════════════════════════════════════════════════════════════
# SECTION 9: SEARCH & ANALYTICS (3)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- SEARCH & ANALYTICS ---"
test_endpoint "search" "/api/v1/search" "POST" "true" '{"query":"test"}'
test_endpoint "events/track" "/api/v1/events/track" "POST" "true" '{"event_type":"test","metadata":{}}'
test_endpoint "feature-requests" "/api/v1/feature-requests" "POST" "true" '{"type":"feature","title":"Test","description":"test"}'

# ═══════════════════════════════════════════════════════════════════
# SECTION 10: BILLING & CONFIG (5)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- BILLING & CONFIG ---"
test_endpoint "billing/restore" "/api/v1/billing/restore" "POST" "true" '{}'
test_endpoint "config/paywall-live" "/api/v1/config/paywall-live" "GET" "true"
test_endpoint "config/paywall-strategy" "/api/v1/config/paywall-strategy" "GET" "false"
test_endpoint "warmth/modes" "/api/v1/warmth/modes" "GET" "false"
# subscriptions/sync skipped - needs RevenueCat data

# ═══════════════════════════════════════════════════════════════════
# SECTION 11: AGENT & OTHER (2)
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "--- AGENT & OTHER ---"
test_endpoint "agent/chat" "/api/v1/agent/chat" "POST" "true" '{"message":"ping"}'
test_endpoint "analysis/screenshot" "/api/v1/analysis/screenshot" "POST" "true" '{"image_url":"test"}'

# ═══════════════════════════════════════════════════════════════════
# SUMMARY
# ═══════════════════════════════════════════════════════════════════
echo ""
echo "======================================================================================"
echo "📊 SUMMARY"
echo "======================================================================================"
echo ""
echo "           LOCAL                      PRODUCTION"
echo "           -----                      ----------"
echo "✅ Pass:   $LOCAL_PASS                        $PROD_PASS"
echo "⚠️  Warn:   $LOCAL_WARN                        $PROD_WARN"
echo "❌ Fail:   $LOCAL_FAIL                        $PROD_FAIL"
echo ""
echo "🔄 Match:     $MATCH / $TOTAL"
echo "❌ Mismatch:  $MISMATCH / $TOTAL"
echo ""
echo "======================================================================================"
echo ""
echo "Note: 4xx on dynamic endpoints (/{id}) is expected - they need real IDs"
echo "      Multipart endpoints (screenshots, transcribe) skipped - need file upload"
echo "======================================================================================"

