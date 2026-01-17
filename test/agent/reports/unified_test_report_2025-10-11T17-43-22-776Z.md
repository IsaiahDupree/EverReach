# Unified Agent Test Report

**Generated**: 2025-10-11T17:43:22.777Z

## Summary

- **Total Tests**: 12
- **Passed**: ✅ 10
- **Failed**: ❌ 2
- **Success Rate**: 83.3%
- **Total Duration**: 64.24s

## Test Results

| Test | Status | Duration | Exit Code |
|------|--------|----------|-----------|
| test\agent\agent-screenshot-analysis | ❌ FAIL | 59ms | 1 |
| test\agent\agent-screenshot-tier-limits | ❌ FAIL | 50ms | 1 |
| test\agent\agent-suggest-actions | ✅ PASS | 20.07s | 0 |
| test\agent\agent-analyze-contact | ✅ PASS | 10.54s | 0 |
| test\agent\ai-context-actions.smoke | ✅ PASS | 7.98s | 0 |
| test\agent\agent-interactions-summary | ✅ PASS | 5.39s | 0 |
| test\agent\agent-compose-prepare-send | ✅ PASS | 4.16s | 0 |
| test\agent\agent-contact-details | ✅ PASS | 3.95s | 0 |
| test\agent\agent-message-goals | ✅ PASS | 3.29s | 0 |
| test\agent\agent-update-tags | ✅ PASS | 3.27s | 0 |
| test\agent\agent-persona-notes | ✅ PASS | 3.27s | 0 |
| test\agent\entitlements-cross-platform | ✅ PASS | 2.21s | 0 |

---

## Detailed Results

### ❌ test\agent\agent-screenshot-analysis

- **File**: `test\agent\agent-screenshot-analysis.mjs`
- **Status**: FAILED
- **Duration**: 59ms
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
- **Duration**: 50ms
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
- **Duration**: 20.07s
- **Exit Code**: 0

### ✅ test\agent\agent-analyze-contact

- **File**: `test\agent\agent-analyze-contact.mjs`
- **Status**: PASSED
- **Duration**: 10.54s
- **Exit Code**: 0

### ✅ test\agent\ai-context-actions.smoke

- **File**: `test\agent\ai-context-actions.smoke.mjs`
- **Status**: PASSED
- **Duration**: 7.98s
- **Exit Code**: 0

### ✅ test\agent\agent-interactions-summary

- **File**: `test\agent\agent-interactions-summary.mjs`
- **Status**: PASSED
- **Duration**: 5.39s
- **Exit Code**: 0

### ✅ test\agent\agent-compose-prepare-send

- **File**: `test\agent\agent-compose-prepare-send.mjs`
- **Status**: PASSED
- **Duration**: 4.16s
- **Exit Code**: 0

### ✅ test\agent\agent-contact-details

- **File**: `test\agent\agent-contact-details.mjs`
- **Status**: PASSED
- **Duration**: 3.95s
- **Exit Code**: 0

### ✅ test\agent\agent-message-goals

- **File**: `test\agent\agent-message-goals.mjs`
- **Status**: PASSED
- **Duration**: 3.29s
- **Exit Code**: 0

### ✅ test\agent\agent-update-tags

- **File**: `test\agent\agent-update-tags.mjs`
- **Status**: PASSED
- **Duration**: 3.27s
- **Exit Code**: 0

### ✅ test\agent\agent-persona-notes

- **File**: `test\agent\agent-persona-notes.mjs`
- **Status**: PASSED
- **Duration**: 3.27s
- **Exit Code**: 0

### ✅ test\agent\entitlements-cross-platform

- **File**: `test\agent\entitlements-cross-platform.mjs`
- **Status**: PASSED
- **Duration**: 2.21s
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
