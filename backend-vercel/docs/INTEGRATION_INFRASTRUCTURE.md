# Universal Integration Infrastructure

Complete foundation for adding ANY external integration (Flodesk, Klaviyo, Twilio, Slack, etc.) with reliability, rate limiting, and compliance built-in.

## 🎯 What This Solves

Before building provider-specific integrations, we need:
- ✅ OAuth token management (encrypted, auto-refresh)
- ✅ Webhook signature verification (multi-provider)
- ✅ CloudEvents normalization (standard format)
- ✅ Deduplication (prevent duplicate processing)
- ✅ Rate limiting (respect provider limits)
- ✅ Retry logic (exponential backoff + jitter)
- ✅ Human-in-the-loop approvals (Slack reviews)
- ✅ Consent tracking (GDPR/compliance)
- ✅ Deliverability (SPF/DKIM/DMARC)
- ✅ Audit logging (without PII leaks)

## 📦 What's Included

### 1. Database Schema (`integration-infrastructure.sql`)
**10 Core Tables:**
- `integration_accounts` - OAuth tokens & API keys (encrypted)
- `integration_webhooks` - Webhook configuration & secrets
- `integration_events` - Inbound events (CloudEvents format)
- `integration_outbox` - Outbound jobs (transactional outbox pattern)
- `integration_rate_limits` - Provider-specific limits
- `contact_consents` - Channel-level consent tracking
- `contact_unsubscribes` - Unsubscribe management
- `integration_approvals` - Human approval queue
- `integration_logs` - Audit trail (no PII)
- `email_sending_config` - SPF/DKIM/DMARC config

**Pre-seeded with 10 providers:**
- Resend, Klaviyo, Twilio, WhatsApp, Mailchimp
- SendGrid, Slack, Instagram, Google Calendar, Microsoft Graph

### 2. Webhook Gateway (`lib/integrations/webhook-gateway.ts`)
**Universal webhook handler** that works with ANY provider:

```typescript
// Single endpoint handles all providers
POST /api/webhooks/{provider}

// Automatic:
// 1. Signature verification (Stripe, Slack, GitHub, etc.)
// 2. Timestamp validation (prevent replay attacks)
// 3. CloudEvents normalization
// 4. Deduplication (idempotency)
// 5. Storage + async processing trigger
```

**Supported signature methods:**
- ✅ Stripe (t=timestamp,v1=signature)
- ✅ Slack (v0=signature with timestamp)
- ✅ GitHub (sha256=signature)
- ✅ Twilio (URL + params signature)
- ✅ Generic HMAC (sha256, sha1, sha512)

### 3. Outbox Worker (`lib/integrations/outbox-worker.ts`)
**Reliable message sending** with rate limiting:

```typescript
// Processes outbound jobs with:
// - Token bucket rate limiting
// - Exponential backoff retry
// - Idempotency keys
// - Dead letter queue (max attempts)
// - Priority queues
// - Approval gates

processOutbox({ 
  batchSize: 50,
  maxConcurrent: 10,
  provider: 'klaviyo' // optional
});
```

**Retry logic:**
- Exponential backoff: 2^attempts seconds
- Jitter: ±25% to prevent thundering herd
- Max delay: 1 hour
- Retry on: 5xx, 429, network errors
- Don't retry: 4xx (except 429)

---

## 🚀 Quick Start (Before Adding Any Provider)

### Step 1: Run Migration
```bash
# From backend-vercel directory
psql $DATABASE_URL -f migrations/integration-infrastructure.sql

# Or via Supabase dashboard: SQL Editor → paste → run
```

### Step 2: Configure Webhook Endpoint
```typescript
// Example: Add Klaviyo webhook
INSERT INTO integration_webhooks (
  provider,
  webhook_url,
  secret_enc, -- Encrypted in production!
  signature_header,
  signature_algorithm,
  events,
  enabled
) VALUES (
  'klaviyo',
  'https://your-domain.vercel.app/api/webhooks/klaviyo',
  'YOUR_WEBHOOK_SECRET',
  'X-Klaviyo-Signature',
  'sha256',
  ARRAY['email.sent', 'email.opened', 'email.clicked'],
  true
);
```

### Step 3: Set Up Universal Webhook Route
```typescript
// app/api/webhooks/[provider]/route.ts
import { handleWebhook } from '@/lib/integrations/webhook-gateway';

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const ipAddress = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip');

  const result = await handleWebhook({
    provider: params.provider,
    body,
    headers,
    ipAddress: ipAddress || undefined,
  });

  if (!result.success) {
    return Response.json({ error: result.error }, { status: 400 });
  }

  return Response.json({ received: true, eventId: result.eventId });
}
```

### Step 4: Start Outbox Worker (Cron)
```typescript
// app/api/cron/process-outbox/route.ts
import { processOutbox } from '@/lib/integrations/outbox-worker';

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await processOutbox({
    batchSize: 100,
    maxConcurrent: 20,
  });

  return Response.json(result);
}
```

**Add to `vercel.json`:**
```json
{
  "crons": [
    {
      "path": "/api/cron/process-outbox",
      "schedule": "* * * * *"
    }
  ]
}
```

---

## 🔐 Security Best Practices

### 1. Encrypt Secrets at Rest
```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

export function decrypt(text: string): string {
  const parts = text.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encryptedText = parts[1];
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### 2. Verify ALL Webhook Signatures
Never skip signature verification - prevents:
- Spoofed events
- Replay attacks
- Man-in-the-middle attacks

### 3. Audit Log Without PII
```typescript
// ✅ Good: Log without PII
await supabase.from('integration_logs').insert({
  provider: 'klaviyo',
  action: 'send_email',
  details: {
    contact_id: contactId,
    campaign_id: campaignId,
    email_length: email.body.length, // Derived metric
    has_link: email.body.includes('http'), // Boolean
  },
  success: true,
});

// ❌ Bad: PII in logs
await supabase.from('integration_logs').insert({
  details: {
    email: 'john@example.com', // PII!
    message: 'Hi John, ...', // PII!
  },
});
```

### 4. Respect Consent Before Sending
```typescript
// Check consent before queuing message
const canSend = await supabase.rpc('can_send_to_contact', {
  p_contact_id: contactId,
  p_channel: 'email',
  p_campaign_type: 'marketing',
});

if (!canSend.data) {
  throw new Error('No consent to send on this channel');
}
```

---

## 📊 Rate Limiting Guide

### Provider-Specific Limits (Pre-configured)

| Provider | Limit | Notes |
|----------|-------|-------|
| **Resend** | 2 req/s | Hard limit, queue required |
| **Klaviyo** | Headers | Check `X-RateLimit-Remaining` |
| **Twilio** | Account | Depends on brand trust score |
| **WhatsApp** | 80 msg/s/number | Auto-upgrade to 1000 possible |
| **Mailchimp** | Per-key | Varies by plan |
| **SendGrid** | Plan-based | Check docs for your tier |
| **Slack** | 20+ rpm | Most methods, tier-based |
| **Instagram** | 300 calls/s | Per professional account |
| **Google Calendar** | Quota | Standard API quotas |
| **Microsoft Graph** | Resource | Complex throttling rules |

### Rate Limit Strategy

**Token Bucket Algorithm:**
```typescript
// Each provider gets a bucket with tokens
// Tokens refill at provider's rate limit
// Each request consumes 1+ tokens

// Example: Resend (2 req/s)
bucket = {
  tokens: 4,              // Current tokens (burst capacity)
  lastRefill: timestamp,
  config: {
    requests_per_second: 2,
    burst_size: 4,        // Allow 2x burst
  }
}

// On request:
if (bucket.tokens >= 1) {
  bucket.tokens -= 1;
  // Send request
} else {
  // Rate limited, retry later
}

// Refill continuously:
elapsed = now - lastRefill;
bucket.tokens = min(
  bucket.tokens + (elapsed * requests_per_second),
  burst_size
);
```

**Production: Use Redis**
```typescript
// Upstash Redis example
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
});

async function checkRateLimit(bucket: string, cost: number = 1): Promise<boolean> {
  const script = `
    local key = KEYS[1]
    local rate = tonumber(ARGV[1])
    local burst = tonumber(ARGV[2])
    local cost = tonumber(ARGV[3])
    local now = tonumber(ARGV[4])
    
    -- Get current state
    local state = redis.call('HMGET', key, 'tokens', 'last_refill')
    local tokens = tonumber(state[1]) or burst
    local last_refill = tonumber(state[2]) or now
    
    -- Refill
    local elapsed = now - last_refill
    tokens = math.min(tokens + (elapsed * rate), burst)
    
    -- Check availability
    if tokens >= cost then
      tokens = tokens - cost
      redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
      redis.call('EXPIRE', key, 3600)
      return 1
    else
      return 0
    end
  `;

  const result = await redis.eval(script, ['rate_limit:' + bucket], [
    '2',      // rate (tokens/sec)
    '4',      // burst
    cost.toString(),
    Date.now().toString(),
  ]);

  return result === 1;
}
```

---

## 📧 Email Deliverability Setup

### Before Sending ANY Emails

**1. Configure DNS Records:**
```dns
# SPF (allow your provider to send)
TXT @ "v=spf1 include:_spf.google.com include:sendgrid.net ~all"

# DKIM (sign your emails)
TXT default._domainkey "v=DKIM1; k=rsa; p=YOUR_PUBLIC_KEY"

# DMARC (policy for failures)
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com"
```

**2. Add One-Click Unsubscribe Header:**
```typescript
// Required by Gmail/Yahoo (2024+)
headers: {
  'List-Unsubscribe': '<https://yourdomain.com/unsubscribe?token=XXX>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```

**3. Monitor Metrics:**
- Spam rate < 0.3%
- Bounce rate < 2%
- Complaint rate < 0.1%

---

## 🧪 Testing Webhooks Locally

### 1. Use ngrok or Cloudflare Tunnel
```bash
# Expose local server
ngrok http 3001

# Configure webhook URL in provider dashboard
https://abc123.ngrok.io/api/webhooks/klaviyo
```

### 2. Replay Webhooks from Database
```typescript
// Fetch failed webhook
const { data: event } = await supabase
  .from('integration_events')
  .select('*')
  .eq('status', 'failed')
  .single();

// Replay
await handleWebhook({
  provider: event.provider,
  body: event.raw_body,
  headers: event.raw_headers,
});
```

### 3. Mock Webhook Payloads
```typescript
// Create test fixtures
// __tests__/fixtures/webhooks/klaviyo-email-sent.json
{
  "id": "evt_test_123",
  "type": "email.sent",
  "timestamp": "2025-10-09T23:00:00Z",
  "data": {
    "email": "test@example.com",
    "campaign_id": "camp_123"
  }
}
```

---

## 🎯 Integration Roadmap (90 Days)

### Phase 1: Core Outbound + Approvals (Weeks 1-4)

**Week 1: Email Foundation**
- [ ] Integrate Resend (transactional)
- [ ] Configure SPF/DKIM/DMARC
- [ ] Implement send queue with 2 req/s rate limit
- [ ] Test: Password resets, receipts

**Week 2: Marketing Email**
- [ ] Integrate Klaviyo or Mailchimp
- [ ] Sync contact segments
- [ ] Create campaign templates
- [ ] Test: Newsletter, drip campaigns

**Week 3: SMS + WhatsApp**
- [ ] Integrate Twilio SMS
- [ ] Set up A2P 10DLC registration UI
- [ ] Integrate WhatsApp Cloud API
- [ ] Create message templates
- [ ] Test: 1:1 nudges, confirmations

**Week 4: Approval System**
- [ ] Slack approval queue
- [ ] Interactive buttons (Approve/Deny)
- [ ] Preview generation
- [ ] Test: Bulk send approval flow

### Phase 2: Social + Calendar (Weeks 5-8)

**Week 5: Instagram DMs**
- [ ] Integrate Instagram Messaging API
- [ ] Webhook receiver for replies
- [ ] Rate limit handling (300 calls/s)
- [ ] Test: DM automation

**Week 6: Calendar Nudges**
- [ ] Google Calendar watch channels
- [ ] Microsoft Graph calendar integration
- [ ] Post-meeting follow-up automation
- [ ] Test: Auto-nudge after calls

**Week 7: Enrichment**
- [ ] Clearbit/PDL integration
- [ ] Auto-update contact profiles
- [ ] Warmth score enhancement
- [ ] Test: New contact enrichment

**Week 8: Testing & Monitoring**
- [ ] Write integration tests
- [ ] Set up error monitoring (Sentry)
- [ ] Dashboard for outbox stats
- [ ] Load testing

### Phase 3: Advanced Features (Weeks 9-12)

**Week 9: Audience Sync**
- [ ] Meta Custom Audiences API
- [ ] Google Ads Customer Match
- [ ] Sync CRM segments
- [ ] Test: Retargeting campaigns

**Week 10: Advanced Automation**
- [ ] Warmth decay triggers
- [ ] Multi-channel sequences
- [ ] A/B testing framework
- [ ] Test: Automated nurture flows

**Week 11: Compliance & Reporting**
- [ ] Consent management UI
- [ ] Unsubscribe preference center
- [ ] GDPR data export
- [ ] Deliverability reports

**Week 12: Performance & Scale**
- [ ] Redis rate limiting
- [ ] Job queue optimization
- [ ] Webhook replay system
- [ ] Load balancing

---

## 📚 Next Steps

1. **Run the migration** (`integration-infrastructure.sql`)
2. **Set up universal webhook** (`/api/webhooks/[provider]/route.ts`)
3. **Start outbox worker** (cron job every minute)
4. **Pick first provider** (recommend: Resend + Slack)
5. **Test end-to-end** (send → receive webhook → process)

## 🔗 Related Files

- Migration: `migrations/integration-infrastructure.sql`
- Webhook Gateway: `lib/integrations/webhook-gateway.ts`
- Outbox Worker: `lib/integrations/outbox-worker.ts`
- Provider Configs: `integration_rate_limits` table

---

**Ready to add your first integration!** Start with Resend (simple, reliable) + Slack (approvals). Then layer on Klaviyo/Mailchimp → Twilio → WhatsApp.

Last Updated: 2025-10-09
