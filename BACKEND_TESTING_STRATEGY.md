# Backend Testing Strategy & Coverage Report

**Last Updated**: October 23, 2025  
**Testing Coverage**: 6% (5/88+ endpoints)  
**Status**: 🟡 In Progress

---

## 📊 Executive Summary

This document outlines the complete testing strategy for all 88+ backend API endpoints, organized into test buckets for systematic validation. It includes E2E user journey tests, unit tests, and integration tests.

### Current Status
- **✅ Tested & Working**: 5 endpoints (Marketing Intelligence core)
- **❓ Untested**: 83+ endpoints (needs systematic testing)
- **🎯 Goal**: 100% endpoint coverage with automated tests

---

## ✅ **TESTED ENDPOINTS** (5/88 - 6%)

### Marketing Intelligence Core (100% passing)
1. ✅ `/api/v1/marketing/attribution` - Last-touch attribution analytics
2. ✅ `/api/v1/marketing/magnetism` - User engagement scores  
3. ✅ `/api/v1/marketing/personas` - ICP segment analysis
4. ✅ `/api/v1/marketing/funnel` - Conversion funnel tracking
5. ✅ `/api/v1/marketing/analytics` - Aggregated dashboard data

**Test File**: `test/agent/marketing-intelligence-comprehensive.mjs`  
**Last Run**: October 23, 2025  
**Success Rate**: 100%  

**Key Fixes Applied**:
- Fixed `NEXT_PUBLIC_SUPABASE_URL` → `SUPABASE_URL` (4 endpoints)
- Fixed schema field names: `persona_key` → `label`, `event_name` → `etype`
- Removed broken materialized view logic in funnel endpoint
- Updated to use actual event types from database

---

## 🧪 **E2E USER JOURNEY: Marketing Intelligence**

### User Flow Through Marketing Intelligence Pages

```
User Signup → Event Tracking → Attribution → Persona Analysis → Magnetism Score → Funnel View → Analytics Dashboard
```

#### **Journey Stages**

**Stage 1: User Acquisition**
```javascript
POST /api/tracking/events
{
  event: "ad_click",
  user_id: "uuid",
  properties: { campaign_id, source: "meta_ads" }
}
```

**Stage 2: Landing & Signup**
```javascript
POST /api/tracking/events
{
  event: "landing_view",
  anonymous_id: "session_id",
  properties: { page: "/signup" }
}

POST /api/tracking/events
{
  event: "email_submitted",
  user_id: "uuid",
  properties: { email, referrer }
}
```

**Stage 3: Identity Enrichment**
```javascript
POST /api/v1/marketing/enrich
{
  email: "user@example.com",
  user_id: "uuid",
  trigger: "email_submitted"
}
// Response: Returns enriched profile data
```

**Stage 4: Persona Assignment**
```javascript
GET /api/v1/marketing/persona?user_id=uuid
// Response: { persona_bucket, confidence, assigned_at }

// View all personas
GET /api/v1/marketing/personas
// Response: { personas: [...], summary: {...} }
```

**Stage 5: Trial & Activation**
```javascript
POST /api/tracking/events
{
  event: "trial_started",
  user_id: "uuid",
  properties: { plan: "pro" }
}

POST /api/tracking/events
{
  event: "onboarding_step",
  user_id: "uuid",
  properties: { step: 1, completed: true }
}
```

**Stage 6: Engagement Tracking**
```javascript
POST /api/tracking/events
{
  event: "feature_used",
  user_id: "uuid",
  properties: { feature: "contacts", action: "create" }
}

POST /api/tracking/events
{
  event: "app_open",
  user_id: "uuid",
  properties: { session_id, platform: "web" }
}
```

**Stage 7: Marketing Analysis (Admin Views)**
```javascript
// Attribution Analysis
GET /api/v1/marketing/attribution?start_date=2025-10-01&end_date=2025-10-23
// Response: { attribution: [...], summary: { by_source, by_event_type } }

// Magnetism Score
GET /api/v1/marketing/magnetism?window_days=7
// Response: { magnetism: [...], summary: { avg_score, high_engagement_count } }

GET /api/v1/marketing/magnetism/[userId]?window=7d
// Response: { index_value, details, time_window }

// Funnel Analysis
GET /api/v1/marketing/funnel
// Response: { funnel: [...], summary: { conversion_rates } }

// Analytics Dashboard
GET /api/v1/marketing/analytics
// Response: { summary, recent_conversions, top_channels }
```

**Stage 8: Conversion**
```javascript
POST /api/tracking/events
{
  event: "purchase",
  user_id: "uuid",
  properties: { plan: "pro", amount: 99 }
}
```

---

## 📦 **TEST BUCKET ORGANIZATION**

### **Bucket 1: Marketing Intelligence & Analytics** (11 endpoints)

**Priority**: 🔴 CRITICAL  
**Coverage**: 45% (5/11 tested)  
**Test File**: `test/agent/bucket-1-marketing-intelligence.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/v1/marketing/attribution` | ✅ Tested | Integration | Critical |
| `/api/v1/marketing/attribution/[userId]` | ❓ Untested | Integration | High |
| `/api/v1/marketing/magnetism` | ✅ Tested | Integration | Critical |
| `/api/v1/marketing/magnetism/[userId]` | ❓ Untested | Integration | High |
| `/api/v1/marketing/magnetism-summary` | ❓ Untested | Integration | Medium |
| `/api/v1/marketing/personas` | ✅ Tested | Integration | Critical |
| `/api/v1/marketing/persona` (POST) | ❓ Untested | Integration | High |
| `/api/v1/marketing/funnel` | ✅ Tested | Integration | Critical |
| `/api/v1/marketing/analytics` | ✅ Tested | Integration | Critical |
| `/api/v1/marketing/enrich` | ❓ Untested | Integration | High |
| `/api/admin/marketing/*` (3 endpoints) | ❓ Untested | Integration | Medium |

**E2E Test**: User journey from ad click to conversion (8 stages)  
**Unit Tests**: Each endpoint with mock data  
**Integration Tests**: Full flow with real database  

---

### **Bucket 2: Event Tracking & Analytics** (5 endpoints)

**Priority**: 🔴 CRITICAL  
**Coverage**: 0% (0/5 tested)  
**Test File**: `test/agent/bucket-2-event-tracking.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/tracking/events` (POST) | ❓ Untested | Integration | Critical |
| `/api/tracking/events` (GET) | ❓ Untested | Unit | Low |
| `/api/ingest` | ❓ Untested | Integration | High |
| `/api/cron/sync-posthog-events` | ❓ Untested | Integration | Medium |
| `/api/cron/process-embeddings` | ❓ Untested | Integration | Medium |

**E2E Test**: Client sends events → Backend processes → Store in DB → PostHog sync  
**Unit Tests**: Event validation, enrichment, idempotency  
**Integration Tests**: Full pipeline with PostHog mock  

---

### **Bucket 3: Meta/Social Platform Integration** (5 endpoints)

**Priority**: 🟡 HIGH  
**Coverage**: 0% (0/5 tested)  
**Test File**: `test/agent/bucket-3-meta-platforms.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/v1/integrations/messenger/send` | ❓ Untested | Integration | High |
| `/api/v1/integrations/meta/conversions` | ❓ Untested | Integration | High |
| `/api/v1/integrations/meta/ads-insights` | ❓ Untested | Integration | High |
| `/api/webhooks/meta` | ❓ Untested | Integration | Critical |
| `/api/webhooks/meta` (verification) | ❓ Untested | Unit | High |

**E2E Test**: Send Instagram DM → Receive webhook → Log to DB → Send conversion event  
**Unit Tests**: Webhook signature verification, message formatting  
**Integration Tests**: Full Meta API flow (requires test tokens)  

---

### **Bucket 4: Contacts & CRM Core** (10 endpoints)

**Priority**: 🔴 CRITICAL  
**Coverage**: 0% (0/10 tested)  
**Test File**: `test/agent/bucket-4-contacts-crm.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/contacts` (GET) | ❓ Untested | Integration | Critical |
| `/api/contacts` (POST) | ❓ Untested | Integration | Critical |
| `/api/contacts/[id]` (GET) | ❓ Untested | Integration | Critical |
| `/api/contacts/[id]` (PATCH) | ❓ Untested | Integration | Critical |
| `/api/contacts/[id]` (DELETE) | ❓ Untested | Integration | Critical |
| `/api/contacts/search` | ❓ Untested | Integration | High |
| `/api/interactions` | ❓ Untested | Integration | High |
| `/api/files/commit` | ❓ Untested | Integration | Medium |
| `/api/cron/score-leads` | ❓ Untested | Integration | Medium |
| `/api/cron/check-warmth-alerts` | ❓ Untested | Integration | Medium |

**E2E Test**: Create contact → Add interaction → Upload file → Score lead → Get warmth alert  
**Unit Tests**: CRUD operations, validation, search queries  
**Integration Tests**: Full contact lifecycle  

---

### **Bucket 5: Campaign Automation** (12 endpoints)

**Priority**: 🟡 HIGH  
**Coverage**: 17% (2/12 tested)  
**Test File**: `test/agent/bucket-5-campaigns.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/cron/run-campaigns` | ❓ Untested | Integration | Critical |
| `/api/cron/send-email` | ❓ Untested | Integration | Critical |
| `/api/cron/send-sms` | ❓ Untested | Integration | Critical |
| `/api/cron/daily-recs` | ❓ Untested | Integration | High |
| `/api/cron/process-enrichment-queue` | ❓ Untested | Integration | High |
| `/api/admin/ingest/email-campaign` | ❓ Untested | Integration | High |
| `/api/cron/sync-email-metrics` | ❓ Untested | Integration | Medium |
| `/api/cron/sync-ai-context` | ❓ Untested | Integration | Medium |
| `/api/cron/interaction-metrics` | ❓ Untested | Integration | Medium |
| `e2e-multi-channel-campaigns.mjs` | ✅ Tested | E2E | High |
| `lifecycle-campaigns.mjs` | ✅ Tested | Integration | High |
| Others (email/SMS workers) | ❓ Untested | Integration | High |

**E2E Test**: Schedule campaign → Process queue → Send email/SMS → Track metrics  
**Unit Tests**: Campaign rules, segmentation, scheduling  
**Integration Tests**: Full campaign lifecycle with Resend/Twilio  

---

### **Bucket 6: Admin & Dashboard** (13 endpoints)

**Priority**: 🟡 MEDIUM  
**Coverage**: 0% (0/13 tested)  
**Test File**: `test/agent/bucket-6-admin.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/admin/auth/signin` | ❓ Untested | Integration | High |
| `/api/admin/auth/signout` | ❓ Untested | Integration | High |
| `/api/admin/auth/request-reset` | ❓ Untested | Integration | High |
| `/api/admin/dashboard/overview` | ❓ Untested | Integration | Medium |
| `/api/admin/dev-notifications` | ❓ Untested | Integration | Low |
| `/api/admin/experiments` (GET/POST) | ❓ Untested | Integration | Medium |
| `/api/admin/experiments/[key]` (GET/PATCH/DELETE) | ❓ Untested | Integration | Medium |
| `/api/admin/feature-flags` (GET/POST) | ❓ Untested | Integration | Medium |
| `/api/admin/feature-flags/[key]` (GET/PATCH/DELETE) | ❓ Untested | Integration | Medium |
| `/api/admin/marketing/enrichment-stats` | ❓ Untested | Integration | Medium |
| `/api/admin/marketing/overview` | ❓ Untested | Integration | Medium |
| `/api/admin/marketing/recent-users` | ❓ Untested | Integration | Medium |

**E2E Test**: Admin login → View dashboard → Toggle feature flag → Run experiment  
**Unit Tests**: Auth, permissions, CRUD for flags/experiments  
**Integration Tests**: Full admin workflow  

---

### **Bucket 7: Billing & Payments** (2 endpoints)

**Priority**: 🔴 CRITICAL  
**Coverage**: 50% (1/2 tested - partial)  
**Test File**: `test/agent/bucket-7-billing.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/billing/checkout` | ⚠️ Partially Tested | Integration | Critical |
| `/api/billing/portal` | ❓ Untested | Integration | Critical |

**E2E Test**: Create checkout → Complete payment → Access portal → Update subscription  
**Unit Tests**: Stripe webhook handling, subscription logic  
**Integration Tests**: Full Stripe integration (test mode)  

---

### **Bucket 8: Cron Jobs & Background Tasks** (19 endpoints)

**Priority**: 🟡 MEDIUM  
**Coverage**: 5% (1/19 tested)  
**Test File**: `test/agent/bucket-8-cron-jobs.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/cron/check-warmth-alerts` | ❓ Untested | Integration | High |
| `/api/cron/daily-recs` | ❓ Untested | Integration | High |
| `/api/cron/dev-activity-digest` | ❓ Untested | Integration | Low |
| `/api/cron/entitlements-sanity` | ✅ Tested | Integration | Medium |
| `/api/cron/interaction-metrics` | ❓ Untested | Integration | Medium |
| `/api/cron/paywall-rollup` | ❓ Untested | Integration | Medium |
| `/api/cron/process-embeddings` | ❓ Untested | Integration | Medium |
| `/api/cron/process-enrichment-queue` | ❓ Untested | Integration | High |
| `/api/cron/prompts-rollup` | ❓ Untested | Integration | Low |
| `/api/cron/refresh-dashboard-views` | ❓ Untested | Integration | Medium |
| `/api/cron/refresh-marketing-views` | ❓ Untested | Integration | Medium |
| `/api/cron/refresh-monitoring-views` | ❓ Untested | Integration | Medium |
| `/api/cron/run-campaigns` | ❓ Untested | Integration | Critical |
| `/api/cron/score-leads` | ❓ Untested | Integration | High |
| `/api/cron/send-email` | ❓ Untested | Integration | Critical |
| `/api/cron/send-sms` | ❓ Untested | Integration | Critical |
| `/api/cron/sync-ai-context` | ❓ Untested | Integration | Medium |
| `/api/cron/sync-email-metrics` | ❓ Untested | Integration | Medium |
| `/api/cron/sync-posthog-events` | ❓ Untested | Integration | Medium |

**E2E Test**: Trigger all cron jobs manually → Verify execution → Check side effects  
**Unit Tests**: Individual job logic, error handling  
**Integration Tests**: Full cron workflow with scheduling  

---

### **Bucket 9: Infrastructure & Health** (3 endpoints)

**Priority**: 🟢 LOW  
**Coverage**: 33% (1/3 tested)  
**Test File**: `test/agent/bucket-9-infrastructure.mjs`

| Endpoint | Status | Test Type | Priority |
|----------|--------|-----------|----------|
| `/api/health` | ✅ Tested | Unit | Critical |
| `/api/example` | ❓ Untested | Unit | Low |
| Performance benchmarks | ⚠️ Partially Tested | Performance | Medium |

**E2E Test**: N/A  
**Unit Tests**: Health checks, example endpoint  
**Performance Tests**: Response times, throughput, load testing  

---

## 🎯 **Testing Implementation Plan**

### Phase 1: Critical Paths (Week 1)
- ✅ **COMPLETED**: Bucket 1 - Marketing Intelligence core (5 endpoints)
- 🔲 **TODO**: Bucket 2 - Event Tracking (5 endpoints)
- 🔲 **TODO**: Bucket 4 - Contacts CRUD (10 endpoints)
- 🔲 **TODO**: Bucket 7 - Billing (2 endpoints)

### Phase 2: High Priority (Week 2)
- 🔲 Bucket 3 - Meta Platforms (5 endpoints)
- 🔲 Bucket 5 - Campaign Automation (12 endpoints)
- 🔲 Bucket 1 - Marketing Intelligence extended (6 endpoints)

### Phase 3: Medium Priority (Week 3)
- 🔲 Bucket 6 - Admin & Dashboard (13 endpoints)
- 🔲 Bucket 8 - Cron Jobs (19 endpoints)

### Phase 4: Polish & Optimization (Week 4)
- 🔲 Bucket 9 - Infrastructure (3 endpoints)
- 🔲 Performance testing & optimization
- 🔲 Load testing
- 🔲 Security testing

---

## 📝 **Test File Structure**

Each test bucket follows this structure:

```javascript
/**
 * Test Bucket X: [Category Name]
 * 
 * Tests: [Number] endpoints
 * Priority: [Critical/High/Medium/Low]
 * Coverage: [X%]
 */

import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const supabase = createClient(/*...*/);

// Test utilities
async function authenticateTestUser() { /*...*/ }
async function apiCall(endpoint, options) { /*...*/ }
function log(msg) { /*...*/ }
function success(msg) { /*...*/ }
function fail(msg) { /*...*/ }

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  tests: []
};

// E2E User Journey Test
async function testE2EUserJourney() { /*...*/ }

// Individual endpoint tests
async function testEndpoint1() { /*...*/ }
async function testEndpoint2() { /*...*/ }
// ...

// Main test runner
async function main() {
  console.log('🧪 Test Bucket X: [Category]');
  
  await testE2EUserJourney();
  await testEndpoint1();
  await testEndpoint2();
  
  // Summary
  console.log('\n📊 RESULTS:');
  console.log(`✅ Passed: ${testResults.passed}`);
  console.log(`❌ Failed: ${testResults.failed}`);
  
  process.exit(testResults.failed > 0 ? 1 : 0);
}

main().catch(console.error);
```

---

## 🔄 **Continuous Integration**

### GitHub Actions Workflow

```yaml
name: Backend API Tests

on:
  push:
    branches: [main, feat/backend-vercel-only-clean]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run all test buckets
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TEST_USER_EMAIL: ${{ secrets.TEST_USER_EMAIL }}
          TEST_USER_PASSWORD: ${{ secrets.TEST_USER_PASSWORD }}
        run: node test/agent/run-all-test-buckets.mjs
      
      - name: Upload test reports
        uses: actions/upload-artifact@v3
        with:
          name: test-reports
          path: test/agent/reports/
```

---

## 📈 **Success Metrics**

### Coverage Goals
- **Critical Endpoints**: 100% tested by Week 2
- **High Priority Endpoints**: 100% tested by Week 3
- **All Endpoints**: 100% tested by Week 4

### Quality Metrics
- **Pass Rate**: >95% on all buckets
- **Response Time**: <500ms for GET requests
- **Error Rate**: <1% on production
- **Uptime**: >99.9%

---

## 🛠️ **Next Actions**

1. **Immediate**: Create test files for Buckets 2-9
2. **Today**: Implement E2E test for marketing intelligence user journey
3. **This Week**: Complete critical path testing (Buckets 2, 4, 7)
4. **Next Week**: High priority testing (Buckets 3, 5)

---

**Document Version**: 1.0  
**Last Test Run**: October 23, 2025, 9:00 PM  
**Maintained By**: Development Team
