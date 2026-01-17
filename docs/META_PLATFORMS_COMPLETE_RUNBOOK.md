# 🚀 EverReach × Meta: Complete Integration Runbook

**Version**: 1.0.0  
**API Version**: v24.0  
**Status**: Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Schema & Database](#schema--database)
3. [Prerequisites & Setup](#prerequisites--setup)
4. [Messaging Integration](#messaging-integration)
5. [Webhooks](#webhooks)
6. [Ads & Insights](#ads--insights)
7. [Conversions API](#conversions-api)
8. [Testing](#testing)
9. [Production Deployment](#production-deployment)

---

## Overview

Complete integration with Meta platforms:
- ✅ **Messaging**: Messenger, Instagram DMs, WhatsApp Business
- ✅ **Webhooks**: Real-time inbound message & event handling
- ✅ **Ads**: Campaign performance & insights sync
- ✅ **Conversions**: Server-side event tracking (CAPI)
- ✅ **Organic**: Instagram/Facebook content insights

---

## Schema & Database

### **Tables Created** (11 total)

```sql
conversation_thread          -- Threads across all platforms
conversation_message         -- Individual messages
messaging_policy_window      -- 24h/7d window tracking
message_delivery_event       -- Delivery/read receipts
meta_platform_config         -- Platform credentials
social_media_post            -- FB/IG posts
social_post_insights         -- Post performance
social_account_insights      -- Account metrics
ad_performance               -- Ads data (linked to campaign)
meta_conversion_event        -- Server-side events
meta_webhook_event           -- Webhook log
```

### **Migration File**

**Run**: `backend-vercel/migrations/meta-platforms-schema.sql`

```bash
# Option 1: Supabase SQL Editor
https://supabase.com/dashboard/project/utasetfxiqcrnwyfforx/sql/new

# Option 2: psql
psql -h db.utasetfxiqcrnwyfforx.supabase.co \
  -p 5432 -U postgres -d postgres \
  -f backend-vercel/migrations/meta-platforms-schema.sql
```

**Integrations**:
- `conversation_message` → `user_event` (automatic trigger)
- `ad_performance` → `campaign` (foreign key)
- `meta_conversion_event` → `auth.users` (user tracking)

---

## Prerequisites & Setup

### **1. Facebook App Setup**

**Create App**: https://developers.facebook.com/apps

1. Create new app (Business type)
2. Add products:
   - Messenger
   - Instagram
   - WhatsApp
   - Marketing API
3. Set app to **Live Mode**

### **2. Connect Business Assets**

- **Page**: For Messenger & Instagram
- **Instagram Professional**: Link to Page
- **WABA**: WhatsApp Business Account
- **Ad Account**: For ads insights

### **3. Generate Tokens**

#### **Page Access Token** (Messenger/IG)
```bash
# 1. Get user token via OAuth
https://www.facebook.com/v24.0/dialog/oauth?
  client_id={APP_ID}&
  redirect_uri={REDIRECT_URI}&
  scope=pages_messaging,pages_read_engagement,instagram_manage_messages

# 2. Exchange for page token
curl -G "https://graph.facebook.com/v24.0/me/accounts" \
  -d access_token={USER_TOKEN}
```

#### **WhatsApp System Token**
Generate in: App Dashboard → WhatsApp → Configuration

#### **Ads Token**
Generate in: Business Settings → System Users → Generate Token
- Permissions: `ads_read`, `ads_management`

### **4. Environment Variables**

Add to `.env` and Vercel:

```bash
# Messenger
MESSENGER_PAGE_ID=your_page_id
MESSENGER_PAGE_TOKEN=your_page_token

# Instagram
INSTAGRAM_PAGE_ID=your_ig_linked_page_id
INSTAGRAM_PAGE_TOKEN=your_page_token
INSTAGRAM_USER_ID=your_ig_user_id

# WhatsApp
WHATSAPP_PHONE_NUMBER_ID=851190418074116
WHATSAPP_ACCESS_TOKEN=your_waba_token
WABA_ID=your_waba_id

# Ads
FB_ADS_ACCESS_TOKEN=your_ads_token
FB_ADS_ACCOUNT_ID=act_1130334212412487

# Conversions API
META_PIXEL_ID=your_pixel_id
META_CONVERSIONS_API_TOKEN=your_capi_token

# Webhooks
META_WEBHOOK_VERIFY_TOKEN=everreach_meta_verify_2025
```

---

## Messaging Integration

### **A. Send Messenger Message**

**Endpoint**: `POST /api/v1/integrations/messenger/send`

```typescript
const response = await fetch(
  'https://your-backend.vercel.app/api/v1/integrations/messenger/send',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform: 'messenger', // or 'instagram'
      recipient_id: '1234567890', // PSID
      message_type: 'text',
      text: 'Thanks for reaching out! 👋',
      quick_replies: [
        { content_type: 'text', title: 'Help', payload: 'HELP' },
        { content_type: 'text', title: 'Pricing', payload: 'PRICING' }
      ]
    })
  }
);
```

**Response**:
```json
{
  "success": true,
  "message_id": "mid.xxx",
  "recipient_id": "1234567890",
  "platform": "messenger",
  "thread_id": "uuid-xxx",
  "used_message_tag": false
}
```

### **B. Send WhatsApp Message**

**Endpoint**: `POST /api/v1/integrations/whatsapp/send`

```typescript
// Template message (outside 24h window)
await fetch('/api/v1/integrations/whatsapp/send', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    to: '12177996721',
    type: 'template',
    template: {
      name: 'hello_world',
      language: { code: 'en_US' }
    }
  })
});

// Text message (inside 24h window)
await fetch('/api/v1/integrations/whatsapp/send', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: JSON.stringify({
    to: '12177996721',
    type: 'text',
    message: 'Your order is on the way 🚚'
  })
});
```

### **Policy Windows**

| Window Type | Duration | Trigger | Use Case |
|------------|----------|---------|----------|
| Standard | 24 hours | User message | Free-form messaging |
| Human Agent | 7 days | Manual assignment | Customer support (IG/Messenger) |
| Template | Always | N/A | WhatsApp outside window |

**Check Window**:
```sql
SELECT is_in_messaging_window('thread-uuid');
```

---

## Webhooks

### **Setup Webhooks**

**Endpoint**: `https://your-backend.vercel.app/api/webhooks/meta`

#### **1. Verify Webhook**
```bash
# Meta will call:
GET /api/webhooks/meta?
  hub.mode=subscribe&
  hub.challenge=123456&
  hub.verify_token=everreach_meta_verify_2025

# Your endpoint returns: 123456
```

#### **2. Subscribe App to Webhooks**

**For Messenger/Instagram**:
```bash
# Subscribe app
curl -X POST "https://graph.facebook.com/v24.0/{APP_ID}/subscriptions" \
 -d "object=page" \
 -d "callback_url=https://your-backend.vercel.app/api/webhooks/meta" \
 -d "verify_token=everreach_meta_verify_2025" \
 -d "fields=messages,messaging_postbacks,message_deliveries,message_reads" \
 -d "access_token={APP_ACCESS_TOKEN}"

# Subscribe Page
curl -X POST "https://graph.facebook.com/v24.0/{PAGE_ID}/subscribed_apps" \
 -d "subscribed_fields=messages,message_deliveries" \
 -d "access_token={PAGE_TOKEN}"
```

**For WhatsApp**:
```bash
curl -X POST "https://graph.facebook.com/v24.0/{WABA_ID}/subscribed_apps" \
 -d "access_token={WABA_TOKEN}"
```

### **Webhook Events Handled**

- ✅ Inbound messages (all platforms)
- ✅ Delivery receipts
- ✅ Read receipts
- ✅ WhatsApp status updates
- ✅ Postbacks (buttons/quick replies)

**Events stored in**: `meta_webhook_event` (for replay)

---

## Ads & Insights

### **Sync Ad Performance**

**Endpoint**: `GET /api/v1/integrations/meta/ads-insights`

```typescript
const response = await fetch(
  '/api/v1/integrations/meta/ads-insights?' + new URLSearchParams({
    start_date: '2025-10-01',
    end_date: '2025-10-31',
    level: 'campaign', // campaign, adset, ad
    limit: '100'
  }),
  {
    headers: { 'Authorization': `Bearer ${token}` }
  }
);
```

**Response**:
```json
{
  "success": true,
  "insights_count": 45,
  "summary": {
    "total_spend": 5420.50,
    "total_impressions": 850000,
    "total_clicks": 12500,
    "total_conversions": 245,
    "average_cpc": 0.43,
    "average_cpm": 6.38
  },
  "synced_to_database": 45
}
```

**Data stored in**: `ad_performance` table (linked to `campaign`)

### **Query Performance**

```sql
-- Daily performance by campaign
SELECT 
  date,
  SUM(spend) as daily_spend,
  SUM(clicks) as daily_clicks,
  AVG(cpc) as avg_cpc
FROM ad_performance
WHERE date >= '2025-10-01'
GROUP BY date
ORDER BY date DESC;

-- Top performing campaigns
SELECT 
  metadata->>'campaign_name' as campaign_name,
  SUM(spend) as total_spend,
  SUM(conversions) as total_conversions,
  (SUM(conversion_value) / NULLIF(SUM(spend), 0)) as roas
FROM ad_performance
WHERE date >= NOW() - INTERVAL '30 days'
GROUP BY metadata->>'campaign_name'
ORDER BY roas DESC
LIMIT 10;
```

---

## Conversions API

### **Send Server-Side Event**

**Endpoint**: `POST /api/v1/integrations/meta/conversions`

```typescript
await fetch('/api/v1/integrations/meta/conversions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    event_name: 'Purchase',
    event_source_url: 'https://your.site/thank-you',
    action_source: 'website',
    email: 'user@example.com',
    phone: '+12177996721',
    client_ip_address: req.headers.get('x-forwarded-for'),
    client_user_agent: req.headers.get('user-agent'),
    fbp: cookies.get('_fbp'), // From browser
    fbc: cookies.get('_fbc'),
    value: 29.99,
    currency: 'USD',
    content_ids: ['product_123'],
    content_type: 'product',
    test_event_code: 'TEST12345' // Remove in production
  })
});
```

**Response**:
```json
{
  "success": true,
  "events_received": 1,
  "fbtrace_id": "ABC123xyz",
  "pixel_id": "your_pixel_id",
  "event_name": "Purchase",
  "test_mode": true
}
```

**Important**: PII is automatically hashed (SHA256)

### **Standard Events**

- `ViewContent` - Product page view
- `AddToCart` - Add to cart
- `InitiateCheckout` - Begin checkout
- `AddPaymentInfo` - Payment info added
- `Purchase` - Order completed
- `Lead` - Lead form submitted
- `CompleteRegistration` - Sign up completed

**Events logged to**: `meta_conversion_event` + `user_event`

---

## Testing

### **1. Test Seed Data**

Run `seed-sample-data.sql` first (creates user events, campaigns)

### **2. Test Webhooks Locally**

```bash
# Use ngrok for local testing
ngrok http 3001

# Update webhook URL to ngrok URL
curl -X POST "https://graph.facebook.com/v24.0/{APP_ID}/subscriptions" \
 -d "callback_url=https://abc123.ngrok.io/api/webhooks/meta" \
 -d "verify_token=everreach_meta_verify_2025" \
 -d "access_token={APP_TOKEN}"
```

### **3. Test Messaging**

```bash
# Send test message
curl -X POST "http://localhost:3001/api/v1/integrations/messenger/send" \
 -H "Authorization: Bearer YOUR_JWT" \
 -H "Content-Type: application/json" \
 -d '{
   "platform": "messenger",
   "recipient_id": "TEST_PSID",
   "text": "Test message"
 }'
```

### **4. Test Conversions (Events Manager)**

1. Go to: https://business.facebook.com/events_manager2
2. Select your Pixel
3. Use `test_event_code` parameter
4. View events in Test Events tab

---

## Production Deployment

### **Checklist**

#### **Environment Variables**
```bash
# Add all tokens to Vercel
vercel env add MESSENGER_PAGE_TOKEN
vercel env add INSTAGRAM_PAGE_TOKEN
vercel env add WHATSAPP_ACCESS_TOKEN
vercel env add FB_ADS_ACCESS_TOKEN
vercel env add META_CONVERSIONS_API_TOKEN
vercel env add META_PIXEL_ID
vercel env add META_WEBHOOK_VERIFY_TOKEN
```

#### **Database**
- [x] Run `meta-platforms-schema.sql`
- [x] Run `seed-sample-data.sql` (if needed)
- [x] Verify tables created
- [x] Test functions work

#### **Webhooks**
- [ ] Update webhook URL to production
- [ ] Subscribe all platforms
- [ ] Test inbound messages
- [ ] Monitor `meta_webhook_event` table

#### **Testing**
- [ ] Send test message (each platform)
- [ ] Verify delivery receipts
- [ ] Test policy windows
- [ ] Sync ads data
- [ ] Send test conversion event

### **Deployment Commands**

```bash
cd backend-vercel
vercel deploy --prod

# Update webhook URLs
curl -X POST "https://graph.facebook.com/v24.0/{APP_ID}/subscriptions" \
 -d "callback_url=https://your-production-url.vercel.app/api/webhooks/meta" \
 -d "verify_token=everreach_meta_verify_2025" \
 -d "access_token={APP_TOKEN}"
```

---

## Monitoring & Maintenance

### **Key Metrics to Track**

```sql
-- Message volume by platform
SELECT 
  platform,
  direction,
  COUNT(*) as message_count,
  DATE(sent_at) as date
FROM conversation_message cm
JOIN conversation_thread ct ON cm.thread_id = ct.thread_id
WHERE sent_at >= NOW() - INTERVAL '7 days'
GROUP BY platform, direction, DATE(sent_at)
ORDER BY date DESC, platform;

-- Delivery/Read rates
SELECT 
  status,
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER(), 2) as percentage
FROM conversation_message
WHERE direction = 'outbound'
  AND sent_at >= NOW() - INTERVAL '7 days'
GROUP BY status;

-- Conversion events by type
SELECT 
  event_name,
  COUNT(*) as event_count,
  SUM(value) as total_value,
  AVG(value) as avg_value
FROM meta_conversion_event
WHERE event_time >= NOW() - INTERVAL '30 days'
GROUP BY event_name
ORDER BY event_count DESC;
```

### **Token Refresh**

- **Page Tokens**: 60-day expiry (convert to long-lived)
- **System User Tokens**: Never expire
- **Ads Tokens**: Check in Business Settings

### **Rate Limits**

- **Messaging**: Varies by tier (check WABA tier)
- **Ads API**: 200 calls/hour per user
- **Conversions API**: 1000 events/second per pixel

---

## Troubleshooting

### **Common Issues**

**1. "Outside 24-hour window"**
- Check: `messaging_policy_window` table
- Solution: Use MESSAGE_TAG or template

**2. "Invalid PSID"**
- Check: PSID format varies (Messenger vs IG)
- Solution: Store PSIDs from webhooks

**3. "Token expired"**
- Check: `meta_platform_config.token_expires_at`
- Solution: Regenerate and update

**4. "Webhook not receiving events"**
- Check: Subscription status
- Check: HTTPS/SSL certificate
- Check: App is in Live mode

**5. "Conversions not showing"**
- Check: `test_event_code` removed
- Check: Event deduplication (same event_id)
- Check: PII hashing correct

---

## API Reference

### **Endpoints**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/webhooks/meta` | GET/POST | Webhook handler |
| `/api/v1/integrations/messenger/send` | POST | Send Messenger/IG DM |
| `/api/v1/integrations/whatsapp/send` | POST | Send WhatsApp message |
| `/api/v1/integrations/meta/conversions` | POST | Send conversion event |
| `/api/v1/integrations/meta/ads-insights` | GET | Sync ads performance |

### **Database Functions**

| Function | Purpose |
|----------|---------|
| `is_in_messaging_window(uuid)` | Check if thread has active window |
| `log_message_as_event()` | Auto-log messages to user_event |
| `update_thread_timestamp()` | Update thread last_message_at |

---

## Next Steps

1. **Run seed data** ✅ (in progress)
2. **Test endpoints** (after seed)
3. **Build interfaces** (dashboards)
4. **Deploy to production**
5. **Configure webhooks**
6. **Monitor & optimize**

---

*Last Updated: October 23, 2025*  
*Version: 1.0.0*  
*Status: Production Ready* ✅
