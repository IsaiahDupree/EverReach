# 📊 Test Coverage Analysis - Complete Backend

**Date:** 2025-10-10  
**Total Endpoints:** 113  
**Total Test Files:** 21  
**Endpoint Coverage:** ~18.6%

## 📁 Existing Tests (21 files)

### ✅ Public API Tests (4 files) - **EXCELLENT**
1. **public-api-auth.test.ts** - 27 tests (100% passing)
   - API key generation, authentication, scopes, tenant isolation
2. **public-api-rate-limit.test.ts** - 28 tests (~93% passing)
   - Rate limiting, multiple limits, cleanup, concurrent requests
3. **public-api-webhooks.test.ts** - 23 tests (96% passing)
   - Webhook registration, signatures, delivery, status tracking
4. **public-api-context-bundle.test.ts** - 23 tests (100% after fix)
   - Context bundles, prompt skeletons, AI helpers

**Coverage:** 4/4 Public API endpoints ✅

### ✅ Feature-Specific Tests (10 files) - **GOOD**
5. **warmth-score.test.ts** - Warmth calculation logic
6. **context-assembly.test.ts** - Context building for AI
7. **message-send.test.ts** - Message sending
8. **message-scenarios.test.ts** - Message generation scenarios
9. **message-generation-performance.test.ts** - Performance benchmarks
10. **custom-fields.test.ts** - Custom fields system
11. **feature-requests.test.ts** - Feature request system
12. **feature-buckets.test.ts** - AI clustering
13. **posthog-webhook.test.ts** - PostHog integration
14. **ad-pixels.test.ts** - Ad pixel tracking

### ✅ Integration Tests (3 files) - **GOOD**
15. **ai-agent-system.test.ts** - Full agent workflow
16. **clustering.test.ts** - AI clustering integration
17. **contact-lifecycle.test.ts** - Contact CRUD lifecycle

### ✅ E2E Tests (2 files) - **GOOD**
18. **public-api-auth.e2e.test.ts** - Auth end-to-end
19. **public-api-context-bundle.e2e.test.ts** - Context bundle E2E

### ✅ Database/Library Tests (2 files) - **GOOD**
20. **database/functions.test.ts** - SQL functions
21. **lib/embeddings.test.ts** - Embedding generation

## ❌ Missing Test Coverage (92 endpoints)

### 🔴 Critical - No Tests (High Priority)

#### V1 Core Endpoints (14 endpoints)
- [ ] `/v1/contacts` (GET, POST)
- [ ] `/v1/contacts/:id` (GET, PATCH, DELETE)
- [ ] `/v1/contacts/:id/custom` (GET, PATCH)
- [ ] `/v1/contacts/:id/interactions` (GET)
- [ ] `/v1/contacts/:id/notes` (GET, POST)
- [ ] `/v1/contacts/:id/tags` (GET, POST, DELETE)
- [ ] `/v1/contacts/:id/warmth` (GET, POST)
- [ ] `/v1/contacts/search` (POST)

**Impact:** Core CRM functionality - **HIGH PRIORITY**

#### V1 Interactions (4 endpoints)
- [ ] `/v1/interactions` (GET, POST)
- [ ] `/v1/interactions/:id` (GET, PATCH, DELETE)

**Impact:** Core activity tracking - **HIGH PRIORITY**

#### V1 Pipelines & Goals (8 endpoints)
- [ ] `/v1/pipelines` (GET, POST)
- [ ] `/v1/pipelines/:id` (GET, PATCH, DELETE)
- [ ] `/v1/pipelines/:id/stages` (GET, POST)
- [ ] `/v1/goals` (GET, POST)
- [ ] `/v1/goals/:id` (GET, PATCH, DELETE)

**Impact:** Sales pipeline management - **MEDIUM PRIORITY**

#### V1 Templates & Messages (6 endpoints)
- [ ] `/v1/templates` (GET, POST)
- [ ] `/v1/templates/:id` (GET, PATCH, DELETE)
- [ ] `/v1/messages` (GET, POST)
- [ ] `/v1/messages/:id` (GET, PATCH)

**Impact:** Message management - **MEDIUM PRIORITY**

#### V1 Agent Endpoints (8 endpoints)
- [ ] `/v1/agent/chat` (POST)
- [ ] `/v1/agent/chat/stream` (POST)
- [ ] `/v1/agent/conversation` (GET, POST, DELETE)
- [ ] `/v1/agent/conversation/:id` (GET, DELETE)
- [ ] `/v1/agent/analyze/contact` (POST)
- [ ] `/v1/agent/analyze/screenshot` (POST)
- [ ] `/v1/agent/compose/smart` (POST)
- [ ] `/v1/agent/suggest/actions` (POST)
- [ ] `/v1/agent/voice-note/process` (POST)
- [ ] `/v1/agent/tools` (GET)

**Impact:** AI agent functionality - **HIGH PRIORITY**

#### V1 Custom Fields (2 endpoints)
- [ ] `/v1/custom-fields` (GET, POST) - **HAS TESTS** ✅
- [ ] `/v1/custom-fields/:id` (GET, PATCH, DELETE)

**Impact:** Custom data - **MEDIUM PRIORITY**

#### V1 Feature Requests (8 endpoints)
- [ ] `/v1/feature-requests` (GET, POST) - **HAS TESTS** ✅
- [ ] `/v1/feature-requests/:id` (GET, PATCH, DELETE)
- [ ] `/v1/feature-requests/:id/vote` (POST, DELETE)
- [ ] `/v1/feature-buckets` (GET)
- [ ] `/v1/feature-buckets/:id` (GET, PATCH)

**Impact:** Product feedback - **LOW PRIORITY**

#### V1 Alerts & Analysis (6 endpoints)
- [ ] `/v1/alerts` (GET, POST)
- [ ] `/v1/alerts/:id` (GET, PATCH, DELETE)
- [ ] `/v1/analysis/screenshot` (POST)
- [ ] `/v1/analysis/screenshot/:id` (GET)

**Impact:** Notifications & insights - **MEDIUM PRIORITY**

#### V1 Outbox & Personas (6 endpoints)
- [ ] `/v1/outbox` (GET, POST)
- [ ] `/v1/outbox/:id` (GET, PATCH, DELETE)
- [ ] `/v1/personas` (GET, POST)
- [ ] `/v1/personas/:id` (GET, PATCH, DELETE)

**Impact:** Message queue & personas - **MEDIUM PRIORITY**

### 🟡 Important - No Tests (Medium Priority)

#### Billing (2 endpoints)
- [ ] `/billing/checkout` (POST)
- [ ] `/billing/portal` (POST)

**Impact:** Revenue - **HIGH PRIORITY**

#### User/Me Endpoints (4 endpoints)
- [ ] `/me` (GET)
- [ ] `/me/usage-summary` (GET)
- [ ] `/me/impact-summary` (GET)
- [ ] `/me/plan-recommendation` (GET)

**Impact:** User dashboard - **MEDIUM PRIORITY**

#### File Uploads (3 endpoints)
- [ ] `/uploads/sign` (POST)
- [ ] `/files/commit` (POST)

**Impact:** File handling - **MEDIUM PRIORITY**

### 🟢 Low Priority - No Tests

#### Cron Jobs (8 endpoints)
- [ ] `/cron/check-warmth-alerts`
- [ ] `/cron/daily-recs`
- [ ] `/cron/entitlements-sanity`
- [ ] `/cron/interaction-metrics`
- [ ] `/cron/paywall-rollup`
- [ ] `/cron/process-embeddings`
- [ ] `/cron/prompts-rollup`
- [ ] `/cron/score-leads`

**Impact:** Background jobs - **LOW PRIORITY** (test manually)

#### Misc Endpoints (7 endpoints)
- [ ] `/health` (GET)
- [ ] `/recommendations/daily` (GET)
- [ ] `/telemetry/prompt-first` (POST)
- [ ] `/trending/prompts` (GET)
- [ ] `/posthog-webhook` (POST) - **HAS TESTS** ✅
- [ ] `/trpc/[trpc]` (ALL)
- [ ] `/[...api]` (catch-all)

**Impact:** Utilities - **LOW PRIORITY**

## 📊 Coverage Breakdown

### By Category
| Category | Endpoints | Tests | Coverage | Priority |
|----------|-----------|-------|----------|----------|
| **Public API** | 4 | 4 | 100% ✅ | Critical |
| **V1 Contacts** | 14 | 0 | 0% ❌ | Critical |
| **V1 Interactions** | 4 | 0 | 0% ❌ | Critical |
| **V1 Agent** | 10 | 0 | 0% ❌ | High |
| **V1 Pipelines** | 8 | 0 | 0% ❌ | Medium |
| **V1 Templates** | 6 | 0 | 0% ❌ | Medium |
| **V1 Messages** | 4 | 0 | 0% ❌ | Medium |
| **V1 Custom Fields** | 4 | 1 | 25% 🟡 | Medium |
| **V1 Feature Requests** | 8 | 2 | 25% 🟡 | Low |
| **V1 Alerts** | 6 | 0 | 0% ❌ | Medium |
| **V1 Outbox** | 6 | 0 | 0% ❌ | Medium |
| **V1 Personas** | 3 | 0 | 0% ❌ | Medium |
| **Billing** | 2 | 0 | 0% ❌ | High |
| **User/Me** | 4 | 0 | 0% ❌ | Medium |
| **File Uploads** | 3 | 0 | 0% ❌ | Medium |
| **Cron Jobs** | 8 | 0 | 0% ❌ | Low |
| **Misc** | 7 | 1 | 14% 🟡 | Low |
| **Feature Tests** | N/A | 10 | N/A | Good |
| **Integration** | N/A | 3 | N/A | Good |
| **E2E** | N/A | 2 | N/A | Good |
| **Database/Lib** | N/A | 2 | N/A | Good |

### Overall
- **Total Endpoints:** 113
- **Endpoints with Tests:** 21 (~18.6%)
- **Endpoints without Tests:** 92 (~81.4%)
- **Current Test Files:** 21
- **Needed Test Files:** ~50-60 (estimated)

## 🎯 Recommended Testing Priorities

### Phase 1: Critical Core (2-3 days)
**Goal:** Test core CRM functionality

1. **Contacts CRUD** (highest priority)
   - `contacts.test.ts` - GET, POST, PATCH, DELETE
   - `contacts-search.test.ts` - Search functionality
   - `contacts-custom.test.ts` - Custom fields (expand existing)

2. **Interactions CRUD**
   - `interactions.test.ts` - GET, POST, PATCH, DELETE

3. **Billing** (revenue-critical)
   - `billing.test.ts` - Checkout, portal

**Expected:** +30 tests, 40% endpoint coverage

### Phase 2: AI & Agent (2-3 days)
**Goal:** Test AI-powered features

4. **Agent Chat**
   - `agent-chat.test.ts` - Chat, streaming
   - `agent-conversation.test.ts` - Conversation management

5. **Agent Analysis**
   - `agent-analyze.test.ts` - Contact analysis, screenshots

6. **Agent Composition**
   - `agent-compose.test.ts` - Smart composition
   - `agent-voice-note.test.ts` - Voice note processing

**Expected:** +25 tests, 60% endpoint coverage

### Phase 3: Pipelines & Workflows (1-2 days)
**Goal:** Test sales pipeline

7. **Pipelines**
   - `pipelines.test.ts` - Pipeline CRUD
   - `pipeline-stages.test.ts` - Stage management

8. **Goals**
   - `goals.test.ts` - Goal CRUD

**Expected:** +15 tests, 70% endpoint coverage

### Phase 4: Templates & Messages (1-2 days)
**Goal:** Test messaging system

9. **Templates**
   - `templates.test.ts` - Template CRUD

10. **Messages**
    - `messages.test.ts` - Message CRUD

11. **Outbox**
    - `outbox.test.ts` - Outbox management

**Expected:** +15 tests, 80% endpoint coverage

### Phase 5: Supporting Features (1-2 days)
**Goal:** Test remaining features

12. **Alerts**
    - `alerts.test.ts` - Alert CRUD

13. **Personas**
    - `personas.test.ts` - Persona CRUD

14. **User/Me**
    - `me.test.ts` - User endpoints

15. **File Uploads**
    - `uploads.test.ts` - File handling

**Expected:** +15 tests, 90% endpoint coverage

### Phase 6: Cron & Misc (1 day)
**Goal:** Test background jobs

16. **Cron Jobs** (manual testing acceptable)
    - `cron-jobs.test.ts` - Basic smoke tests

17. **Misc Endpoints**
    - `health.test.ts` - Health checks
    - `recommendations.test.ts` - Daily recs

**Expected:** +10 tests, 95% endpoint coverage

## 📋 Test Template for New Endpoints

```typescript
/**
 * [Endpoint Name] Tests
 * 
 * Tests [description]
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { createClient } from '@supabase/supabase-js';

// ============================================================================
// SETUP
// ============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
const apiUrl = process.env.NEXT_PUBLIC_API_URL!;

let testOrgId: string;
let testUserId: string;
let testApiKey: string;

beforeAll(async () => {
  // Create test org
  const { data: org } = await supabase.from('orgs').insert({
    name: `Test Org - ${Date.now()}`,
  }).select().single();
  testOrgId = org!.id;

  // Create test user
  const { data: { user } } = await supabase.auth.admin.createUser({
    email: `test-${Date.now()}@example.com`,
    password: 'testpass123',
    email_confirm: true,
  });
  testUserId = user!.id;

  // Create API key
  const apiKey = generateApiKey('test');
  const keyHash = hashApiKey(apiKey);
  await supabase.from('api_keys').insert({
    org_id: testOrgId,
    key_prefix: apiKey.substring(0, 12),
    key_hash: keyHash,
    name: 'Test Key',
    scopes: ['contacts:read', 'contacts:write'],
    user_id: testUserId,
  });
  testApiKey = apiKey;
});

afterAll(async () => {
  // Cleanup
  await supabase.from('orgs').delete().eq('id', testOrgId);
  await supabase.auth.admin.deleteUser(testUserId);
});

// ============================================================================
// TESTS
// ============================================================================

describe('[Endpoint Name]', () => {
  describe('GET', () => {
    test('should return list', async () => {
      const response = await fetch(`${apiUrl}/v1/endpoint`, {
        headers: { 'Authorization': `Bearer ${testApiKey}` },
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    });

    test('should require authentication', async () => {
      const response = await fetch(`${apiUrl}/v1/endpoint`);
      expect(response.status).toBe(401);
    });
  });

  describe('POST', () => {
    test('should create resource', async () => {
      const response = await fetch(`${apiUrl}/v1/endpoint`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${testApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'Test' }),
      });
      
      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
    });
  });
});
```

## 🎯 Success Metrics

### Current State
- **Endpoint Coverage:** 18.6%
- **Test Files:** 21
- **Passing Tests:** ~98/119 (82%)

### Target State (Phase 1-6 Complete)
- **Endpoint Coverage:** 95%
- **Test Files:** ~70
- **Passing Tests:** ~500+ (90%+)

### Timeline
- **Phase 1 (Critical):** 2-3 days
- **Phase 2 (AI):** 2-3 days
- **Phase 3 (Pipelines):** 1-2 days
- **Phase 4 (Messages):** 1-2 days
- **Phase 5 (Supporting):** 1-2 days
- **Phase 6 (Misc):** 1 day
- **Total:** 9-13 days for 95% coverage

## 📊 Summary

**Current Status:**
- ✅ Public API: 100% coverage (excellent!)
- ✅ Feature tests: Good coverage
- ❌ V1 endpoints: 0-25% coverage (needs work)
- ❌ Core CRUD: 0% coverage (critical gap)

**Next Steps:**
1. Start with Phase 1 (Contacts, Interactions, Billing)
2. Follow test template for consistency
3. Aim for 90%+ coverage per endpoint
4. Run tests in CI/CD

**Priority:** Start with contacts CRUD tests (highest business value)

---

**Created:** 2025-10-10  
**Total Endpoints:** 113  
**Tested:** 21 (18.6%)  
**Untested:** 92 (81.4%)  
**Recommendation:** Focus on Phase 1 (Critical Core) first
