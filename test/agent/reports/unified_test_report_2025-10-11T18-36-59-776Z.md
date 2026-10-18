# Unified Agent Test Report

**Generated**: 2025-10-11T18:36:59.776Z

## Summary

- **Total Tests**: 19
- **Passed**: ✅ 13
- **Failed**: ❌ 6
- **Success Rate**: 68.4%
- **Total Duration**: 73.42s

## Test Results

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\e2e-user-system | ❌ FAIL | 1.72s | 1 |
| test\agent\e2e-contacts-crud | ❌ FAIL | 1.71s | 1 |
| test\agent\e2e-templates-warmth-pipelines | ❌ FAIL | 1.65s | 1 |
| test\agent\e2e-advanced-features | ❌ FAIL | 1.46s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 803ms | 1 |
| test\agent\performance-benchmarks | ❌ FAIL | 479ms | 3221226505 |
| test\agent\agent-suggest-actions | ✅ PASS | 13.63s | 0 |
| test\agent\agent-analyze-contact | ✅ PASS | 11.66s | 0 |
| test\agent\ai-context-actions.smoke | ✅ PASS | 10.30s | 0 |
| test\agent\agent-interactions-summary | ✅ PASS | 5.78s | 0 |
| test\agent\agent-message-goals | ✅ PASS | 4.89s | 0 |
| test\agent\agent-contact-details | ✅ PASS | 4.78s | 0 |
| test\agent\agent-compose-prepare-send | ✅ PASS | 4.54s | 0 |
| test\agent\agent-persona-notes | ✅ PASS | 3.28s | 0 |
| test\agent\agent-update-tags | ✅ PASS | 3.06s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.81s | 0 |
| test\agent\e2e-billing | ✅ PASS | 1.79s | 0 |
| test\agent\agent-screenshot-analysis | ✅ PASS | 44ms | 0 |
| test\agent\agent-screenshot-tier-limits | ✅ PASS | 38ms | 0 |

---

## Detailed Results

### ❌ test\agent\e2e-user-system

- **File**: `test\agent\e2e-user-system.mjs`
- **Status**: FAILED
- **Duration**: 1.72s
- **Exit Code**: 1

#### Error Output

```
❌ Some user/system tests failed

```

### ❌ test\agent\e2e-contacts-crud

- **File**: `test\agent\e2e-contacts-crud.mjs`
- **Status**: FAILED
- **Duration**: 1.71s
- **Exit Code**: 1

#### Error Output

```
❌ Some contacts CRUD tests failed

```

### ❌ test\agent\e2e-templates-warmth-pipelines

- **File**: `test\agent\e2e-templates-warmth-pipelines.mjs`
- **Status**: FAILED
- **Duration**: 1.65s
- **Exit Code**: 1

#### Error Output

```
❌ Some templates/warmth/pipelines tests failed

```

### ❌ test\agent\e2e-advanced-features

- **File**: `test\agent\e2e-advanced-features.mjs`
- **Status**: FAILED
- **Duration**: 1.46s
- **Exit Code**: 1

#### Error Output

```
❌ Some advanced features tests failed

```

### ❌ test\agent\e2e-interactions

- **File**: `test\agent\e2e-interactions.mjs`
- **Status**: FAILED
- **Duration**: 803ms
- **Exit Code**: 1

#### Error Output

```
❌ Some interactions tests failed

```

### ❌ test\agent\performance-benchmarks

- **File**: `test\agent\performance-benchmarks.mjs`
- **Status**: FAILED
- **Duration**: 479ms
- **Exit Code**: 3221226505

#### Error Output

```
❌ Setup failed: Failed to parse URL from undefined/api/v1/contacts
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file c:\ws\deps\uv\src\win\async.c, line 76

```

### ✅ test\agent\agent-suggest-actions

- **File**: `test\agent\agent-suggest-actions.mjs`
- **Status**: PASSED
- **Duration**: 13.63s
- **Exit Code**: 0

### ✅ test\agent\agent-analyze-contact

- **File**: `test\agent\agent-analyze-contact.mjs`
- **Status**: PASSED
- **Duration**: 11.66s
- **Exit Code**: 0

### ✅ test\agent\ai-context-actions.smoke

- **File**: `test\agent\ai-context-actions.smoke.mjs`
- **Status**: PASSED
- **Duration**: 10.30s
- **Exit Code**: 0

### ✅ test\agent\agent-interactions-summary

- **File**: `test\agent\agent-interactions-summary.mjs`
- **Status**: PASSED
- **Duration**: 5.78s
- **Exit Code**: 0

### ✅ test\agent\agent-message-goals

- **File**: `test\agent\agent-message-goals.mjs`
- **Status**: PASSED
- **Duration**: 4.89s
- **Exit Code**: 0

### ✅ test\agent\agent-contact-details

- **File**: `test\agent\agent-contact-details.mjs`
- **Status**: PASSED
- **Duration**: 4.78s
- **Exit Code**: 0

### ✅ test\agent\agent-compose-prepare-send

- **File**: `test\agent\agent-compose-prepare-send.mjs`
- **Status**: PASSED
- **Duration**: 4.54s
- **Exit Code**: 0

### ✅ test\agent\agent-persona-notes

- **File**: `test\agent\agent-persona-notes.mjs`
- **Status**: PASSED
- **Duration**: 3.28s
- **Exit Code**: 0

### ✅ test\agent\agent-update-tags

- **File**: `test\agent\agent-update-tags.mjs`
- **Status**: PASSED
- **Duration**: 3.06s
- **Exit Code**: 0

### ✅ test\agent\entitlements-cross-platform

- **File**: `test\agent\entitlements-cross-platform.mjs`
- **Status**: PASSED
- **Duration**: 1.81s
- **Exit Code**: 0

### ✅ test\agent\e2e-billing

- **File**: `test\agent\e2e-billing.mjs`
- **Status**: PASSED
- **Duration**: 1.79s
- **Exit Code**: 0

### ✅ test\agent\agent-screenshot-analysis

- **File**: `test\agent\agent-screenshot-analysis.mjs`
- **Status**: PASSED
- **Duration**: 44ms
- **Exit Code**: 0

### ✅ test\agent\agent-screenshot-tier-limits

- **File**: `test\agent\agent-screenshot-tier-limits.mjs`
- **Status**: PASSED
- **Duration**: 38ms
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
