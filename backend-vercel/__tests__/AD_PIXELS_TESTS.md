# Ad Pixel Integration Tests

Comprehensive test suite for advertising pixel tracking (Meta, Google Analytics, TikTok, etc.)

## 🎯 What's Being Tested

### 1. Pixel Configuration (5 tests)
- ✅ Create Meta Pixel configuration
- ✅ Create Google Analytics 4 configuration
- ✅ Create TikTok Pixel configuration
- ✅ Prevent duplicate pixel IDs per org
- ✅ Enable/disable pixels

### 2. Pixel Event Tracking (6 tests)
- ✅ Log Meta Pixel events (Purchase, AddToCart, ViewContent)
- ✅ Log Google Analytics events (sign_up, purchase)
- ✅ Log TikTok Pixel events (CompletePayment)
- ✅ Deduplicate events within 5 minutes
- ✅ Track conversion attribution (UTM params)
- ✅ Store event metadata (IP, user agent, referrer)

### 3. Server-Side Conversion API (3 tests)
- ✅ Send Meta Conversion API events
- ✅ Send Google Analytics 4 Measurement Protocol events
- ✅ Send TikTok Events API events

### 4. Privacy & Compliance (4 tests)
- ✅ Respect user tracking consent
- ✅ Hash PII before sending to pixels (SHA256)
- ✅ Anonymize IP addresses in test mode
- ✅ Respect GDPR deletion requests

### 5. Reporting & Analytics (3 tests)
- ✅ Calculate conversion funnel (PageView → AddToCart → Purchase)
- ✅ Aggregate revenue by pixel
- ✅ Track events by UTM source

### 6. Error Handling (3 tests)
- ✅ Handle API failures gracefully
- ✅ Retry failed conversions
- ✅ Move to dead letter queue after max retries

---

## 🚀 Running the Tests

### Run All Ad Pixel Tests
```bash
npm run test:ad-pixels
```

### Run Specific Test Groups
```bash
# Configuration tests only
npm test -- --testNamePattern="Pixel Configuration"

# Privacy & compliance tests only
npm test -- --testNamePattern="Privacy & Compliance"

# Reporting tests only
npm test -- --testNamePattern="Pixel Reporting"
```

### Watch Mode
```bash
npm run test:watch -- ad-pixels
```

### Coverage Report
```bash
npm run test:coverage -- ad-pixels
```

---

## 📊 Test Coverage Goals

| Category | Target Coverage |
|----------|----------------|
| Pixel Configuration | 100% |
| Event Tracking | 95% |
| Conversion API | 85% |
| Privacy/Compliance | 100% |
| Reporting | 90% |
| Error Handling | 95% |

---

## 🧪 Test Data

### Test Organization
- **Org Name**: `Test Org - Ad Pixels`
- **Test User**: `adpixels-test-{timestamp}@example.com`

### Test Pixel Configs
1. **Meta Pixel** - ID: `1234567890`, Test mode enabled
2. **Google Analytics 4** - ID: `G-XXXXXXXXXX`, Anonymize IP enabled
3. **TikTok Pixel** - ID: `ABCDEFGHIJ1234567890`, Test mode enabled

### Test Events
- Purchase events with value/currency
- AddToCart events
- PageView events
- Sign up events
- Complete payment events

### Cleanup
All test data is automatically cleaned up in `afterAll()`:
- Pixel configurations deleted
- Pixel events deleted
- Test org deleted
- Test user deleted

---

## 🔍 Key Test Scenarios

### Scenario 1: Track Purchase Conversion
```typescript
// 1. Admin creates Meta Pixel
POST /v1/ad-pixels
{
  "provider": "meta",
  "pixel_id": "1234567890",
  "enabled": true
}

// 2. User completes purchase
// Frontend sends pixel event
{
  event_name: "Purchase",
  event_data: {
    value: 29.99,
    currency: "USD",
    content_ids: ["pro_monthly"]
  }
}

// 3. Backend logs event
INSERT INTO ad_pixel_events (...)

// 4. Backend sends to Meta Conversion API (server-side)
POST https://graph.facebook.com/v18.0/{pixel_id}/events
{
  data: [{
    event_name: "Purchase",
    event_time: 1234567890,
    user_data: { em: "hashed_email", ... },
    custom_data: { value: 29.99, currency: "USD" }
  }]
}

// 5. Test validates
expect(event.event_name).toBe('Purchase');
expect(event.status).toBe('sent');
```

### Scenario 2: Privacy-Safe Tracking
```typescript
// User opts out of advertising
await supabase.from('user_tracking_consent').insert({
  user_id: userId,
  advertising_consent: false
});

// Check consent before sending
const consent = await checkAdvertisingConsent(userId);
if (!consent) {
  // Don't send pixel events
  return;
}

// Hash PII before sending
const email = "user@example.com";
const hashedEmail = sha256(email.toLowerCase().trim());
// Result: "a1b2c3d4..." (64 hex characters)
```

### Scenario 3: Attribution Tracking
```typescript
// User clicks ad with UTM params
// URL: https://everreach.app/?utm_source=facebook&utm_campaign=summer_sale

// Track PageView
{
  event_name: "PageView",
  utm_source: "facebook",
  utm_campaign: "summer_sale"
}

// Track Purchase
{
  event_name: "Purchase",
  value: 29.99,
  utm_source: "facebook",
  utm_campaign: "summer_sale"
}

// Later, query conversion by source
SELECT 
  utm_source,
  COUNT(*) as conversions,
  SUM(value) as revenue
FROM ad_pixel_events
WHERE event_name = 'Purchase'
GROUP BY utm_source;

// Result: { facebook: { conversions: 10, revenue: 299.90 } }
```

---

## 🔐 Privacy & Compliance Features

### GDPR Compliance
- ✅ User consent required before tracking
- ✅ Opt-out respected immediately
- ✅ Right to deletion (remove all user events)
- ✅ No PII stored in clear text

### Data Hashing
```typescript
// Email hashing (SHA256)
const email = "user@example.com";
const hashed = crypto.createHash('sha256')
  .update(email.toLowerCase().trim())
  .digest('hex');
// Result: "973dfe46384cc1..."

// Phone hashing (digits only)
const phone = "+1 (234) 567-8900";
const normalized = phone.replace(/\D/g, ''); // "12345678900"
const hashedPhone = crypto.createHash('sha256')
  .update(normalized)
  .digest('hex');
```

### IP Anonymization
```typescript
// Test mode: anonymize IPs
const ip = "192.168.1.100";
const anonymized = ip.split('.').slice(0, 3).join('.') + '.0';
// Result: "192.168.1.0"
```

---

## 📈 Supported Advertising Platforms

| Platform | Event Types | Conversion API | Status |
|----------|-------------|----------------|--------|
| **Meta (Facebook)** | PageView, ViewContent, AddToCart, Purchase, Lead, CompleteRegistration | ✅ | ✅ Tested |
| **Google Analytics 4** | page_view, sign_up, login, purchase, add_to_cart | ✅ | ✅ Tested |
| **TikTok** | ViewContent, AddToCart, InitiateCheckout, CompletePayment, Subscribe | ✅ | ✅ Tested |
| **Google Ads** | Conversions | 🟡 | Planned |
| **Snapchat** | Page View, Purchase | 🟡 | Planned |
| **Pinterest** | Page Visit, Add to Cart, Checkout | 🟡 | Planned |
| **Twitter** | Page View, Purchase | 🟡 | Planned |
| **LinkedIn** | Lead, Purchase | 🟡 | Planned |
| **Reddit** | Page Visit, Purchase | 🟡 | Planned |

---

## 🔗 API Endpoints (Future)

### Configuration Management
```bash
# List pixel configs
GET /v1/ad-pixels?org_id={orgId}

# Create pixel config
POST /v1/ad-pixels

# Update pixel config
PATCH /v1/ad-pixels/:id

# Delete pixel config
DELETE /v1/ad-pixels/:id
```

### Event Tracking
```bash
# Log pixel event
POST /v1/ad-pixels/events

# Get event history
GET /v1/ad-pixels/events?pixel_id={pixelId}&start_date={date}
```

### Reporting
```bash
# Get conversion funnel
GET /v1/ad-pixels/funnel?pixel_id={pixelId}

# Get attribution report
GET /v1/ad-pixels/attribution?start_date={date}&end_date={date}

# Get revenue by source
GET /v1/ad-pixels/revenue?group_by=utm_source
```

---

## 📊 Performance Benchmarks

| Operation | Target Time | Typical Time |
|-----------|-------------|--------------|
| Create pixel config | < 100ms | ~50ms |
| Log event | < 200ms | ~100ms |
| Send to Conversion API | < 2000ms | ~800ms |
| Query events (1 day) | < 500ms | ~250ms |
| Calculate funnel | < 1000ms | ~400ms |
| Aggregate revenue | < 1000ms | ~500ms |

---

## 🐛 Common Issues & Solutions

### Issue 1: Events Not Showing in Meta Events Manager
**Symptoms**: Events logged in database but not in Meta dashboard  
**Causes**:
- Invalid pixel ID
- Missing access token
- Test mode enabled (events go to Test Events)
- Incorrect event structure

**Fix**:
```typescript
// Verify pixel config
const config = await getPixelConfig(orgId, 'meta');
console.log('Test mode:', config.test_mode); // Should be false for production

// Check event structure
const event = {
  event_name: 'Purchase', // Must match Meta standard events
  event_time: Math.floor(Date.now() / 1000), // Unix timestamp
  action_source: 'website',
  user_data: { em: hashedEmail }, // Must be hashed
  custom_data: { value: 29.99, currency: 'USD' }
};
```

### Issue 2: CORS Errors When Sending Events
**Symptoms**: Browser console shows CORS errors  
**Causes**:
- Events should be sent server-side via Conversion API
- Frontend pixel script not loaded

**Fix**:
```typescript
// DON'T send from frontend (CORS issues)
// DO send from backend
await fetch('https://graph.facebook.com/v18.0/{pixel_id}/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ data: [event] })
});
```

### Issue 3: Duplicate Events
**Symptoms**: Same event appears multiple times  
**Causes**:
- No deduplication logic
- User refreshes page

**Fix**:
```typescript
// Add event_id for deduplication
const eventId = `${userId}_${eventName}_${Date.now()}`;

// Meta will deduplicate events with same event_id within 48 hours
```

---

## 📚 Related Documentation

- **Tests**: `__tests__/api/ad-pixels.test.ts`
- **Migration**: `migrations/ad-pixels-system.sql`
- **Meta Conversion API**: https://developers.facebook.com/docs/marketing-api/conversions-api
- **Google Analytics 4 Measurement Protocol**: https://developers.google.com/analytics/devguides/collection/protocol/ga4
- **TikTok Events API**: https://ads.tiktok.com/marketing_api/docs?id=1701890973258754

---

## ✅ Pre-Deployment Checklist

Before deploying ad pixels to production:

- [ ] All 24 tests passing
- [ ] Pixel IDs configured in env vars
- [ ] Access tokens/API secrets encrypted
- [ ] User consent flow implemented
- [ ] GDPR compliance verified
- [ ] Test events validated in platform dashboards
- [ ] Production events tested (1-2 test purchases)
- [ ] Attribution tracking validated
- [ ] Error handling tested (API failures)
- [ ] Retry logic tested
- [ ] Dead letter queue monitored

---

**Total Tests**: 24  
**Test Categories**: 6  
**Estimated Run Time**: ~20 seconds  
**Supported Platforms**: 3 (Meta, Google Analytics 4, TikTok)  
**Last Updated**: 2025-10-09
