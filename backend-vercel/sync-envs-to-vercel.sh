#!/bin/bash
# Sync critical environment variables to Vercel

echo "🔄 Syncing environment variables to Vercel..."
echo ""

# Critical variables to sync
VARS=(
  "SUPABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SUPABASE_ANON_KEY"
  "OPENAI_API_KEY"
  "REVENUECAT_V2_API_KEY"
  "REVENUECAT_PROJECT_ID"
  "STRIPE_SECRET_KEY"
  "STRIPE_PUBLISHABLE_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "TWILIO_ACCOUNT_SID"
  "TWILIO_AUTH_TOKEN"
  "TWILIO_PHONE_NUMBER"
  "RESEND_API_KEY"
  "POSTHOG_API_KEY"
  "TEST_EMAIL"
  "TEST_PASSWORD"
)

# Load .env file
export $(cat .env | grep -v '^#' | xargs)

echo "📤 Pushing variables to Vercel..."
echo ""

for VAR in "${VARS[@]}"; do
  VALUE="${!VAR}"
  if [ -n "$VALUE" ]; then
    echo "   Setting: $VAR"
    # Remove quotes if present
    CLEAN_VALUE=$(echo "$VALUE" | sed 's/^"//;s/"$//')
    echo "$CLEAN_VALUE" | vercel env add "$VAR" production --force > /dev/null 2>&1
  else
    echo "   ⚠️  Skipping: $VAR (not found in .env)"
  fi
done

echo ""
echo "✅ Environment variables synced to Vercel!"
echo ""
echo "💡 To verify: vercel env ls"
