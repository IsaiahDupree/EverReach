# Unified Agent Test Report

**Generated**: 2025-10-21T03:51:37.561Z

## Summary

- **Total Tests**: 39
- **Passed**: ✅ 13
- **Failed**: ❌ 26
- **Success Rate**: 33.3%
- **Total Duration**: 7.30s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\lifecycle-campaigns | ❌ FAIL | 1.13s | 3221226505 |
| test\agent\lifecycle-end-to-end | ❌ FAIL | 484ms | 3221226505 |
| test\agent\lifecycle-email-worker | ❌ FAIL | 449ms | 3221226505 |
| test\agent\lifecycle-sms-worker | ❌ FAIL | 336ms | 3221226505 |
| test\agent\backend-cron-jobs | ❌ FAIL | 73ms | 1 |
| test\agent\backend-tracking-identify | ❌ FAIL | 72ms | 1 |
| test\agent\backend-tracking-events | ❌ FAIL | 71ms | 1 |
| test\agent\e2e-contact-lifecycle-complete | ❌ FAIL | 61ms | 1 |
| test\agent\schema-smoke | ❌ FAIL | 56ms | 1 |
| test\agent\e2e-multi-channel-campaigns | ❌ FAIL | 51ms | 1 |
| test\agent\agent-persona-notes | ❌ FAIL | 48ms | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 48ms | 1 |
| test\agent\e2e-screenshot-analysis | ❌ FAIL | 48ms | 1 |
| test\agent\e2e-trial-expiration | ❌ FAIL | 46ms | 1 |
| test\agent\agent-analyze-contact | ❌ FAIL | 45ms | 1 |
| test\agent\e2e-warmth-tracking | ❌ FAIL | 45ms | 1 |
| test\agent\agent-compose-prepare-send | ❌ FAIL | 44ms | 1 |
| test\agent\agent-message-goals | ❌ FAIL | 44ms | 1 |
| test\agent\cors-validation | ❌ FAIL | 44ms | 1 |
| test\agent\agent-contact-details | ❌ FAIL | 43ms | 1 |
| test\agent\agent-suggest-actions | ❌ FAIL | 43ms | 1 |
| test\agent\lifecycle-posthog-webhook | ❌ FAIL | 43ms | 1 |
| test\agent\performance-benchmarks | ❌ FAIL | 43ms | 1 |
| test\agent\agent-interactions-summary | ❌ FAIL | 42ms | 1 |
| test\agent\ai-context-actions.smoke | ❌ FAIL | 42ms | 1 |
| test\agent\agent-update-tags | ❌ FAIL | 41ms | 1 |
| test\agent\lifecycle-segments | ✅ PASS | 3.17s | 0 |
| test\agent\run-all-e2e-tests | ✅ PASS | 93ms | 0 |
| test\agent\e2e-contacts-crud | ✅ PASS | 57ms | 0 |
| test\agent\e2e-billing | ✅ PASS | 54ms | 0 |
| test\agent\e2e-templates-warmth-pipelines | ✅ PASS | 53ms | 0 |
| test\agent\frontend_api_smoke | ✅ PASS | 51ms | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 50ms | 0 |
| test\agent\e2e-contact-files | ✅ PASS | 50ms | 0 |
| test\agent\e2e-interactions | ✅ PASS | 50ms | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 50ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 46ms | 0 |
| test\agent\e2e-user-system | ✅ PASS | 44ms | 0 |
| test\agent\check-contacts-schema | ✅ PASS | 42ms | 0 |

---

## Detailed Test Reports

> **Note**: This section combines all individual test reports for comprehensive review.

### ❌ test\agent\lifecycle-campaigns

- **Duration**: 1.13s
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-end-to-end

- **Duration**: 484ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-email-worker

- **Duration**: 449ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-sms-worker

- **Duration**: 336ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\backend-cron-jobs

- **Duration**: 73ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-tracking-identify

- **Duration**: 72ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-tracking-events

- **Duration**: 71ms
- **Exit Code**: 1

---

### ❌ test\agent\e2e-contact-lifecycle-complete

- **Duration**: 61ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-contact-lifecycle-complete.mjs:40:17)
```

---

### ❌ test\agent\schema-smoke

- **Duration**: 56ms
- **Exit Code**: 1

**Error Output:**
```
❌ Schema smoke test failed
```

---

### ❌ test\agent\e2e-multi-channel-campaigns

- **Duration**: 51ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-multi-channel-campaigns.mjs:30:17)
```

---

### ❌ test\agent\agent-persona-notes

- **Duration**: 48ms
- **Exit Code**: 1

**Error Output:**
```
[agent-persona-notes] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\e2e-advanced-features

- **Duration**: 48ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-advanced-features.mjs:14:17)
```

---

### ❌ test\agent\e2e-screenshot-analysis

- **Duration**: 48ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-screenshot-analysis.mjs:31:17)
```

---

### ❌ test\agent\e2e-trial-expiration

- **Duration**: 46ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-trial-expiration.mjs:28:17)
```

---

### ❌ test\agent\agent-analyze-contact

- **Duration**: 45ms
- **Exit Code**: 1

**Error Output:**
```
[agent-analyze-contact] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\e2e-warmth-tracking

- **Duration**: 45ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/e2e-warmth-tracking.mjs:29:17)
```

---

### ❌ test\agent\agent-compose-prepare-send

- **Duration**: 44ms
- **Exit Code**: 1

**Error Output:**
```
[agent-compose-prepare-send] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\agent-message-goals

- **Duration**: 44ms
- **Exit Code**: 1

**Error Output:**
```
[agent-message-goals] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\cors-validation

- **Duration**: 44ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async getTestToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/cors-validation.mjs:30:10)
    at async testEndpoint (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/cors-validation.mjs:115:17)
    at async runCorsTests (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/cors-validation.mjs:240:19)
    at async file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/cors-validation.mjs:324:21
```

---

### ❌ test\agent\agent-contact-details

- **Duration**: 43ms
- **Exit Code**: 1

**Error Output:**
```
[agent-contact-details] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\agent-suggest-actions

- **Duration**: 43ms
- **Exit Code**: 1

**Error Output:**
```
[agent-suggest-actions] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\lifecycle-posthog-webhook

- **Duration**: 43ms
- **Exit Code**: 1

---

### ❌ test\agent\performance-benchmarks

- **Duration**: 43ms
- **Exit Code**: 1

**Error Output:**
```
Fatal error: Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async main (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/performance-benchmarks.mjs:105:17)
```

---

### ❌ test\agent\agent-interactions-summary

- **Duration**: 42ms
- **Exit Code**: 1

**Error Output:**
```
[agent-interactions-summary] failed: Missing env: TEST_EMAIL
```

---

### ❌ test\agent\ai-context-actions.smoke

- **Duration**: 42ms
- **Exit Code**: 1

**Error Output:**
```
[AI Smoke Test Failed] Missing env: SUPABASE_URL
```

---

### ❌ test\agent\agent-update-tags

- **Duration**: 41ms
- **Exit Code**: 1

**Error Output:**
```
[agent-update-tags] failed: Missing env: TEST_EMAIL
```

---

### ✅ test\agent\lifecycle-segments

- **Duration**: 3.17s
- **Exit Code**: 0

---

### ✅ test\agent\run-all-e2e-tests

- **Duration**: 93ms
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contacts-crud

- **Duration**: 57ms
- **Exit Code**: 0

**Error Output:**
```
[Contacts CRUD Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\e2e-billing

- **Duration**: 54ms
- **Exit Code**: 0

**Error Output:**
```
[Billing Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\e2e-templates-warmth-pipelines

- **Duration**: 53ms
- **Exit Code**: 0

**Error Output:**
```
[Templates/Warmth/Pipelines Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\frontend_api_smoke

- **Duration**: 51ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-analysis

- **Duration**: 50ms
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contact-files

- **Duration**: 50ms
- **Exit Code**: 0

**Error Output:**
```
[Contact Files Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\e2e-interactions

- **Duration**: 50ms
- **Exit Code**: 0

**Error Output:**
```
[Interactions Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\entitlements-cross-platform

- **Duration**: 50ms
- **Exit Code**: 0

**Error Output:**
```
[Entitlements Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\agent-screenshot-tier-limits

- **Duration**: 46ms
- **Exit Code**: 0

---

### ✅ test\agent\e2e-user-system

- **Duration**: 44ms
- **Exit Code**: 0

**Error Output:**
```
[User/System Test Failed] Missing env: TEST_EMAIL
```

---

### ✅ test\agent\check-contacts-schema

- **Duration**: 42ms
- **Exit Code**: 0

**Error Output:**
```
Error: Missing env: TEST_EMAIL
    at getEnv (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:30:58)
    at getAccessToken (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/_shared.mjs:38:28)
    at async checkSchema (file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/check-contacts-schema.mjs:6:17)
```

---


## Environment

- **Backend**: N/A
- **Origin**: N/A
- **Supabase**: N/A
- **Node**: v23.3.0

---

## Test Coverage

This unified report covers:
- ✅ Agent chat and conversation
- ✅ Contact analysis and insights
- ✅ Message composition and goals
- ✅ Persona notes management
- ✅ Screenshot analysis
- ✅ Action suggestions
- ✅ Tag updates
- ✅ Interaction summaries
- ✅ Cross-platform entitlements
- ✅ AI context and actions

## ⚠️ Failed Tests Require Attention

Please review the error logs above for failed tests.
Common issues:
- Missing environment variables
- API endpoint changes
- Authentication failures
- Network timeouts
