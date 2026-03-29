#!/bin/bash
# Smoke tests for POST /api/v1/analytics/paywall
# Run: bash route.test.sh [base_url]
# Example: bash route.test.sh https://ever-reach-be.vercel.app

BASE=${1:-https://ever-reach-be.vercel.app}
PASS=0
FAIL=0

check() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $desc"
    PASS=$((PASS+1))
  else
    echo "  ❌ $desc — expected $expected, got $actual"
    FAIL=$((FAIL+1))
  fi
}

echo ""
echo "=== POST /api/v1/analytics/paywall ==="

# 1. No auth → 401
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/analytics/paywall" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"impression"}')
check "No auth returns 401" "401" "$STATUS"

# 2. Missing event_type → 400
# (needs valid token — skip in CI, just verify not 404/500)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/api/v1/analytics/paywall" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token" \
  -d '{}')
check "Invalid token returns 401 (not 404/500)" "401" "$STATUS"

# 3. Route exists (not 404)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X OPTIONS "$BASE/api/v1/analytics/paywall")
check "OPTIONS returns 2xx (route exists, not 404)" "$(echo $STATUS | grep -q '^2' && echo OK || echo $STATUS)" "OK"

echo ""
echo "Results: $PASS passed, $FAIL failed"
echo ""
