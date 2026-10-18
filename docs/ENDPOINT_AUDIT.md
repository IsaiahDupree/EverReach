# API Endpoint Audit - EverReach Mobile App

**Generated:** December 1, 2025  
**Purpose:** Document all API endpoints - what exists, what's used, what's missing

---

## Summary

| Category | Count |
|----------|-------|
| Backend Endpoints (Exist) | 65 |
| Frontend Endpoints (Used) | 52 |
| **Missing/Broken** | **18** |
| Deprecated/Unused | 8 |

---

## 1. Backend Endpoints (Mobile Backend - `/mobileapp/backend-vercel/app/api/v1/`)

### ✅ Core Endpoints (Working)

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/health` | GET | No | HealthStatus, mode-settings |
| `/api/version` | GET | No | HealthStatus |

### ✅ User & Auth (`/me`)

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/me` | GET | Yes | personal-profile, subscription-plans |
| `/api/v1/me/account` | DELETE | Yes | personal-profile (delete account) |
| `/api/v1/me/compose-settings` | GET/PATCH | Yes | HealthStatus |
| `/api/v1/me/entitlements` | GET | Yes | EntitlementsProvider, SubscriptionRepo |
| `/api/v1/me/onboarding-status` | GET | Yes | OnboardingProvider |
| `/api/v1/me/subscription` | GET | Yes | Not used yet |
| `/api/v1/me/persona-notes` | GET/POST | Yes | SupabaseVoiceNotesRepo |
| `/api/v1/me/persona-notes/[id]` | GET/PATCH/DELETE | Yes | SupabaseVoiceNotesRepo |
| `/api/v1/me/persona-notes/[id]/transcribe` | POST | Yes | SupabaseVoiceNotesRepo |

### ✅ Contacts

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/contacts` | GET/POST | Yes | Multiple screens, providers |
| `/api/v1/contacts/[id]` | GET/PATCH/DELETE | Yes | ContactDetail, contact/[id] |
| `/api/v1/contacts/[id]/notes` | GET/POST | Yes | ContactNotes, ContactContext |
| `/api/v1/contacts/[id]/messages` | GET/POST | Yes | useContactDetail |
| `/api/v1/contacts/[id]/files` | POST | Yes | screenshot-analysis |
| `/api/v1/contacts/[id]/tags` | PATCH | Yes | useContactDetail |
| `/api/v1/contacts/[id]/pipeline` | GET | Yes | ContactDetail, contact/[id] |
| `/api/v1/contacts/[id]/pipeline/move` | POST | Yes | ContactDetail, contact/[id] |
| `/api/v1/contacts/[id]/pipeline/history` | GET | Yes | Not used |
| `/api/v1/contacts/[id]/context-summary` | GET | Yes | ContactDetail, contact/[id] |
| `/api/v1/contacts/[id]/goal-suggestions` | GET | Yes | useGoalSuggestions |
| `/api/v1/contacts/[id]/warmth/mode` | GET/PUT | Yes | WarmthModeSelector |
| `/api/v1/contacts/[id]/warmth/recompute` | POST | Yes | WarmthProvider, settings |

### ✅ Contact Import

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/contacts/import/health` | GET | Yes | import-third-party |
| `/api/v1/contacts/import/list` | GET | Yes | import-third-party |
| `/api/v1/contacts/import/status/[id]` | GET | Yes | useContactImport |
| `/api/v1/contacts/import/google/start` | POST | Yes | Not used directly |
| `/api/v1/contacts/import/google/callback` | GET | No | OAuth callback |

### ✅ Messages & Compose

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/messages` | POST | Yes | HealthStatus test |
| `/api/v1/messages/[id]` | GET/DELETE | Yes | Not used |
| `/api/v1/messages/prepare` | POST | Yes | Tests only |
| `/api/v1/messages/send` | POST | Yes | Tests only |
| `/api/v1/compose` | POST | Yes | goal-picker, screenshot-analysis |
| `/api/v1/compose/validate` | POST | Yes | Not used |

### ✅ Interactions & Goals

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/interactions` | GET/POST | Yes | message-results, useScreenshotAnalysis |
| `/api/v1/interactions/[id]` | GET/PATCH/DELETE | Yes | notes-test |
| `/api/v1/interactions/[id]/files` | POST | Yes | ContactContext |
| `/api/v1/goals` | GET/POST | Yes | HealthStatus |
| `/api/v1/goals/[id]` | GET/PATCH/DELETE | Yes | Not used |
| `/api/v1/goals/[id]/pin` | POST | Yes | Not used |

### ✅ Pipelines & Templates

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/pipelines` | GET | Yes | HealthStatus |
| `/api/v1/pipelines/[key]/stages` | GET | Yes | Not used |
| `/api/v1/templates` | GET/POST | Yes | HealthStatus |
| `/api/v1/templates/[id]` | GET/PATCH/DELETE | Yes | Not used |

### ✅ Files & Media

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/files` | POST | Yes | openai-test, screenshot-analysis, personal-profile |
| `/api/v1/media/upload` | POST | Yes | Not used |
| `/api/v1/screenshots` | POST | Yes | useScreenshotAnalysis |
| `/api/v1/screenshots/[id]` | GET/DELETE | Yes | Not used |
| `/api/v1/screenshots/[id]/analyze` | POST | Yes | useScreenshotAnalysis |

### ✅ Search & Analytics

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/search` | POST | Yes | HealthStatus test |
| `/api/v1/events/track` | POST | Yes | AnalyticsRepo |
| `/api/v1/feature-requests` | POST | Yes | feature-request |

### ✅ Billing & Config

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/billing/restore` | POST | Yes | EntitlementsProvider, SubscriptionRepo |
| `/api/v1/billing/app-store/transactions` | POST | Yes | Webhooks |
| `/api/v1/billing/play/transactions` | POST | Yes | Webhooks |
| `/api/v1/config/paywall-live` | GET/POST | Yes | useLivePaywall |
| `/api/v1/config/paywall-strategy` | GET | No | HealthStatus |
| `/api/v1/subscriptions/sync` | POST | Yes | subscriptionManager |

### ✅ Operations (Admin/Debug)

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/ops/health` | GET | Yes* | Not used (needs service key) |
| `/api/v1/ops/config-status` | GET | Yes | Not used |
| `/api/v1/ops/send-test-email` | POST | Yes | Not used |
| `/api/v1/ops/sku-status` | GET | Yes | Not used |

### ✅ Webhooks (External)

| Endpoint | Methods | Auth | Notes |
|----------|---------|------|-------|
| `/api/v1/webhooks/app-store` | POST | Signature | Apple Server Notifications |
| `/api/v1/webhooks/play` | POST | Signature | Google Play RTDN |
| `/api/v1/webhooks/test` | POST | No | Testing only |

### ✅ Other

| Endpoint | Methods | Auth | Used By |
|----------|---------|------|---------|
| `/api/v1/agent/chat` | POST | Yes | agent-api |
| `/api/v1/analysis/screenshot` | POST | Yes | openai-test |
| `/api/v1/analysis/screenshot/[id]` | GET | Yes | Not used |
| `/api/v1/audit-logs` | GET | Yes | Not used |
| `/api/v1/merge/contacts` | POST | Yes | Not used |
| `/api/v1/warmth/modes` | GET | No | Not used |
| `/api/v1/warmth/recompute` | POST | Yes | Not used |
| `/api/v1/transcribe` | POST | No | Skipped (multipart) |

---

## 2. ❌ Missing Backend Endpoints (Called but Don't Exist)

These endpoints are called in frontend code but have NO backend implementation:

| Endpoint | Called From | Status | Action Needed |
|----------|-------------|--------|---------------|
| `/api/v1/developer/keys` | settings/developer.tsx | ❌ Missing | Remove or implement |
| `/api/v1/app-data` | AppDataProvider.tsx | ❌ Missing | Remove or implement |
| `/api/v1/billing/checkout` | SubscriptionRepo, useSubscriptionBilling | ❌ Missing | Use RevenueCat instead |
| `/api/v1/billing/portal` | SubscriptionRepo, useSubscriptionBilling | ❌ Missing | Use RevenueCat instead |
| `/api/v1/billing/cancel` | SubscriptionRepo, useSubscriptionBilling | ❌ Missing | Use RevenueCat instead |
| `/api/v1/billing/reactivate` | SubscriptionRepo | ❌ Missing | Use RevenueCat instead |
| `/api/v1/link/apple` | SubscriptionRepo, useSubscriptionBilling | ❌ Missing | Remove or implement |
| `/api/v1/link/google` | SubscriptionRepo, useSubscriptionBilling | ❌ Missing | Remove or implement |
| `/api/v1/queries/trending` | useTrendingQueries | ❌ Missing | Remove feature |
| `/api/v1/queries` | useTrendingQueries | ❌ Missing | Remove feature |
| `/api/v1/contacts/avatars/batch` | useContactAvatar | ❌ Missing | Remove or implement |
| `/api/v1/contacts/[id]/avatar` | contact/[id], imageUpload | ❌ Missing | Use /files instead |
| `/api/v1/agent/analyze/contact` | contact-context, ContactContext | ❌ Missing | Use /agent/chat |
| `/api/v1/agent/suggest/actions` | contact-context, ContactContext | ❌ Missing | Use /agent/chat |
| `/v1/push-tokens` | usePushNotifications | ❌ Wrong path | Should be /api/v1/ |
| `/v1/contacts/[id]/watch` | WatchStatusToggle, warmth-alerts-test | ❌ Missing | Remove feature |
| `/v1/alerts` | warmth-alerts-test | ❌ Missing | Remove feature |
| `/api/me/usage-summary` | subscription-plans | ❌ Wrong path | Remove or fix |

---

## 3. Deprecated/Wrong Path Endpoints

| Called Endpoint | Correct Endpoint | Used By |
|-----------------|------------------|---------|
| `/api/billing/checkout` | N/A (use RevenueCat) | subscription-plans |
| `/api/billing/portal` | N/A (use RevenueCat) | SubscriptionRepo |
| `/api/messages/craft` | `/api/v1/compose` | messageGeneration |
| `/api/telemetry/performance` | `/api/v1/events/track` | AnalyticsRepo |

---

## 4. Unused Backend Endpoints (Can Remove)

These endpoints exist but are never called:

| Endpoint | Notes |
|----------|-------|
| `/api/v1/me/subscription` | Use /me/entitlements instead |
| `/api/v1/messages/[id]` | GET/DELETE never used |
| `/api/v1/messages/prepare` | Only in tests |
| `/api/v1/messages/send` | Only in tests |
| `/api/v1/compose/validate` | Never called |
| `/api/v1/contacts/[id]/pipeline/history` | Never called |
| `/api/v1/goals/[id]` | Individual goal ops not used |
| `/api/v1/goals/[id]/pin` | Pin feature not used |
| `/api/v1/pipelines/[key]/stages` | Never called |
| `/api/v1/templates/[id]` | Template CRUD not used |
| `/api/v1/screenshots/[id]` | Direct access not used |
| `/api/v1/analysis/screenshot/[id]` | Direct access not used |
| `/api/v1/media/upload` | Use /files instead |
| `/api/v1/merge/contacts` | Feature not implemented |
| `/api/v1/warmth/modes` | Global endpoint not used |
| `/api/v1/warmth/recompute` | Global endpoint not used |
| `/api/v1/audit-logs` | Admin feature not used |
| `/api/v1/ops/*` | Admin/debug not used in app |

---

## 5. Recommendations

### High Priority (Breaking)
1. **Fix `/api/v1/contacts/[id]/avatar`** - Either implement or redirect to `/files`
2. **Remove developer/keys UI** - No backend exists
3. **Fix push notification paths** - Change `/v1/` to `/api/v1/`
4. **Remove trending queries feature** - No backend exists

### Medium Priority (Cleanup)
1. **Consolidate billing endpoints** - Use RevenueCat SDK directly, remove unused endpoints
2. **Remove agent analyze/suggest** - Use `/agent/chat` instead
3. **Clean up wrong paths** - `/api/billing/` → `/api/v1/billing/`

### Low Priority (Technical Debt)
1. Remove unused CRUD endpoints (individual messages, templates, goals)
2. Remove unused admin endpoints (/ops/*)
3. Consolidate warmth endpoints

---

## 6. Complete Endpoint List for Health Check

These are all endpoints that SHOULD work and ARE used:

```typescript
const MOBILE_APP_ENDPOINTS = [
  // Health (no auth)
  { path: '/api/health', method: 'GET', auth: false },
  { path: '/api/version', method: 'GET', auth: false },
  
  // User
  { path: '/api/v1/me', method: 'GET', auth: true },
  { path: '/api/v1/me/entitlements', method: 'GET', auth: true },
  { path: '/api/v1/me/compose-settings', method: 'GET', auth: true },
  { path: '/api/v1/me/onboarding-status', method: 'GET', auth: true },
  { path: '/api/v1/me/persona-notes', method: 'GET', auth: true },
  
  // Contacts
  { path: '/api/v1/contacts', method: 'GET', auth: true },
  { path: '/api/v1/pipelines', method: 'GET', auth: true },
  { path: '/api/v1/templates', method: 'GET', auth: true },
  { path: '/api/v1/interactions', method: 'GET', auth: true },
  { path: '/api/v1/goals', method: 'GET', auth: true },
  
  // Config
  { path: '/api/v1/config/paywall-live', method: 'GET', auth: true },
  { path: '/api/v1/config/paywall-strategy', method: 'GET', auth: false },
  
  // Import
  { path: '/api/v1/contacts/import/health', method: 'GET', auth: true },
  { path: '/api/v1/contacts/import/list', method: 'GET', auth: true },
  
  // POST endpoints (validation errors expected)
  { path: '/api/v1/billing/restore', method: 'POST', auth: true },
  { path: '/api/v1/files', method: 'POST', auth: true },
  { path: '/api/v1/search', method: 'POST', auth: true },
  { path: '/api/v1/compose', method: 'POST', auth: true },
  { path: '/api/v1/events/track', method: 'POST', auth: true },
  { path: '/api/v1/feature-requests', method: 'POST', auth: true },
  { path: '/api/v1/agent/chat', method: 'POST', auth: true },
];
```

### Skipped POST Endpoints (Cannot Health Check)
| Endpoint | Reason |
|----------|--------|
| `/api/v1/compose` | Requires valid `contact_id` UUID + `channel` |
| `/api/v1/messages` | Requires valid `contact_id` UUID |
| `/api/v1/screenshots` | Requires `multipart/form-data` file upload |
| `/api/v1/transcribe` | Requires `multipart/form-data` audio file |

### Health Check Status Codes
| Status | Meaning | Color |
|--------|---------|-------|
| **200/201** | ✅ Working perfectly | Green |
| **400** | ⚠️ Endpoint reachable, validation error | Yellow |
| **401/403** | ⚠️ Auth issue (check token) | Yellow |
| **500** | ❌ Server error | Red |
| **Network Error** | ❌ Unreachable | Red |
```

---

## 7. Test Results (December 1, 2025)

### Automated Test: 53 Endpoints Tested

**Match Rate: 49/53 (92.5%)** ✅

| Status | Local | Production |
|--------|-------|------------|
| ✅ Pass (2xx) | 29 | 30 |
| ⚠️ Reachable (4xx) | 22 | 22 |
| ❌ Failed (5xx) | 2 | 1 |

### 4 Mismatches (Deployment Differences)

| # | Endpoint | Local | Prod | Reason |
|---|----------|-------|------|--------|
| 15 | `contacts/{id}/notes` | 404 | 200 | Prod missing contact existence check |
| 22 | `contacts/{id}/goal-suggestions` | 200 | 404 | Endpoint not deployed to prod |
| 23 | `contacts/{id}/warmth/mode` | 404 | 400 | Different error handling |
| 30 | `import/google/start` | 500 | 200 | Local missing Google OAuth creds |

### Actions Required

1. **Deploy `e2e` branch to production** - This will sync:
   - Contact existence checks in `/notes`, `/warmth/mode`
   - Goal suggestions endpoint
   - Consistent error codes

2. **Configure local Google OAuth** (optional) - For testing imports locally

### Test Command

```bash
cd mobileapp
node scripts/test-52-endpoints.mjs <email> <password>
```

---

*Last updated: December 1, 2025*

