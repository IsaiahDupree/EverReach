#!/bin/bash
# Meta Pixel / Conversions API Verification Script
# Sends test events and validates events_received from Meta's Graph API.
#
# Usage:
#   ./scripts/test-meta-pixel.sh                  # uses .env values
#   ./scripts/test-meta-pixel.sh --event PageView  # send a single event
#   ./scripts/test-meta-pixel.sh --all             # send all standard events
#
# Exit codes: 0 = all passed, 1 = at least one failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Load specific Meta env vars from .env (handles long tokens safely)
ENV_FILE="$PROJECT_DIR/.env"
if [ -f "$ENV_FILE" ]; then
  PIXEL_ID=$(grep '^EXPO_PUBLIC_META_PIXEL_ID=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '\r\n ')
  TOKEN=$(grep '^EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '\r\n ')
  TEST_CODE=$(grep '^EXPO_PUBLIC_META_TEST_EVENT_CODE=' "$ENV_FILE" | head -1 | cut -d'=' -f2 | tr -d '\r\n ')
fi

PIXEL_ID="${PIXEL_ID:-${EXPO_PUBLIC_META_PIXEL_ID:-}}"
TOKEN="${TOKEN:-${EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN:-}}"
TEST_CODE="${TEST_CODE:-TEST48268}"
API_VERSION="v21.0"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

PASSED=0
FAILED=0
TOTAL=0

# Validate config
if [ -z "$PIXEL_ID" ] || [ -z "$TOKEN" ]; then
  echo -e "${RED}ERROR: Missing config.${NC}"
  echo "  EXPO_PUBLIC_META_PIXEL_ID=${PIXEL_ID:-<empty>}"
  echo "  EXPO_PUBLIC_META_CONVERSIONS_API_TOKEN=${TOKEN:+set (${#TOKEN} chars)}"
  echo "Set these in $PROJECT_DIR/.env"
  exit 1
fi

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}  Meta Pixel Verification${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Pixel ID:    ${PIXEL_ID}"
echo -e "  Token:       ${TOKEN:0:20}..."
echo -e "  Test Code:   ${TEST_CODE}"
echo -e "  API Version: ${API_VERSION}"
echo ""

# Hash helper
hash_email() {
  echo -n "$1" | shasum -a 256 | cut -d' ' -f1
}

EMAIL_HASH=$(hash_email "isaiahdupree33@gmail.com")

send_event() {
  local event_name="$1"
  local custom_data="${2:-{}}"
  local ts=$(date +%s)
  local event_id="${event_name}_verify_${ts}_$$"

  TOTAL=$((TOTAL + 1))

  # Build JSON payload and write to temp file (avoids shell escaping issues with long tokens)
  local tmpfile
  tmpfile=$(mktemp /tmp/meta_event_XXXXXX)
  printf '{"data":[{"event_name":"%s","event_time":%s,"event_id":"%s","action_source":"app","user_data":{"em":["%s"],"external_id":["everreach_cli_test"],"client_user_agent":"EverReach/1.0 (ios)"},"custom_data":%s,"app_data":{"advertiser_tracking_enabled":1,"application_tracking_enabled":1,"extinfo":["i2","com.everreach.app","1.0.0","1.0.0","18.0","iPhone","en_US","UTC","","390","844","2","6","256000","225000","-5"]}}],"test_event_code":"%s"}' \
    "$event_name" "$ts" "$event_id" "$EMAIL_HASH" "$custom_data" "$TEST_CODE" > "$tmpfile"

  local response
  response=$(curl -s -w "\n%{http_code}" -X POST \
    "https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events?access_token=${TOKEN}" \
    -H "Content-Type: application/json" \
    -d @"$tmpfile")
  rm -f "$tmpfile"

  local http_code=$(echo "$response" | tail -1)
  local body=$(echo "$response" | sed '$d')
  local events_received=$(echo "$body" | python3 -c "import sys,json; print(json.load(sys.stdin).get('events_received',0))" 2>/dev/null || echo "0")
  local error_msg=$(echo "$body" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('error',{}).get('error_user_msg','') or d.get('error',{}).get('message',''))" 2>/dev/null || echo "")

  if [ "$http_code" = "200" ] && [ "$events_received" -gt 0 ] 2>/dev/null; then
    echo -e "  ${GREEN}✅ ${event_name}${NC} → events_received: ${events_received} (HTTP ${http_code})"
    PASSED=$((PASSED + 1))
  else
    echo -e "  ${RED}❌ ${event_name}${NC} → HTTP ${http_code}"
    if [ -n "$error_msg" ]; then
      echo -e "     ${RED}${error_msg}${NC}"
    else
      echo -e "     ${RED}${body}${NC}"
    fi
    FAILED=$((FAILED + 1))
  fi
}

# Parse args
SINGLE_EVENT=""
RUN_ALL=true

while [[ $# -gt 0 ]]; do
  case $1 in
    --event)
      SINGLE_EVENT="$2"
      RUN_ALL=false
      shift 2
      ;;
    --all)
      RUN_ALL=true
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

if [ -n "$SINGLE_EVENT" ]; then
  echo -e "${YELLOW}Sending single event: ${SINGLE_EVENT}${NC}"
  send_event "$SINGLE_EVENT" '{"source":"cli_single_test"}'
else
  echo -e "${YELLOW}Sending all standard Meta events...${NC}"
  echo ""
  send_event "PageView" '{"source":"cli_test"}'
  sleep 0.3
  send_event "ViewContent" '{"content_name":"test_screen","content_type":"screen","source":"cli_test"}'
  sleep 0.3
  send_event "CompleteRegistration" '{"content_name":"test_signup","status":"test","source":"cli_test"}'
  sleep 0.3
  send_event "Lead" '{"content_name":"test_lead","value":0,"currency":"USD","source":"cli_test"}'
  sleep 0.3
  send_event "StartTrial" '{"content_name":"test_trial","value":0,"currency":"USD","source":"cli_test"}'
  sleep 0.3
  send_event "Subscribe" '{"content_name":"test_subscribe","value":9.99,"currency":"USD","source":"cli_test"}'
  sleep 0.3
  send_event "Purchase" '{"content_name":"test_purchase","value":9.99,"currency":"USD","source":"cli_test"}'
  sleep 0.3
  send_event "Search" '{"search_string":"test query","source":"cli_test"}'
  sleep 0.3
  send_event "Contact" '{"content_name":"test_contact","source":"cli_test"}'
fi

# Summary
echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "  Results: ${GREEN}${PASSED} passed${NC} / ${RED}${FAILED} failed${NC} / ${TOTAL} total"
echo -e "  Test code: ${TEST_CODE}"
echo -e "  Verify at: https://business.facebook.com/events_manager2/list/dataset/${PIXEL_ID}/test_events"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
exit 0
