# Unified Agent Test Report

**Generated**: 2025-10-21T21:03:11.390Z

## Summary

- **Total Tests**: 41
- **Passed**: ✅ 15
- **Failed**: ❌ 26
- **Success Rate**: 36.6%
- **Total Duration**: 80.79s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\performance-benchmarks | ❌ FAIL | 24.37s | 1 |
| test\agent\cors-validation | ❌ FAIL | 2.94s | 1 |
| test\agent\e2e-user-system | ❌ FAIL | 2.23s | 1 |
| test\agent\e2e-screenshot-analysis | ❌ FAIL | 2.10s | 1 |
| test\agent\e2e-trial-expiration | ❌ FAIL | 1.99s | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 1.82s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 1.66s | 1 |
| test\agent\e2e-multi-channel-campaigns | ❌ FAIL | 810ms | 1 |
| test\agent\agent-compose-prepare-send | ❌ FAIL | 592ms | 1 |
| test\agent\agent-persona-notes | ❌ FAIL | 577ms | 1 |
| test\agent\agent-analyze-contact | ❌ FAIL | 565ms | 1 |
| test\agent\agent-contact-details | ❌ FAIL | 519ms | 1 |
| test\agent\agent-update-tags | ❌ FAIL | 512ms | 1 |
| test\agent\e2e-contact-lifecycle-complete | ❌ FAIL | 505ms | 1 |
| test\agent\agent-interactions-summary | ❌ FAIL | 482ms | 1 |
| test\agent\agent-message-goals | ❌ FAIL | 472ms | 1 |
| test\agent\agent-suggest-actions | ❌ FAIL | 440ms | 1 |
| test\agent\lifecycle-posthog-webhook | ❌ FAIL | 438ms | 1 |
| test\agent\lifecycle-campaigns | ❌ FAIL | 427ms | 3221226505 |
| test\agent\lifecycle-end-to-end | ❌ FAIL | 403ms | 3221226505 |
| test\agent\lifecycle-sms-worker | ❌ FAIL | 358ms | 3221226505 |
| test\agent\lifecycle-email-worker | ❌ FAIL | 344ms | 3221226505 |
| test\agent\backend-tracking-events | ❌ FAIL | 98ms | 1 |
| test\agent\backend-tracking-identify | ❌ FAIL | 96ms | 1 |
| test\agent\backend-cron-jobs | ❌ FAIL | 79ms | 1 |
| test\agent\ai-context-actions.smoke | ❌ FAIL | 61ms | 1 |
| test\agent\screenshot-analysis-focused | ✅ PASS | 10.90s | 0 |
| test\agent\schema-smoke | ✅ PASS | 5.87s | 0 |
| test\agent\e2e-templates-warmth-pipelines | ✅ PASS | 5.31s | 0 |
| test\agent\lifecycle-segments | ✅ PASS | 2.91s | 0 |
| test\agent\e2e-billing | ✅ PASS | 2.32s | 0 |
| test\agent\e2e-contacts-crud | ✅ PASS | 2.00s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.88s | 0 |
| test\agent\templates-focused | ✅ PASS | 1.49s | 0 |
| test\agent\e2e-contact-files | ✅ PASS | 1.44s | 0 |
| test\agent\e2e-warmth-tracking | ✅ PASS | 1.00s | 0 |
| test\agent\check-contacts-schema | ✅ PASS | 469ms | 0 |
| test\agent\run-all-e2e-tests | ✅ PASS | 127ms | 0 |
| test\agent\frontend_api_smoke | ✅ PASS | 62ms | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 60ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 52ms | 0 |

---

## Detailed Test Reports

> **Note**: This section combines all individual test reports for comprehensive review.

### ❌ test\agent\performance-benchmarks

- **Duration**: 24.37s
- **Exit Code**: 1

---

### ❌ test\agent\cors-validation

- **Duration**: 2.94s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-user-system

- **Duration**: 2.23s
- **Exit Code**: 1

**Error Output:**
```
❌ Some user/system tests failed
```

---

### ❌ test\agent\e2e-screenshot-analysis

- **Duration**: 2.10s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-trial-expiration

- **Duration**: 1.99s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-advanced-features

- **Duration**: 1.82s
- **Exit Code**: 1

**Error Output:**
```
❌ Some advanced features tests failed
```

---

### ❌ test\agent\e2e-interactions

- **Duration**: 1.66s
- **Exit Code**: 1

**Error Output:**
```
❌ Some interactions tests failed
```

---

### ❌ test\agent\e2e-multi-channel-campaigns

- **Duration**: 810ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-compose-prepare-send

- **Duration**: 592ms
- **Exit Code**: 1

**Error Output:**
```
[agent-compose-prepare-send] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-persona-notes

- **Duration**: 577ms
- **Exit Code**: 1

**Error Output:**
```
[agent-persona-notes] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-analyze-contact

- **Duration**: 565ms
- **Exit Code**: 1

**Error Output:**
```
[agent-analyze-contact] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-contact-details

- **Duration**: 519ms
- **Exit Code**: 1

**Error Output:**
```
[agent-contact-details] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-update-tags

- **Duration**: 512ms
- **Exit Code**: 1

**Error Output:**
```
[agent-update-tags] failed: ensureContact failed: 405
```

---

### ❌ test\agent\e2e-contact-lifecycle-complete

- **Duration**: 505ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-interactions-summary

- **Duration**: 482ms
- **Exit Code**: 1

**Error Output:**
```
[agent-interactions-summary] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-message-goals

- **Duration**: 472ms
- **Exit Code**: 1

**Error Output:**
```
[agent-message-goals] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-suggest-actions

- **Duration**: 440ms
- **Exit Code**: 1

**Error Output:**
```
[agent-suggest-actions] failed: ensureContact failed: 405
```

---

### ❌ test\agent\lifecycle-posthog-webhook

- **Duration**: 438ms
- **Exit Code**: 1

---

### ❌ test\agent\lifecycle-campaigns

- **Duration**: 427ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-end-to-end

- **Duration**: 403ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-sms-worker

- **Duration**: 358ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\lifecycle-email-worker

- **Duration**: 344ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\backend-tracking-events

- **Duration**: 98ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-tracking-identify

- **Duration**: 96ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-cron-jobs

- **Duration**: 79ms
- **Exit Code**: 1

---

### ❌ test\agent\ai-context-actions.smoke

- **Duration**: 61ms
- **Exit Code**: 1

**Error Output:**
```
[AI Smoke Test Failed] Missing env: SUPABASE_URL
```

---

### ✅ test\agent\screenshot-analysis-focused

- **Duration**: 10.90s
- **Exit Code**: 0

---

### ✅ test\agent\schema-smoke

- **Duration**: 5.87s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-templates-warmth-pipelines

- **Duration**: 5.31s
- **Exit Code**: 0

---

### ✅ test\agent\lifecycle-segments

- **Duration**: 2.91s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-billing

- **Duration**: 2.32s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contacts-crud

- **Duration**: 2.00s
- **Exit Code**: 0

---

### ✅ test\agent\entitlements-cross-platform

- **Duration**: 1.88s
- **Exit Code**: 0

---

### ✅ test\agent\templates-focused

- **Duration**: 1.49s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contact-files

- **Duration**: 1.44s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-warmth-tracking

- **Duration**: 1.00s
- **Exit Code**: 0

---

### ✅ test\agent\check-contacts-schema

- **Duration**: 469ms
- **Exit Code**: 0

---

### ✅ test\agent\run-all-e2e-tests

- **Duration**: 127ms
- **Exit Code**: 0

---

### ✅ test\agent\frontend_api_smoke

- **Duration**: 62ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-analysis

- **Duration**: 60ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-tier-limits

- **Duration**: 52ms
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
