#!/bin/bash

# Voice Context Testing Script (Bash version)
# Quick tests using curl to verify voice context affects message generation
#
# Usage: ./scripts/test-voice-context.sh

API_URL="${API_URL:-http://localhost:3000}"
ENDPOINT="${API_URL}/api/messages/craft"

echo ""
echo "🧪 VOICE CONTEXT MESSAGE GENERATION TEST"
echo "========================================================================"
echo "Testing: ${ENDPOINT}"
echo "========================================================================"
echo ""

# Test function
test_voice_context() {
  local test_name="$1"
  local voice_context="$2"
  local expected_style="$3"
  
  echo ""
  echo "📝 Testing: ${test_name}"
  echo "   Voice Context: ${voice_context:-'(none)'}"
  echo "   Expected Style: ${expected_style}"
  echo "   ----------------------------------------------------------------"
  
  # Build JSON payload
  if [ -z "$voice_context" ]; then
    payload=$(cat <<EOF
{
  "purpose": "follow up about our meeting last week and schedule a call",
  "context": "We discussed the Q4 marketing strategy and they seemed interested",
  "to": {"name": "Sarah", "email": "sarah@example.com"},
  "tone": "friendly"
}
EOF
)
  else
    payload=$(cat <<EOF
{
  "purpose": "follow up about our meeting last week and schedule a call",
  "context": "We discussed the Q4 marketing strategy and they seemed interested",
  "to": {"name": "Sarah", "email": "sarah@example.com"},
  "tone": "friendly",
  "voiceContext": "${voice_context}"
}
EOF
)
  fi
  
  # Make request
  response=$(curl -s -w "\n%{http_code}" -X POST "${ENDPOINT}" \
    -H "Content-Type: application/json" \
    -d "${payload}")
  
  # Parse response
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -eq 200 ]; then
    echo "   ✅ Generated Message:"
    echo ""
    echo "$body" | jq -r '.message' | sed 's/^/   /'
    echo ""
  else
    echo "   ❌ Error: HTTP ${http_code}"
    echo "$body" | jq '.' | sed 's/^/   /'
    echo ""
  fi
}

# Run tests
echo "Test 1: Baseline (No Voice Context)"
test_voice_context \
  "Baseline" \
  "" \
  "Default professional tone"

echo ""
echo "========================================================================"
echo ""

echo "Test 2: Gen Z Casual"
test_voice_context \
  "Gen Z Casual" \
  "Gen Z casual with tech startup vibes - use contemporary slang, keep it real and friendly" \
  "Casual, modern slang"

echo ""
echo "========================================================================"
echo ""

echo "Test 3: Professional Fintech"
test_voice_context \
  "Professional Fintech" \
  "Professional fintech executive - data-driven, concise, businesslike but friendly" \
  "Short, precise, business-focused"

echo ""
echo "========================================================================"
echo ""

echo "Test 4: Southern Charm"
test_voice_context \
  "Southern Charm" \
  "Southern US style - warm, friendly, use regional phrases like 'y'all', genuine hospitality" \
  "Warm, regional dialect"

echo ""
echo "========================================================================"
echo ""

echo "Test 5: NYC Direct"
test_voice_context \
  "NYC Direct" \
  "New York City direct - fast-paced, no fluff, get to the point quickly" \
  "Very brief, direct"

echo ""
echo "========================================================================"
echo ""
echo "✅ Test completed!"
echo ""
echo "💡 OBSERVATIONS:"
echo "   - Compare tone and language style across voice contexts"
echo "   - Check for regional phrases (e.g., 'y'all' for Southern)"
echo "   - Notice formality differences (Gen Z vs Professional)"
echo "   - Observe message length variations"
echo ""
