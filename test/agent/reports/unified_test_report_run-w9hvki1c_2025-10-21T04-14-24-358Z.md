# Unified Agent Test Report

**Generated**: 2025-10-21T04:14:24.359Z

## Summary

- **Total Tests**: 40
- **Passed**: ✅ 13
- **Failed**: ❌ 27
- **Success Rate**: 32.5%
- **Total Duration**: 74.13s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\performance-benchmarks | ❌ FAIL | 28.52s | 1 |
| test\agent\e2e-templates-warmth-pipelines | ❌ FAIL | 4.07s | 1 |
| test\agent\cors-validation | ❌ FAIL | 3.83s | 1 |
| test\agent\e2e-screenshot-analysis | ❌ FAIL | 2.50s | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 1.95s | 1 |
| test\agent\e2e-user-system | ❌ FAIL | 1.95s | 1 |
| test\agent\e2e-trial-expiration | ❌ FAIL | 1.57s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 1.55s | 1 |
| test\agent\e2e-multi-channel-campaigns | ❌ FAIL | 849ms | 1 |
| test\agent\agent-analyze-contact | ❌ FAIL | 531ms | 1 |
| test\agent\agent-persona-notes | ❌ FAIL | 520ms | 1 |
| test\agent\agent-suggest-actions | ❌ FAIL | 494ms | 1 |
| test\agent\agent-contact-details | ❌ FAIL | 467ms | 1 |
| test\agent\e2e-contact-lifecycle-complete | ❌ FAIL | 462ms | 1 |
| test\agent\agent-compose-prepare-send | ❌ FAIL | 457ms | 1 |
| test\agent\agent-update-tags | ❌ FAIL | 453ms | 1 |
| test\agent\lifecycle-campaigns | ❌ FAIL | 442ms | 3221226505 |
| test\agent\agent-interactions-summary | ❌ FAIL | 441ms | 1 |
| test\agent\agent-message-goals | ❌ FAIL | 440ms | 1 |
| test\agent\lifecycle-posthog-webhook | ❌ FAIL | 396ms | 1 |
| test\agent\lifecycle-end-to-end | ❌ FAIL | 367ms | 3221226505 |
| test\agent\lifecycle-sms-worker | ❌ FAIL | 358ms | 3221226505 |
| test\agent\lifecycle-email-worker | ❌ FAIL | 356ms | 3221226505 |
| test\agent\backend-tracking-identify | ❌ FAIL | 93ms | 1 |
| test\agent\backend-tracking-events | ❌ FAIL | 89ms | 1 |
| test\agent\backend-cron-jobs | ❌ FAIL | 88ms | 1 |
| test\agent\ai-context-actions.smoke | ❌ FAIL | 71ms | 1 |
| test\agent\screenshot-analysis-focused | ✅ PASS | 5.54s | 0 |
| test\agent\schema-smoke | ✅ PASS | 4.42s | 0 |
| test\agent\e2e-billing | ✅ PASS | 2.32s | 0 |
| test\agent\lifecycle-segments | ✅ PASS | 2.29s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.75s | 0 |
| test\agent\e2e-contacts-crud | ✅ PASS | 1.66s | 0 |
| test\agent\e2e-contact-files | ✅ PASS | 1.34s | 0 |
| test\agent\e2e-warmth-tracking | ✅ PASS | 780ms | 0 |
| test\agent\check-contacts-schema | ✅ PASS | 428ms | 0 |
| test\agent\run-all-e2e-tests | ✅ PASS | 108ms | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 65ms | 0 |
| test\agent\frontend_api_smoke | ✅ PASS | 61ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 59ms | 0 |

---

## Detailed Test Reports

> **Note**: This section combines all individual test reports for comprehensive review.

### ❌ test\agent\performance-benchmarks

- **Duration**: 28.52s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-templates-warmth-pipelines

- **Duration**: 4.07s
- **Exit Code**: 1

**Error Output:**
```
❌ Some templates/warmth/pipelines tests failed
```

---

### ❌ test\agent\cors-validation

- **Duration**: 3.83s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-screenshot-analysis

- **Duration**: 2.50s
- **Exit Code**: 1

---

### ❌ test\agent\e2e-advanced-features

- **Duration**: 1.95s
- **Exit Code**: 1

**Error Output:**
```
❌ Some advanced features tests failed
```

---

### ❌ test\agent\e2e-user-system

- **Duration**: 1.95s
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

- **Duration**: 1.55s
- **Exit Code**: 1

**Error Output:**
```
❌ Some interactions tests failed
```

---

### ❌ test\agent\e2e-multi-channel-campaigns

- **Duration**: 849ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-analyze-contact

- **Duration**: 531ms
- **Exit Code**: 1

**Error Output:**
```
[agent-analyze-contact] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-persona-notes

- **Duration**: 520ms
- **Exit Code**: 1

**Error Output:**
```
[agent-persona-notes] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-suggest-actions

- **Duration**: 494ms
- **Exit Code**: 1

**Error Output:**
```
[agent-suggest-actions] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-contact-details

- **Duration**: 467ms
- **Exit Code**: 1

**Error Output:**
```
[agent-contact-details] failed: ensureContact failed: 405
```

---

### ❌ test\agent\e2e-contact-lifecycle-complete

- **Duration**: 462ms
- **Exit Code**: 1

---

### ❌ test\agent\agent-compose-prepare-send

- **Duration**: 457ms
- **Exit Code**: 1

**Error Output:**
```
[agent-compose-prepare-send] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-update-tags

- **Duration**: 453ms
- **Exit Code**: 1

**Error Output:**
```
[agent-update-tags] failed: ensureContact failed: 405
```

---

### ❌ test\agent\lifecycle-campaigns

- **Duration**: 442ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\agent-interactions-summary

- **Duration**: 441ms
- **Exit Code**: 1

**Error Output:**
```
[agent-interactions-summary] failed: ensureContact failed: 405
```

---

### ❌ test\agent\agent-message-goals

- **Duration**: 440ms
- **Exit Code**: 1

**Error Output:**
```
[agent-message-goals] failed: ensureContact failed: 405
```

---

### ❌ test\agent\lifecycle-posthog-webhook

- **Duration**: 396ms
- **Exit Code**: 1

---

### ❌ test\agent\lifecycle-end-to-end

- **Duration**: 367ms
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

- **Duration**: 356ms
- **Exit Code**: 3221226505

**Error Output:**
```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ❌ test\agent\backend-tracking-identify

- **Duration**: 93ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-tracking-events

- **Duration**: 89ms
- **Exit Code**: 1

---

### ❌ test\agent\backend-cron-jobs

- **Duration**: 88ms
- **Exit Code**: 1

---

### ❌ test\agent\ai-context-actions.smoke

- **Duration**: 71ms
- **Exit Code**: 1

**Error Output:**
```
[AI Smoke Test Failed] Missing env: SUPABASE_URL
```

---

### ✅ test\agent\screenshot-analysis-focused

- **Duration**: 5.54s
- **Exit Code**: 0

---

### ✅ test\agent\schema-smoke

- **Duration**: 4.42s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-billing

- **Duration**: 2.32s
- **Exit Code**: 0

---

### ✅ test\agent\lifecycle-segments

- **Duration**: 2.29s
- **Exit Code**: 0

---

### ✅ test\agent\entitlements-cross-platform

- **Duration**: 1.75s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contacts-crud

- **Duration**: 1.66s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-contact-files

- **Duration**: 1.34s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-warmth-tracking

- **Duration**: 780ms
- **Exit Code**: 0

---

### ✅ test\agent\check-contacts-schema

- **Duration**: 428ms
- **Exit Code**: 0

---

### ✅ test\agent\run-all-e2e-tests

- **Duration**: 108ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-analysis

- **Duration**: 65ms
- **Exit Code**: 0

---

### ✅ test\agent\frontend_api_smoke

- **Duration**: 61ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-tier-limits

- **Duration**: 59ms
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
