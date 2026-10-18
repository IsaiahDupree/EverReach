# Unified Events Tracking System - Implementation Plan

**Goal**: Single source of truth for all analytics events from all platforms, displayed on Developer Dashboard.

---

## 📋 Overview

**Event Sources**:
- ✅ App events (Expo RN)
- ⏳ Superwall (paywall events)
- ⏳ RevenueCat (subscription webhooks)
- ⏳ Stripe (web billing webhooks)
- ⏳ Apple App Store Server Notifications
- ⏳ Google Play RTDN
- ⏳ Facebook Ads (cron sync)

**Architecture**:
```
All Sources → /api/events/ingest → Supabase events table → Developer Dashboard
```

---

## 🎯 Implementation Phases

### **Phase 1: Core Infrastructure** (Week 1)

#### 1.1 Database Schema
- [ ] Create `events` table with all fields
- [ ] Add `event_source` enum (app, superwall, revenuecat, stripe, apple, google, facebook_ads)
- [ ] Add `event_category` enum (ui, paywall, billing, lifecycle, ads, error)
- [ ] Create indexes (time, source, user_id, session_id)
- [ ] Create `events_7d` view (7-day counts by name/source)
- [ ] Create `revenue_rollups` view (daily revenue aggregations)

#### 1.2 Ingest API
- [ ] Create POST `/api/events/ingest` endpoint
- [ ] Add `x-ingest-key` authentication
- [ ] Implement idempotency via `idempotency_key`
- [ ] Support batch event ingestion
- [ ] Add validation for event schema

---

### **Phase 2: Platform Integrations** (Week 2)

#### 2.1 RevenueCat Webhook
- [ ] Update existing `/api/billing/revenuecat/webhook` route
- [ ] Forward events to `/api/events/ingest` after processing
- [ ] Map RC event types to canonical names:
  - `INITIAL_PURCHASE` → `purchase_completed`
  - `RENEWAL` → `renewal`
  - `CANCELLATION` → `cancellation`
  - `BILLING_ISSUE` → `billing_issue`
  - `EXPIRATION` → `expired`
- [ ] Include revenue data (price_in_integration_currency_cents)
- [ ] Use idempotency_key from webhook

#### 2.2 Stripe Webhook
- [ ] Update `/api/webhooks/stripe` route
- [ ] Forward subscription events to `/api/events/ingest`
- [ ] Map Stripe events:
  - `checkout.session.completed` → `checkout_completed`
  - `customer.subscription.updated` → `subscription_updated`
  - `invoice.payment_failed` → `payment_failed`
- [ ] Use `event.id` as idempotency_key

#### 2.3 App Events (Expo RN)
- [ ] Create `lib/tracker.ts` client SDK
- [ ] Track session_id (UUID per session)
- [ ] Track anon_id (stable device ID)
- [ ] Implement `track()` function
- [ ] Call `/api/events/ingest` with batch support
- [ ] Add event buffering (flush every 10 events or 30s)

#### 2.4 Superwall Events
- [ ] Integrate Superwall delegate callbacks
- [ ] Track paywall lifecycle:
  - `paywall_opened`
  - `paywall_closed`
  - `purchase_started`
  - `purchase_completed`
  - `purchase_failed`
- [ ] Include placement, paywallId, variantId in payload

---

### **Phase 3: Additional Sources** (Week 3)

#### 3.1 Apple App Store Server Notifications v2
- [ ] Create `/api/webhooks/apple/assn` endpoint
- [ ] Verify JWS signature
- [ ] Parse notification types:
  - `DID_RENEW`
  - `EXPIRED`
  - `DID_CHANGE_RENEWAL_STATUS`
  - `REFUND`
- [ ] Use JWS `jti` as idempotency_key
- [ ] Forward to `/api/events/ingest`

#### 3.2 Google Play RTDN
- [ ] Create `/api/webhooks/google/rtdn` endpoint
- [ ] Set up Pub/Sub push subscription
- [ ] Verify JWT signature
- [ ] Parse subscription notifications
- [ ] Use `messageId` as idempotency_key
- [ ] Forward to `/api/events/ingest`

#### 3.3 Facebook Ads Sync (Cron)
- [ ] Create `/api/cron/fb-ads-sync` endpoint
- [ ] Configure Vercel Cron (daily at 2 AM)
- [ ] Fetch Insights API data:
  - Impressions
  - Clicks
  - Spend
  - Purchases (conversion tracking)
- [ ] Map to events:
  - `ad_impressions`
  - `ad_clicks`
  - `ad_spend`
  - `ad_purchase_attributed`
- [ ] Include campaign_id, adset_id, ad_id
- [ ] Use `${date}:${ad_id}:${metric}` as idempotency_key

---

### **Phase 4: Developer Dashboard** (Week 4)

#### 4.1 Dashboard UI
- [ ] Create `/devdash` page (Next.js server component)
- [ ] Add authentication (admin only)
- [ ] Display summary cards:
  - Total events (7d)
  - Total revenue (7d)
  - Top event name
  - Sources seen
- [ ] Display top events table (from `events_7d` view)
- [ ] Display recent events stream (last 100)
- [ ] Display revenue chart (from `revenue_rollups` view)

#### 4.2 Dashboard Filters
- [ ] Add date range picker
- [ ] Add source filter (dropdown)
- [ ] Add category filter
- [ ] Add event name search
- [ ] Add user_id filter
- [ ] Create `/api/devdash/query` endpoint for filtered data

#### 4.3 Real-time Updates
- [ ] Add Supabase Realtime subscription to `events` table
- [ ] Auto-refresh dashboard every 30s
- [ ] Show live event notifications
- [ ] Add "Export to CSV" button

---

### **Phase 5: Analytics & Tracking** (Week 5)

#### 5.1 App Event Taxonomy
- [ ] Track lifecycle events:
  - `app_opened`
  - `app_backgrounded`
  - `session_started`
  - `session_ended`
- [ ] Track onboarding events:
  - `first_onboarding_completed`
  - `second_onboarding_shown`
  - `second_onboarding_completed`
- [ ] Track trial UX:
  - `trial_banner_viewed`
  - `trial_cta_clicked`
- [ ] Track AI features:
  - `message_copied`
  - `message_liked`
  - `message_disliked`

#### 5.2 Attribution
- [ ] Capture UTM parameters on first app launch
- [ ] Persist UTM to local storage
- [ ] Include UTM in all subsequent events
- [ ] Track install attribution source
- [ ] Link ad_id to conversion events

#### 5.3 Funnel Analysis
- [ ] Create funnel views in Supabase:
  - Onboarding funnel
  - Trial → Paid conversion
  - Paywall → Purchase
- [ ] Add funnel visualization to dashboard
- [ ] Calculate drop-off rates

---

## 📁 File Structure

```
backend-vercel/
├── migrations/
│   └── 05_events_tracking_system.sql           # Events table + views
├── app/api/
│   ├── events/
│   │   └── ingest/route.ts                     # Main ingest endpoint
│   ├── billing/
│   │   └── revenuecat/webhook/route.ts         # Updated with event forwarding
│   ├── webhooks/
│   │   ├── stripe/route.ts                     # Updated with event forwarding
│   │   ├── apple/assn/route.ts                 # Apple notifications
│   │   └── google/rtdn/route.ts                # Google notifications
│   ├── cron/
│   │   └── fb-ads-sync/route.ts                # Facebook Ads sync
│   └── devdash/
│       ├── page.tsx                            # Dashboard UI
│       └── query/route.ts                      # Filtered query API
└── lib/
    └── events/
        ├── types.ts                            # TypeScript types
        ├── mapper.ts                           # Event name mappings
        └── validator.ts                        # Schema validation

expo-app/
└── src/lib/
    └── tracker.ts                              # Client SDK
```

---

## 🔒 Security Considerations

### Environment Variables

```env
# Ingest API
INGEST_SERVER_KEY=                  # Server-to-server auth
EXPO_PUBLIC_INGEST_PUBLIC_KEY=      # Client key (rate-limited)

# Facebook Ads
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
FACEBOOK_AD_ACCOUNT_ID=

# Apple ASSN
APPLE_ASSN_BUNDLE_ID=
APPLE_ASSN_SHARED_SECRET=

# Google RTDN
GOOGLE_PUBSUB_PROJECT_ID=
GOOGLE_PUBSUB_SUBSCRIPTION=

# Dashboard
DASHBOARD_ADMIN_PASSWORD=           # Simple auth for dashboard
```

### Rate Limiting

- `/api/events/ingest` with client key: 1000/hour per IP
- `/api/events/ingest` with server key: unlimited
- Dashboard: admin-only access

### Data Privacy

- No PII in event payloads (use hashed IDs)
- Anonymize IP addresses
- GDPR compliance: delete user events on account deletion

---

## 📊 Event Schema

### Core Fields

```typescript
interface Event {
  // Identity
  id: string;                           // UUID
  idempotency_key?: string;             // Deduplication
  
  // Classification
  source: 'app' | 'superwall' | 'revenuecat' | 'stripe' | 'apple' | 'google' | 'facebook_ads';
  category: 'ui' | 'paywall' | 'billing' | 'lifecycle' | 'ads' | 'error';
  name: string;                         // Event name
  
  // Timing
  occurred_at: string;                  // ISO timestamp
  received_at: string;                  // Server timestamp
  
  // User context
  user_id?: string;                     // auth.users.id
  app_user_id?: string;                 // RevenueCat ID
  anon_id?: string;                     // Device UUID
  session_id?: string;                  // Session UUID
  
  // Device
  platform?: 'ios' | 'android' | 'web';
  device?: string;                      // Model or UA
  
  // Attribution
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  
  // Billing
  product_id?: string;
  entitlement_id?: string;
  store?: 'app_store' | 'play_store' | 'stripe';
  revenue_amount_cents?: number;
  currency?: string;
  
  // Ads
  campaign_id?: string;
  adset_id?: string;
  ad_id?: string;
  
  // Meta
  external_ref?: string;                // Webhook ID, etc.
  payload: Record<string, any>;         // Raw data
}
```

---

## 🧪 Testing Plan

### Unit Tests
- [ ] Test idempotency (same key = no duplicate)
- [ ] Test batch ingestion (100 events)
- [ ] Test event validation (reject invalid schema)
- [ ] Test mapper functions (RC → canonical names)

### Integration Tests
- [ ] Test RevenueCat webhook → event created
- [ ] Test Stripe webhook → event created
- [ ] Test Apple ASSN → event created
- [ ] Test Google RTDN → event created
- [ ] Test FB Ads cron → events created

### E2E Tests
- [ ] User purchases → event appears in dashboard
- [ ] Trial expires → event appears in dashboard
- [ ] Paywall shown → event appears in dashboard
- [ ] Ad click → attributed conversion tracked

---

## 📈 Success Metrics

- ✅ All 7 event sources feeding into unified table
- ✅ Zero duplicate events (idempotency working)
- ✅ Dashboard shows data from all sources
- ✅ Event latency < 5s (ingest → dashboard visible)
- ✅ Funnel completion rates tracked
- ✅ Attribution working (ad clicks → purchases)

---

## 🚀 Deployment Checklist

### Database
- [ ] Run migration `05_events_tracking_system.sql`
- [ ] Verify indexes created
- [ ] Verify views created
- [ ] Test query performance

### API Endpoints
- [ ] Deploy `/api/events/ingest`
- [ ] Update webhook endpoints (RC, Stripe)
- [ ] Deploy Apple/Google webhook endpoints
- [ ] Deploy FB Ads cron job
- [ ] Configure Vercel Cron schedule

### Frontend
- [ ] Deploy developer dashboard
- [ ] Configure admin authentication
- [ ] Test dashboard loads data
- [ ] Verify real-time updates

### Mobile App
- [ ] Integrate `tracker.ts` SDK
- [ ] Add event tracking throughout app
- [ ] Test events appear in dashboard
- [ ] Verify attribution tracking

### Environment Variables
- [ ] Set all env vars in Vercel
- [ ] Set env vars in Expo
- [ ] Rotate INGEST_SERVER_KEY after deployment
- [ ] Test with production keys

---

## 📚 Related Documentation

- [Analytics Backend Implementation](./ANALYTICS_BACKEND_IMPLEMENTATION_REPORT.md)
- [Subscription Testing Guide](./SUBSCRIPTION_TESTING_AND_FLOW_GUIDE.md)
- [Onboarding Status Endpoint](./ONBOARDING_STATUS_ENDPOINT.md)

---

**Created**: November 1, 2025  
**Status**: Planning Phase  
**Estimated Timeline**: 5 weeks  
**Priority**: High
