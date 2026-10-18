# Meta (Facebook) Integration Requirements
**Dashboard Health & Metrics Implementation Guide**

---

## 🎯 **Objective**

Integrate Meta (Facebook/Instagram) platform data into the developer dashboard to monitor:
1. **API Health** - Graph API connectivity and response times
2. **Ad Performance** - Campaign metrics, spend, conversions
3. **Webhooks** - Event delivery status and latency
4. **Pixel Events** - Tracking performance and data quality

---

## 📊 **Dashboard Display Requirements**

### **Status Tile**
```typescript
{
  service: 'meta',
  status: 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN',
  latency_ms: 150,
  last_check: '2025-11-08T20:30:00Z',
  last_success: '2025-11-08T20:30:00Z',
  message: 'All systems operational'
}
```

### **Key Metrics to Display**
1. **API Health**
   - Graph API response time (p50, p95, p99)
   - Rate limit remaining (calls/hour)
   - Error rate (4xx, 5xx)

2. **Ads Performance** (if using Ads API)
   - Active campaigns count
   - Ad spend (last 24h, 7d, 30d)
   - Conversions (last 24h)
   - ROAS (Return on Ad Spend)
   - CPC (Cost Per Click)

3. **Pixel Events** (if using Meta Pixel)
   - Events sent (last 24h)
   - Event types (PageView, Purchase, AddToCart, etc.)
   - Deduplication rate
   - Server-side events vs browser events
   - Match quality score

4. **Webhooks** (if subscribed)
   - Subscriptions active
   - Events received (last 24h)
   - Delivery success rate
   - Average latency

---

## 🔐 **Authentication & Credentials**

### **Option 1: Direct Graph API (Recommended)**

**Required Credentials:**
```json
{
  "app_id": "1234567890",
  "app_secret": "abc123...",
  "access_token": "EAABwz...",  // Long-lived user or page token
  "ad_account_id": "act_1234567890",  // Optional, if using Ads API
  "pixel_id": "1234567890",  // Optional, if tracking pixel
  "business_id": "1234567890"  // Optional, for business-level access
}
```

**Token Types:**
- **App Access Token** (`{app_id}|{app_secret}`) - Basic API access, limited permissions
- **User Access Token** - Short-lived (1-2 hours), needs refresh
- **Page Access Token** - Long-lived (60 days), for page-level access
- **System User Token** - Long-lived, for business integrations (RECOMMENDED)

**Recommended: System User Token**
```
1. Go to Business Settings → System Users
2. Create system user with "Admin" role
3. Assign assets (Pixel, Ad Account, Pages)
4. Generate token with permissions:
   - ads_read
   - ads_management
   - business_management
   - pages_read_engagement
   - pages_manage_metadata
```

### **Option 2: Proxy via Your Meta App**

If you built a separate Meta integration app to abstract credentials:

```json
{
  "proxy_url": "https://your-meta-app.vercel.app/api/health",
  "api_key": "your-internal-api-key"
}
```

**Proxy Endpoints Needed:**
- `GET /api/health` - Returns Meta API health status
- `GET /api/metrics?from=&to=` - Returns aggregated metrics
- `POST /api/test-connection` - Validates credentials

---

## 📡 **Graph API Endpoints to Call**

### **1. Health Check**
```bash
# Basic ping - verify token and app
GET https://graph.facebook.com/v19.0/me
  ?access_token={token}
  &fields=id,name

# Response: 200 OK (healthy), 4xx/5xx (unhealthy)
```

### **2. App Info**
```bash
# Get app details and rate limits
GET https://graph.facebook.com/v19.0/{app_id}
  ?access_token={token}
  &fields=id,name,namespace,restrictions,usage

# Response includes:
# - usage.call_count: API calls made
# - usage.total_cputime: CPU time used
# - usage.total_time: Total time used
```

### **3. Rate Limits**
```bash
# Check current rate limit status
# Returned in response headers:
# X-Business-Use-Case-Usage: {"app_id":{call_count: 10, total_cputime: 25, total_time: 50}}
# X-App-Usage: {"call_count": 4, "total_time": 25, "total_cputime": 5}
```

### **4. Ads Metrics** (if using Ads API)
```bash
# Get ad account insights
GET https://graph.facebook.com/v19.0/{ad_account_id}/insights
  ?access_token={token}
  &time_range={"since":"2025-11-07","until":"2025-11-08"}
  &fields=spend,impressions,clicks,conversions,cpc,ctr,roas
  &level=account

# Response:
{
  "data": [{
    "spend": "150.50",
    "impressions": "12500",
    "clicks": "450",
    "conversions": "25",
    "cpc": "0.33",
    "ctr": "3.6",
    "roas": [{"action_type": "purchase", "value": "5.2"}]
  }]
}
```

### **5. Pixel Events** (if using Conversions API)
```bash
# Get pixel stats
GET https://graph.facebook.com/v19.0/{pixel_id}
  ?access_token={token}
  &fields=id,name,last_fired_time,is_unavailable

# Server-Side Events API health
# (No direct "list events" endpoint - rely on your own logging)
# Track via your backend when you POST to:
POST https://graph.facebook.com/v19.0/{pixel_id}/events
  ?access_token={token}
```

### **6. Webhooks Status**
```bash
# Get webhook subscriptions
GET https://graph.facebook.com/v19.0/{app_id}/subscriptions
  ?access_token={token}

# Response:
{
  "data": [{
    "object": "page",
    "callback_url": "https://your-app.com/webhooks/meta",
    "fields": ["messages", "messaging_postbacks"],
    "active": true
  }]
}
```

---

## 🏗️ **Integration Architecture**

### **Adapter Structure**

```typescript
// lib/dashboard/adapters/meta-adapter.ts
export class MetaAdapter extends BaseServiceAdapter {
  readonly service = 'meta';

  // 1. Health check - ping Graph API
  protected async checkHealth(account: IntegrationAccount): Promise<void> {
    const config = account.auth_json as MetaConfig;
    
    // Option A: Direct Graph API
    await this.fetchApi(
      `https://graph.facebook.com/v19.0/me`,
      { method: 'GET' },
      { /* no Authorization header, use query param */ },
      `?access_token=${config.access_token}`
    );
    
    // Option B: Proxy
    await this.fetchApi(
      `${config.proxy_url}/health`,
      { method: 'GET' },
      { 'X-API-Key': config.api_key }
    );
  }

  // 2. Fetch metrics
  async fetchMetrics(account, from, to): Promise<MetricPoint[]> {
    // Return array of metric points for dashboard charts
    // Examples:
    // - meta.api.latency_p95
    // - meta.ads.spend_24h
    // - meta.pixel.events_sent
    // - meta.webhooks.received
  }
}
```

### **Database Schema**

**Table: `integration_accounts`**
```sql
-- Already exists, just insert a row:
INSERT INTO integration_accounts (
  workspace_id,
  service,
  auth_json,  -- Encrypted credentials
  scopes,
  is_active,
  last_refresh
) VALUES (
  '{your-workspace-id}',
  'meta',
  '{"app_id":"...","app_secret":"...","access_token":"..."}',
  ARRAY['ads_read', 'pages_read_engagement'],
  true,
  NOW()
);
```

**Table: `service_status`**
```sql
-- Auto-populated by health-check cron
-- Example row after health check:
{
  workspace_id: '{workspace-id}',
  service: 'meta',
  status: 'UP',
  latency_ms: 125,
  last_success: '2025-11-08T20:30:00Z',
  last_check: '2025-11-08T20:30:00Z',
  message: 'Graph API v19.0 responding',
  error_details: null
}
```

---

## 🔧 **Implementation Checklist**

### **Phase 1: Basic Health Check** (30 mins)
- [ ] Create `meta-adapter.ts` with Graph API ping
- [ ] Register in `adapter-registry.ts`
- [ ] Add `integration_accounts` row with credentials
- [ ] Test: `GET /api/integrations/health?services=meta`
- [ ] Verify dashboard shows "UP" status

### **Phase 2: Rate Limits** (20 mins)
- [ ] Parse `X-App-Usage` header from Graph API responses
- [ ] Store in `service_status.error_details.rate_limit`
- [ ] Display on dashboard: "Calls remaining: 450/600"

### **Phase 3: Ads Metrics** (1 hour)
- [ ] If using Ads API, fetch account insights
- [ ] Metrics: spend, impressions, clicks, conversions, CPC, ROAS
- [ ] Store in metric points array
- [ ] Create dashboard widget for ad spend chart

### **Phase 4: Pixel Events** (1 hour)
- [ ] Track server-side events sent (from your backend)
- [ ] Log to `posthog_events_cache` or custom `pixel_events_log` table
- [ ] Aggregate: events sent/24h, event types, match quality
- [ ] Display on dashboard

### **Phase 5: Webhooks** (30 mins)
- [ ] Query `/subscriptions` endpoint
- [ ] Check `active` status
- [ ] Count events received (from your webhook handler logs)
- [ ] Display: subscriptions count, last event received

---

## 🧪 **Testing Strategy**

### **1. Health Check Test**
```typescript
// Test valid token
const health = await metaAdapter.fetchHealth({
  auth_json: { access_token: 'valid_token' }
});
expect(health.status).toBe('UP');

// Test invalid token
const badHealth = await metaAdapter.fetchHealth({
  auth_json: { access_token: 'invalid' }
});
expect(badHealth.status).toBe('DOWN');
```

### **2. Rate Limit Parsing**
```typescript
// Mock Graph API response with headers
const mockResponse = {
  headers: {
    'X-App-Usage': '{"call_count": 450, "total_time": 25}'
  }
};
const rateLimit = parseRateLimit(mockResponse);
expect(rateLimit.calls_remaining).toBe(150); // 600 - 450
```

### **3. Metrics Aggregation**
```typescript
// Fetch last 24h ad spend
const metrics = await metaAdapter.fetchMetrics(account, dayAgo, now);
const spendMetric = metrics.find(m => m.metric_name === 'meta.ads.spend');
expect(spendMetric.value).toBeGreaterThan(0);
```

---

## 📝 **Credentials Setup Guide**

### **Step 1: Get System User Token (Recommended)**

1. Go to **Meta Business Suite**: https://business.facebook.com
2. Navigate to **Business Settings** → **Users** → **System Users**
3. Click **Add** → Create system user (name: "CRM Dashboard Monitor")
4. Assign **Admin** role
5. Click **Generate New Token**
6. Select **App** (your Meta app)
7. Select **Permissions**:
   - `ads_read` (if monitoring ads)
   - `ads_management` (if managing ads)
   - `business_management` (for business assets)
   - `pages_read_engagement` (if monitoring pages)
8. Copy token (starts with `EAA...`) - this is long-lived (60+ days)
9. **Store securely** in `integration_accounts.auth_json`

### **Step 2: Get App Credentials**

1. Go to **Meta for Developers**: https://developers.facebook.com/apps
2. Select your app
3. **App ID**: Top of page (e.g., `1234567890`)
4. **App Secret**: Settings → Basic → Show (click "Show" button)
5. Copy both to `auth_json`

### **Step 3: Get Ad Account ID** (if using Ads)

1. Go to **Ads Manager**: https://adsmanager.facebook.com
2. URL will show: `...?act=1234567890`
3. Ad Account ID = `act_1234567890` (include "act_" prefix)

### **Step 4: Get Pixel ID** (if tracking conversions)

1. Go to **Events Manager**: https://business.facebook.com/events_manager
2. Select your Pixel
3. Pixel ID shown at top (e.g., `1234567890`)

---

## 🚀 **Production Deployment**

### **Environment Variables** (Vercel)
```bash
# Option 1: Direct Graph API
META_APP_ID=1234567890
META_APP_SECRET=abc123xyz...
META_ACCESS_TOKEN=EAA...  # Long-lived system user token

# Optional
META_AD_ACCOUNT_ID=act_1234567890
META_PIXEL_ID=1234567890
META_BUSINESS_ID=1234567890

# Option 2: Proxy
META_PROXY_URL=https://your-meta-app.vercel.app
META_API_KEY=your-internal-key
```

### **Security Best Practices**
1. ✅ Use **System User Token** (long-lived, business-scoped)
2. ✅ Store tokens in `integration_accounts.auth_json` (encrypted at rest)
3. ✅ Never commit tokens to git
4. ✅ Rotate tokens every 60 days (before expiry)
5. ✅ Use least-privilege permissions (only what's needed)
6. ✅ Monitor token usage via Graph API headers
7. ✅ Set up alerts for token expiry

---

## 📊 **Example Dashboard Widget**

```typescript
// Dashboard shows Meta status tile:
{
  title: "Meta (Facebook)",
  status: "UP",
  latency: "125ms",
  lastCheck: "2 minutes ago",
  metrics: [
    { label: "Ad Spend (24h)", value: "$150.50", trend: "+12%" },
    { label: "Conversions", value: "25", trend: "+8%" },
    { label: "API Calls", value: "450/600", trend: "75% used" },
    { label: "Pixel Events", value: "1,240", trend: "+5%" }
  ],
  actions: [
    { label: "Refresh", onClick: () => triggerHealthCheck() },
    { label: "View Details", href: "/dashboard/integrations/meta" }
  ]
}
```

---

## 🔗 **Useful Links**

- **Graph API Explorer**: https://developers.facebook.com/tools/explorer
- **Business Manager**: https://business.facebook.com
- **Ads Manager**: https://adsmanager.facebook.com
- **Events Manager** (Pixel): https://business.facebook.com/events_manager
- **Graph API Docs**: https://developers.facebook.com/docs/graph-api
- **Marketing API Docs**: https://developers.facebook.com/docs/marketing-apis
- **Conversions API Docs**: https://developers.facebook.com/docs/marketing-api/conversions-api
- **Webhooks Docs**: https://developers.facebook.com/docs/graph-api/webhooks

---

## ❓ **FAQ**

**Q: Should I use app token or user token?**  
A: Use **System User Token** for production. It's long-lived (60+ days) and business-scoped.

**Q: How do I refresh expired tokens?**  
A: System user tokens last 60+ days. Set up a cron to refresh 7 days before expiry using the token exchange endpoint.

**Q: What if I don't have an Ad Account?**  
A: Skip ads metrics. Just monitor API health, rate limits, and pixel events.

**Q: Can I test without a real Meta app?**  
A: Yes, use Graph API Explorer with a test app and sandbox mode.

**Q: How do I track pixel events?**  
A: Log every POST to Conversions API in your backend, then aggregate counts.

---

## ✅ **Next Steps**

1. **Decide approach**: Direct Graph API or Proxy?
2. **Get credentials**: System user token, app ID/secret
3. **Create adapter**: `meta-adapter.ts`
4. **Insert integration row**: `integration_accounts`
5. **Test health check**: `GET /api/integrations/health?services=meta`
6. **Verify dashboard**: Status tile shows "UP"
7. **Add metrics**: Ads, pixel, webhooks (optional)

Ready to implement? 🚀
