# PowerShell script to add all environment variables to Vercel
# Run this in backend-vercel directory
# Usage: .\add-env-to-vercel.ps1

Write-Host "🚀 Adding Environment Variables to Vercel" -ForegroundColor Cyan
Write-Host "=" * 50

# Change to backend-vercel directory
cd backend-vercel

# Core Services
Write-Host "`n📦 Adding Core Services..." -ForegroundColor Yellow
vercel env add SUPABASE_URL production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add SUPABASE_ANON_KEY production
vercel env add OPENAI_API_KEY production

# Twilio
Write-Host "`n📱 Adding Twilio..." -ForegroundColor Yellow
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production

# Resend
Write-Host "`n📧 Adding Resend..." -ForegroundColor Yellow
vercel env add RESEND_API_KEY production
Write-Host "⚠️  Note: Add RESEND_WEBHOOK_SECRET after creating webhook" -ForegroundColor Red

# PostHog
Write-Host "`n📊 Adding PostHog..." -ForegroundColor Yellow
vercel env add NEXT_PUBLIC_POSTHOG_KEY production
vercel env add NEXT_PUBLIC_POSTHOG_HOST production

# Cron Secret
Write-Host "`n⏰ Adding Cron Secret..." -ForegroundColor Yellow
vercel env add CRON_SECRET production

# WhatsApp
Write-Host "`n💬 Adding WhatsApp..." -ForegroundColor Yellow
vercel env add WHATSAPP_ACCESS_TOKEN production
vercel env add WHATSAPP_PHONE_NUMBER_ID production

# Instagram
Write-Host "`n📸 Adding Instagram..." -ForegroundColor Yellow
vercel env add INSTAGRAM_APP_ID production
vercel env add INSTAGRAM_APP_SECRET production
vercel env add INSTAGRAM_ACCESS_TOKEN production

# Facebook Ads
Write-Host "`n📢 Adding Facebook Ads..." -ForegroundColor Yellow
vercel env add FB_ADS_APP_ID production
vercel env add FB_ADS_ACCOUNT_ID production
vercel env add FB_ADS_ACCESS_TOKEN production

# Meta Webhooks
Write-Host "`n🔗 Adding Meta Webhook Config..." -ForegroundColor Yellow
vercel env add META_APP_SECRET production
vercel env add META_VERIFY_TOKEN production

Write-Host "`n✅ Core variables added!" -ForegroundColor Green
Write-Host "`n⚠️  TODO: After deployment, add these webhook secrets:" -ForegroundColor Red
Write-Host "  - RESEND_WEBHOOK_SECRET (from Resend dashboard)" -ForegroundColor Yellow
Write-Host "  - STRIPE_WEBHOOK_SECRET (from Stripe dashboard)" -ForegroundColor Yellow
Write-Host "  - CLAY_WEBHOOK_SECRET (from Clay dashboard)" -ForegroundColor Yellow
Write-Host "`n📝 See VERCEL_ENV_VARIABLES.txt for all values to paste" -ForegroundColor Cyan
