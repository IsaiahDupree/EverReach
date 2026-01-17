#!/bin/bash
set -e

# Script to insert Apple subscription snapshot using Supabase REST API
# Reads credentials from .env file

# Load environment variables
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

USER_EMAIL="isaiahdupree33@gmail.com"
PRODUCT_ID="pro_monthly"
STORE="app_store"
STORE_ACCOUNT_ID="sandbox@isaiahdupree.com"
STATUS="active"
PERIOD_END="2025-12-01T00:00:00.000Z"

echo "🔍 Step 1: Fetching user_id for $USER_EMAIL..."
echo ""

# Get user_id from Supabase using REST API
USER_RESPONSE=$(curl -s -X GET \
  "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/rpc/get_user_id_by_email" \
  -H "apikey: ${EXPO_PUBLIC_SUPABASE_KEY}" \
  -H "Authorization: Bearer ${EXPO_PUBLIC_SUPABASE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{\"email_param\": \"$USER_EMAIL\"}")

# Try alternative: query auth.users directly (requires service role key)
if [ ! -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Using service role key to fetch user..."
  USER_RESPONSE=$(curl -s -X GET \
    "${EXPO_PUBLIC_SUPABASE_URL}/auth/v1/admin/users?email=${USER_EMAIL}" \
    -H "apikey: ${EXPO_PUBLIC_SUPABASE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}")
  
  USER_ID=$(echo "$USER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | sed 's/"id":"\([^"]*\)"/\1/')
else
  echo "⚠️  Service role key not found in .env"
  echo "    Please add SUPABASE_SERVICE_ROLE_KEY to your .env file"
  exit 1
fi

if [ -z "$USER_ID" ]; then
  echo "❌ Error: Could not fetch user_id"
  echo "Response: $USER_RESPONSE"
  exit 1
fi

echo "✅ Found user_id: $USER_ID"
echo ""
echo "📝 Step 2: Inserting subscription snapshot..."

# Insert subscription using REST API
INSERT_RESPONSE=$(curl -s -X POST \
  "${EXPO_PUBLIC_SUPABASE_URL}/rest/v1/subscriptions" \
  -H "apikey: ${EXPO_PUBLIC_SUPABASE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -H "Prefer: resolution=merge-duplicates" \
  -d "{
    \"user_id\": \"$USER_ID\",
    \"product_id\": \"$PRODUCT_ID\",
    \"store\": \"$STORE\",
    \"store_account_id\": \"$STORE_ACCOUNT_ID\",
    \"status\": \"$STATUS\",
    \"current_period_end\": \"$PERIOD_END\"
  }")

echo "✅ Subscription snapshot inserted"
echo ""
echo "🔄 Step 3: Recomputing entitlements via backend API..."

# Get auth token for API call
SUPABASE_URL="${EXPO_PUBLIC_SUPABASE_URL}"
ANON_KEY="${EXPO_PUBLIC_SUPABASE_KEY}"

echo "Please sign in to get an auth token..."
echo "Visit: ${SUPABASE_URL}"
echo ""
echo "Or run in app: Settings → Payments (Dev) → Backend Recompute Entitlements"
echo ""
echo "✨ Done! After recompute, your account will show Apple as payment platform."
