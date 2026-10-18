# Unified Agent Test Report

**Generated**: 2025-10-21T03:53:30.316Z

## Summary

- **Total Tests**: 39
- **Passed**: ✅ 12
- **Failed**: ❌ 27
- **Success Rate**: 30.8%
- **Total Duration**: 65.28s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\performance-benchmarks | ❌ FAIL | 24.11s | 1 |
| test\agent\cors-validation | ❌ FAIL | 4.25s | 1 |
| test\agent\e2e-templates-warmth-pipelines | ❌ FAIL | 3.52s | 1 |
| test\agent\e2e-screenshot-analysis | ❌ FAIL | 2.42s | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 2.30s | 1 |
| test\agent\e2e-user-system | ❌ FAIL | 1.99s | 1 |
| test\agent\e2e-trial-expiration | ❌ FAIL | 1.57s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 1.39s | 1 |
| test\agent\agent-analyze-contact | ❌ FAIL | 1.22s | 1 |
| test\agent\e2e-multi-channel-campaigns | ❌ FAIL | 856ms | 1 |
| test\agent\agent-interactions-summary | ❌ FAIL | 532ms | 1 |
| test\agent\agent-contact-details | ❌ FAIL | 523ms | 1 |
| test\agent\agent-message-goals | ❌ FAIL | 506ms | 1 |
| test\agent\agent-persona-notes | ❌ FAIL | 504ms | 1 |
| test\agent\agent-compose-prepare-send | ❌ FAIL | 492ms | 1 |
| test\agent\agent-suggest-actions | ❌ FAIL | 465ms | 1 |
| test\agent\e2e-contact-lifecycle-complete | ❌ FAIL | 461ms | 1 |
| test\agent\agent-update-tags | ❌ FAIL | 458ms | 1 |
| test\agent\lifecycle-posthog-webhook | ❌ FAIL | 422ms | 1 |
| test\agent\lifecycle-email-worker | ❌ FAIL | 388ms | 3221226505 |
| test\agent\lifecycle-sms-worker | ❌ FAIL | 333ms | 3221226505 |
| test\agent\lifecycle-campaigns | ❌ FAIL | 331ms | 3221226505 |
| test\agent\lifecycle-end-to-end | ❌ FAIL | 327ms | 3221226505 |
| test\agent\backend-tracking-events | ❌ FAIL | 92ms | 1 |
| test\agent\backend-cron-jobs | ❌ FAIL | 80ms | 1 |
| test\agent\backend-tracking-identify | ❌ FAIL | 76ms | 1 |
| test\agent\ai-context-actions.smoke | ❌ FAIL | 53ms | 1 |
| test\agent\schema-smoke | ✅ PASS | 4.26s | 0 |
| test\agent\lifecycle-segments | ✅ PASS | 2.79s | 0 |
| test\agent\e2e-billing | ✅ PASS | 2.06s | 0 |
| test\agent\e2e-contacts-crud | ✅ PASS | 1.79s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.70s | 0 |
| test\agent\e2e-contact-files | ✅ PASS | 1.43s | 0 |
| test\agent\e2e-warmth-tracking | ✅ PASS | 890ms | 0 |
| test\agent\check-contacts-schema | ✅ PASS | 465ms | 0 |
| test\agent\run-all-e2e-tests | ✅ PASS | 101ms | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 45ms | 0 |
| test\agent\frontend_api_smoke | ✅ PASS | 43ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 42ms | 0 |

---

## Detailed Test Reports

> **Note**: This section combines all individual test reports for comprehensive review.

### ❌ test\agent\performance-benchmarks

- **Duration**: 24.11s
- **Exit Code**: 1

---

### ❌ test\agent\cors-validation

- **Duration**: 4.25s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-templates-warmth-pipelines

- **Duration**: 3.52s
- **Exit Code**: 1

**Error Output:**
```
❌ Some templates/warmth/pipelines tests failed
```

---

### ❌ test\agent\e2e-screenshot-analysis

- **Duration**: 2.42s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-advanced-features

- **Duration**: 2.30s
- **Exit Code**: 1

**Error Output:**
```
❌ Some advanced features tests failed
```

---

### ❌ test\agent\e2e-user-system

- **Duration**: 1.99s
- **Exit Code**: 1

**Error Output:**
```
❌ Some user/system tests failed
```

---

### ❌ test\agent\e2e-trial-expiration

- **Duration**: 1.57s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-interactions

- **Duration**: 1.39s
- **Exit Code**: 1

**Error Output:**
```
❌ Some interactions tests failed
```

---

### ❌ test\agent\agent-analyze-contact

- **Duration**: 1.22s
- **Exit Code**: 1

**Error Output:**
```
[agent-analyze-contact] failed: ensureContact failed: 405
```

---

### ❌ test\agent\e2e-multi-channel-campaigns

- **Duration**: 856ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-interactions-summary

- **Duration**: 532ms
- **Exit Code**: 1

**Error Output:**
```
[agent-interactions-summary] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-contact-details

- **Duration**: 523ms
- **Exit Code**: 1

**Error Output:**
```
[agent-contact-details] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-message-goals

- **Duration**: 506ms
- **Exit Code**: 1

**Error Output:**
```
[agent-message-goals] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-persona-notes

- **Duration**: 504ms
- **Exit Code**: 1

**Error Output:**
```
[agent-persona-notes] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-compose-prepare-send

- **Duration**: 492ms
- **Exit Code**: 1

**Error Output:**
```
[agent-compose-prepare-send] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-suggest-actions

- **Duration**: 465ms
- **Exit Code**: 1

**Error Output:**
```
[agent-suggest-actions] failed: ensureContact failed: 405
```

---

### ❌ test\agent\e2e-contact-lifecycle-complete

- **Duration**: 461ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-update-tags

- **Duration**: 458ms
- **Exit Code**: 1

**Error Output:**
```
[agent-update-tags] failed: ensureContact failed: 405
```

---

### ❌ test\agent\lifecycle-posthog-webhook

- **Duration**: 422ms
- **Exit Code**: 1

---

### ❌ test\agent\lifecycle-email-worker

- **Duration**: 388ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-sms-worker

- **Duration**: 333ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-campaigns

- **Duration**: 331ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-end-to-end

- **Duration**: 327ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\backend-tracking-events

- **Duration**: 92ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-cron-jobs

- **Duration**: 80ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-tracking-identify

- **Duration**: 76ms
- **Exit Code**: 1

---

### ❌ test\agent\ai-context-actions.smoke

- **Duration**: 53ms
- **Exit Code**: 1

**Error Output:**
```
[AI Smoke Test Failed] Missing env: SUPABASE_URL
```

---

### ✅ test\agent\schema-smoke

- **Duration**: 4.26s
- **Exit Code**: 0

---

### ✅ test\agent\lifecycle-segments

- **Duration**: 2.79s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-billing

- **Duration**: 2.06s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contacts-crud

- **Duration**: 1.79s
- **Exit Code**: 0

---

### ✅ test\agent\entitlements-cross-platform

- **Duration**: 1.70s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contact-files

- **Duration**: 1.43s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-warmth-tracking

- **Duration**: 890ms
- **Exit Code**: 0

---

### ✅ test\agent\check-contacts-schema

- **Duration**: 465ms
- **Exit Code**: 0

---

### ✅ test\agent\run-all-e2e-tests

- **Duration**: 101ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-analysis

- **Duration**: 45ms
- **Exit Code**: 0

---

### ✅ test\agent\frontend_api_smoke

- **Duration**: 43ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-tier-limits

- **Duration**: 42ms
- **Exit Code**: 0

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
