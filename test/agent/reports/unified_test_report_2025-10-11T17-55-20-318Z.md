# Unified Agent Test Report

**Generated**: 2025-10-11T17:55:20.319Z

## Summary

- **Total Tests**: 17
- **Passed**: ✅ 11
- **Failed**: ❌ 6
- **Success Rate**: 64.7%
- **Total Duration**: 71.08s

## Test Results

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\e2e-user-system | ❌ FAIL | 2.08s | 1 |
| test\agent\e2e-templates-warmth-pipelines | ❌ FAIL | 1.74s | 1 |
| test\agent\e2e-contacts-crud | ❌ FAIL | 1.63s | 1 |
| test\agent\e2e-interactions | ❌ FAIL | 756ms | 1 |
| test\agent\agent-screenshot-analysis | ❌ FAIL | 65ms | 1 |
| test\agent\agent-screenshot-tier-limits | ❌ FAIL | 62ms | 1 |
| test\agent\agent-suggest-actions | ✅ PASS | 12.95s | 0 |
| test\agent\agent-analyze-contact | ✅ PASS | 11.78s | 0 |
| test\agent\ai-context-actions.smoke | ✅ PASS | 9.08s | 0 |
| test\agent\agent-interactions-summary | ✅ PASS | 5.88s | 0 |
| test\agent\agent-message-goals | ✅ PASS | 5.34s | 0 |
| test\agent\agent-contact-details | ✅ PASS | 4.71s | 0 |
| test\agent\agent-compose-prepare-send | ✅ PASS | 4.10s | 0 |
| test\agent\agent-persona-notes | ✅ PASS | 3.94s | 0 |
| test\agent\agent-update-tags | ✅ PASS | 3.06s | 0 |
| test\agent\e2e-billing | ✅ PASS | 2.03s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 1.88s | 0 |

---

## Detailed Results

### ❌ test\agent\e2e-user-system

- **File**: `test\agent\e2e-user-system.mjs`
- **Status**: FAILED
- **Duration**: 2.08s
- **Exit Code**: 1

#### Error Output

```
❌ Some user/system tests failed

```

### ❌ test\agent\e2e-templates-warmth-pipelines

- **File**: `test\agent\e2e-templates-warmth-pipelines.mjs`
- **Status**: FAILED
- **Duration**: 1.74s
- **Exit Code**: 1

#### Error Output

```
❌ Some templates/warmth/pipelines tests failed

```

### ❌ test\agent\e2e-contacts-crud

- **File**: `test\agent\e2e-contacts-crud.mjs`
- **Status**: FAILED
- **Duration**: 1.63s
- **Exit Code**: 1

#### Error Output

```
❌ Some contacts CRUD tests failed

```

### ❌ test\agent\e2e-interactions

- **File**: `test\agent\e2e-interactions.mjs`
- **Status**: FAILED
- **Duration**: 756ms
- **Exit Code**: 1

#### Error Output

```
❌ Some interactions tests failed

```

### ❌ test\agent\agent-screenshot-analysis

- **File**: `test\agent\agent-screenshot-analysis.mjs`
- **Status**: FAILED
- **Duration**: 65ms
- **Exit Code**: 1

#### Error Output

```
file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/agent-screenshot-analysis.mjs:8
import { apiFetch, getAuthHeaders } from './_shared.mjs';
                   ^^^^^^^^^^^^^^
SyntaxError: The requested module './_shared.mjs' does not provide an export named 'getAuthHeaders'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:263:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:547:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5)

Node.js v23.3.0

```

### ❌ test\agent\agent-screenshot-tier-limits

- **File**: `test\agent\agent-screenshot-tier-limits.mjs`
- **Status**: FAILED
- **Duration**: 62ms
- **Exit Code**: 1

#### Error Output

```
file:///C:/Users/Isaia/Documents/Coding/PersonalCRM/test/agent/agent-screenshot-tier-limits.mjs:10
import { apiFetch, getAuthHeaders } from './_shared.mjs';
                   ^^^^^^^^^^^^^^
SyntaxError: The requested module './_shared.mjs' does not provide an export named 'getAuthHeaders'
    at ModuleJob._instantiate (node:internal/modules/esm/module_job:180:21)
    at async ModuleJob.run (node:internal/modules/esm/module_job:263:5)
    at async onImport.tracePromise.__proto__ (node:internal/modules/esm/loader:547:26)
    at async asyncRunEntryPointWithESMLoader (node:internal/modules/run_main:116:5)

Node.js v23.3.0

```

### ✅ test\agent\agent-suggest-actions

- **File**: `test\agent\agent-suggest-actions.mjs`
- **Status**: PASSED
- **Duration**: 12.95s
- **Exit Code**: 0

### ✅ test\agent\agent-analyze-contact

- **File**: `test\agent\agent-analyze-contact.mjs`
- **Status**: PASSED
- **Duration**: 11.78s
- **Exit Code**: 0

### ✅ test\agent\ai-context-actions.smoke

- **File**: `test\agent\ai-context-actions.smoke.mjs`
- **Status**: PASSED
- **Duration**: 9.08s
- **Exit Code**: 0

### ✅ test\agent\agent-interactions-summary

- **File**: `test\agent\agent-interactions-summary.mjs`
- **Status**: PASSED
- **Duration**: 5.88s
- **Exit Code**: 0

### ✅ test\agent\agent-message-goals

- **File**: `test\agent\agent-message-goals.mjs`
- **Status**: PASSED
- **Duration**: 5.34s
- **Exit Code**: 0

### ✅ test\agent\agent-contact-details

- **File**: `test\agent\agent-contact-details.mjs`
- **Status**: PASSED
- **Duration**: 4.71s
- **Exit Code**: 0

### ✅ test\agent\agent-compose-prepare-send

- **File**: `test\agent\agent-compose-prepare-send.mjs`
- **Status**: PASSED
- **Duration**: 4.10s
- **Exit Code**: 0

### ✅ test\agent\agent-persona-notes

- **File**: `test\agent\agent-persona-notes.mjs`
- **Status**: PASSED
- **Duration**: 3.94s
- **Exit Code**: 0

### ✅ test\agent\agent-update-tags

- **File**: `test\agent\agent-update-tags.mjs`
- **Status**: PASSED
- **Duration**: 3.06s
- **Exit Code**: 0

### ✅ test\agent\e2e-billing

- **File**: `test\agent\e2e-billing.mjs`
- **Status**: PASSED
- **Duration**: 2.03s
- **Exit Code**: 0

### ✅ test\agent\entitlements-cross-platform

- **File**: `test\agent\entitlements-cross-platform.mjs`
- **Status**: PASSED
- **Duration**: 1.88s
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
