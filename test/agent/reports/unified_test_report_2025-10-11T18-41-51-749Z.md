# Unified Agent Test Report

**Generated**: 2025-10-11T18:41:51.750Z

## Summary

- **Total Tests**: 19
- **Passed**: ✅ 13
- **Failed**: ❌ 6
- **Success Rate**: 68.4%
- **Total Duration**: 77.52s

## Test Results Summary

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\e2e-templates-warmth-pipelines | ❌ FAIL | 1.60s | 1 |
| test\agent\e2e-user-system | ❌ FAIL | 1.54s | 1 |
| test\agent\e2e-contacts-crud | ❌ FAIL | 1.46s | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 1.14s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 760ms | 1 |
| test\agent\performance-benchmarks | ❌ FAIL | 605ms | 3221226505 |
| test\agent\agent-analyze-contact | ✅ PASS | 16.36s | 0 |
| test\agent\agent-suggest-actions | ✅ PASS | 15.09s | 0 |
| test\agent\ai-context-actions.smoke | ✅ PASS | 9.11s | 0 |
| test\agent\agent-contact-details | ✅ PASS | 5.25s | 0 |
| test\agent\agent-interactions-summary | ✅ PASS | 5.19s | 0 |
| test\agent\agent-compose-prepare-send | ✅ PASS | 4.66s | 0 |
| test\agent\agent-message-goals | ✅ PASS | 4.20s | 0 |
| test\agent\agent-update-tags | ✅ PASS | 3.40s | 0 |
| test\agent\agent-persona-notes | ✅ PASS | 3.38s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.87s | 0 |
| test\agent\e2e-billing | ✅ PASS | 1.81s | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 45ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 39ms | 0 |

---

## Detailed Test Reports

> **Note**: This section combines all individual test reports for comprehensive review.

### ❌ test\agent\e2e-templates-warmth-pipelines

- **Duration**: 1.60s
- **Exit Code**: 1

**Error Output:**
```
❌ Some templates/warmth/pipelines tests failed
```

---

### ❌ test\agent\e2e-user-system

- **Duration**: 1.54s
- **Exit Code**: 1

**Error Output:**
```
❌ Some user/system tests failed
```

---

### ❌ test\agent\e2e-contacts-crud

- **Duration**: 1.46s
- **Exit Code**: 1

**Error Output:**
```
❌ Some contacts CRUD tests failed
```

---

### ❌ test\agent\e2e-advanced-features

- **Duration**: 1.14s
- **Exit Code**: 1

**Error Output:**
```
❌ Some advanced features tests failed
```

---

### ❌ test\agent\e2e-interactions

- **Duration**: 760ms
- **Exit Code**: 1

**Error Output:**
```
❌ Some interactions tests failed
```

---

### ❌ test\agent\performance-benchmarks

- **Duration**: 605ms
- **Exit Code**: 3221226505

**Error Output:**
```
❌ Setup failed: Failed to parse URL from undefined/api/v1/contacts
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76
```

---

### ✅ test\agent\agent-analyze-contact

- **Duration**: 16.36s
- **Exit Code**: 0

---

### ✅ test\agent\agent-suggest-actions

- **Duration**: 15.09s
- **Exit Code**: 0

---

### ✅ test\agent\ai-context-actions.smoke

- **Duration**: 9.11s
- **Exit Code**: 0

---

### ✅ test\agent\agent-contact-details

- **Duration**: 5.25s
- **Exit Code**: 0

---

### ✅ test\agent\agent-interactions-summary

- **Duration**: 5.19s
- **Exit Code**: 0

---

### ✅ test\agent\agent-compose-prepare-send

- **Duration**: 4.66s
- **Exit Code**: 0

---

### ✅ test\agent\agent-message-goals

- **Duration**: 4.20s
- **Exit Code**: 0

---

### ✅ test\agent\agent-update-tags

- **Duration**: 3.40s
- **Exit Code**: 0

---

### ✅ test\agent\agent-persona-notes

- **Duration**: 3.38s
- **Exit Code**: 0

---

### ✅ test\agent\entitlements-cross-platform

- **Duration**: 1.87s
- **Exit Code**: 0

---

### ✅ test\agent\e2e-billing

- **Duration**: 1.81s
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-analysis

- **Duration**: 45ms
- **Exit Code**: 0

---

### ✅ test\agent\agent-screenshot-tier-limits

- **Duration**: 39ms
- **Exit Code**: 0

---


## Environment

- **Backend**: https://ever-reach-be.vercel.app/api
- **Origin**: https://everreach.app
- **Supabase**: https://utasetfxiqcrnwyfforx.supabase.co
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
