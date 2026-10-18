#!/bin/bash

# Test script to verify interactions API returns occurred_at and other fields
# Usage: ./test-interactions-api.sh <contact_id> <auth_token>

CONTACT_ID=$1
AUTH_TOKEN=$2
API_URL=${3:-"https://api.everreach.app"}

if [ -z "$CONTACT_ID" ] || [ -z "$AUTH_TOKEN" ]; then
  echo "Usage: ./test-interactions-api.sh <contact_id> <auth_token> [api_url]"
  echo "Example: ./test-interactions-api.sh abc123 eyJhbGc..."
  exit 1
fi

echo "Testing Interactions API..."
echo "Contact ID: $CONTACT_ID"
echo "API URL: $API_URL"
echo ""

# Test v1 endpoint
echo "=== Testing /api/v1/interactions ==="
curl -s -X GET \
  "$API_URL/api/v1/interactions?contact_id=$CONTACT_ID&limit=5" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo ""

# Test legacy endpoint
echo "=== Testing /api/interactions ==="
curl -s -X GET \
  "$API_URL/api/interactions?contact_id=$CONTACT_ID&limit=5" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo ""

# Test notes endpoint
echo "=== Testing /api/v1/contacts/:id/notes ==="
curl -s -X GET \
  "$API_URL/api/v1/contacts/$CONTACT_ID/notes?limit=5" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json" | jq '.'

echo ""
echo ""

# Verify fields are present
echo "=== Verification ==="
RESPONSE=$(curl -s -X GET \
  "$API_URL/api/v1/interactions?contact_id=$CONTACT_ID&limit=1" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  -H "Content-Type: application/json")

HAS_OCCURRED_AT=$(echo $RESPONSE | jq '.items[0].occurred_at != null')
HAS_CHANNEL=$(echo $RESPONSE | jq '.items[0].channel != null')
HAS_DIRECTION=$(echo $RESPONSE | jq '.items[0].direction != null')
HAS_SUMMARY=$(echo $RESPONSE | jq '.items[0].summary != null')
HAS_SENTIMENT=$(echo $RESPONSE | jq '.items[0].sentiment != null')

echo "occurred_at present: $HAS_OCCURRED_AT"
echo "channel present: $HAS_CHANNEL"
echo "direction present: $HAS_DIRECTION"
echo "summary present: $HAS_SUMMARY"
echo "sentiment present: $HAS_SENTIMENT"

if [ "$HAS_OCCURRED_AT" = "true" ]; then
  echo ""
  echo "SUCCESS! occurred_at field is now being returned."
else
  echo ""
  echo "FAILED! occurred_at field is still missing."
  exit 1
fi
