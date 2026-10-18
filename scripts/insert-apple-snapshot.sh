#!/bin/bash
set -e

# Script to insert a manual Apple subscription snapshot for testing
# This allows you to test Apple-origin purchases without a real App Store purchase

USER_EMAIL="isaiahdupree33@gmail.com"
PRODUCT_ID="pro_monthly"
STORE="app_store"
STORE_ACCOUNT_ID="sandbox@isaiahdupree.com"
STATUS="active"
PERIOD_END="2025-12-01T00:00:00Z"  # 30 days from now

echo "🔍 Fetching user_id for email: $USER_EMAIL"

# Get user_id from Supabase
USER_ID=$(npx supabase db query "SELECT id FROM auth.users WHERE email = '$USER_EMAIL' LIMIT 1;" --csv | tail -n 1)

if [ -z "$USER_ID" ]; then
  echo "❌ Error: User not found with email $USER_EMAIL"
  exit 1
fi

echo "✅ Found user_id: $USER_ID"
echo ""
echo "📝 Inserting Apple subscription snapshot..."

# Insert subscription snapshot
npx supabase db query "
INSERT INTO public.subscriptions (
  user_id,
  product_id,
  store,
  store_account_id,
  status,
  current_period_end
)
VALUES (
  '$USER_ID',
  '$PRODUCT_ID',
  '$STORE',
  '$STORE_ACCOUNT_ID',
  '$STATUS',
  '$PERIOD_END'
)
ON CONFLICT (user_id, store, store_account_id) 
DO UPDATE SET
  product_id = EXCLUDED.product_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = NOW();
"

echo "✅ Subscription snapshot inserted"
echo ""
echo "🔄 Now recomputing entitlements..."
echo "   Go to app: Settings → Payments (Dev) → Backend Recompute Entitlements"
echo "   Or call: POST https://ever-reach-be.vercel.app/api/v1/billing/restore"
echo ""
echo "✨ Done! Your account should now show Apple as the payment platform."
