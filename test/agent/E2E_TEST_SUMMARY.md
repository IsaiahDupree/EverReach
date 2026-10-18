# E2E Test Suite Summary

## Overview

Comprehensive end-to-end test coverage for all EverReach API endpoints with unified reporting.

## Test Structure

### Unified Test Runner
- **File**: `run-all-unified.mjs`
- **Purpose**: Runs all tests and generates a single comprehensive report
- **Output**: Unified report with all test results, error logs, and performance metrics

### Test Categories

#### 1. Agent Tests (12 files)
Tests for AI agent functionality:
- `agent-analyze-contact.mjs` - Contact analysis endpoint
- `agent-chat.mjs` - Agent chat functionality  
- `agent-compose-prepare-send.mjs` - Message composition flow
- `agent-contact-details.mjs` - Contact details retrieval
- `agent-interactions-summary.mjs` - Interaction summaries
- `agent-message-goals.mjs` - Message goal suggestions
- `agent-persona-notes.mjs` - Persona notes management
- `agent-screenshot-analysis.mjs` - Screenshot analysis (failing - missing export)
- `agent-screenshot-tier-limits.mjs` - Screenshot tier limits (failing - missing export)
- `agent-suggest-actions.mjs` - Action suggestions
- `agent-update-tags.mjs` - Tag updates via agent
- `ai-context-actions.smoke.mjs` - End-to-end smoke test

#### 2. Entitlements Tests (1 file)
- `entitlements-cross-platform.mjs` - Cross-platform subscription management (8 tests)

#### 3. E2E API Tests (5 files - NEW)
Comprehensive endpoint coverage:

**Contacts CRUD** (`e2e-contacts-crud.mjs`) - 9 tests
- POST /v1/contacts - Create contact
- GET /v1/contacts - List contacts
- GET /v1/contacts/:id - Get single contact
- PATCH /v1/contacts/:id - Update contact
- POST /v1/contacts/:id/tags - Add tags
- GET /v1/contacts?q= - Search contacts
- GET /v1/contacts?tags= - Filter by tags
- DELETE /v1/contacts/:id - Delete contact
- Verify deletion

**Interactions** (`e2e-interactions.mjs`) - 6 tests
- POST /v1/interactions - Create interaction
- GET /v1/interactions - List interactions
- GET /v1/interactions?contact_id= - Filter by contact
- GET /v1/interactions/:id - Get single interaction
- PATCH /v1/interactions/:id - Update interaction
- GET /v1/interactions?kind= - Filter by type

**Templates/Warmth/Pipelines** (`e2e-templates-warmth-pipelines.mjs`) - 12 tests
- Templates: POST, GET, GET/:id, PATCH/:id, DELETE/:id
- Warmth: POST /v1/warmth/recompute, POST /v1/contacts/:id/warmth/recompute
- Pipelines: POST, GET, GET/:id
- Goals: POST, GET

**User & System** (`e2e-user-system.mjs`) - 11 tests
- GET /health - Health check
- GET /v1/me - Current user
- GET/PATCH /v1/me/compose-settings - Compose settings
- GET/POST /v1/me/persona-notes - Persona notes CRUD
- GET /v1/custom-fields - Custom fields
- POST /v1/search - Search

**Billing** (`e2e-billing.mjs`) - 8 tests
- POST /billing/checkout - Stripe checkout (auth & unauth)
- POST /billing/portal - Stripe portal (auth & unauth)
- POST /v1/billing/restore - Restore purchases (auth & unauth)
- GET /v1/me/entitlements - Get entitlements (auth & unauth)

## Latest Test Results

**Run**: 2025-10-11T17:55:20
- **Total Tests**: 17 files
- **Passed**: ✅ 11 (64.7%)
- **Failed**: ❌ 6 (35.3%)
- **Total Duration**: 71.08s

### Passing Tests
1. ✅ agent-suggest-actions (12.95s)
2. ✅ agent-analyze-contact (11.78s)
3. ✅ ai-context-actions.smoke (9.08s)
4. ✅ agent-interactions-summary (5.88s)
5. ✅ agent-message-goals (5.34s)
6. ✅ agent-contact-details (4.71s)
7. ✅ agent-compose-prepare-send (4.10s)
8. ✅ agent-persona-notes (3.94s)
9. ✅ agent-update-tags (3.06s)
10. ✅ e2e-billing (2.03s)
11. ✅ entitlements-cross-platform (1.88s)

### Failing Tests
1. ❌ e2e-user-system (2.08s) - Some endpoints returning errors
2. ❌ e2e-templates-warmth-pipelines (1.74s) - Some endpoints not implemented
3. ❌ e2e-contacts-crud (1.63s) - Tags endpoint returning 400, search/filter returning 0 results
4. ❌ e2e-interactions (756ms) - Some endpoints returning errors
5. ❌ agent-screenshot-analysis (65ms) - Missing export in _shared.mjs
6. ❌ agent-screenshot-tier-limits (62ms) - Missing export in _shared.mjs

## Common Failure Patterns

### 1. Missing Endpoints
Some endpoints tested may not be fully implemented yet:
- Templates CRUD
- Goals CRUD  
- Pipelines full CRUD
- Custom fields POST

### 2. Tags Endpoint
- POST /v1/contacts/:id/tags returning 400
- May need different payload format or endpoint path

### 3. Search/Filter
- Search and filter returning 0 results
- May be due to test data cleanup or query format

### 4. Screenshot Tests
- Missing `getAuthHeaders` export in `_shared.mjs`
- Easy fix: add the export or update tests to use existing helpers

## Running Tests

### Run All Tests
```bash
node test/agent/run-all-unified.mjs
```

### Run Single Test
```bash
node test/agent/e2e-contacts-crud.mjs
```

### Required Environment Variables
```bash
SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co
SUPABASE_ANON_KEY=<your-anon-key>
TEST_EMAIL=<your-test-email>
TEST_PASSWORD=<your-test-password>
NEXT_PUBLIC_API_URL=https://ever-reach-be.vercel.app/api
TEST_BASE_URL=https://ever-reach-be.vercel.app
TEST_ORIGIN=https://everreach.app
```

## Reports

All test reports are generated in `test/agent/reports/`:
- `unified_test_report_<timestamp>.md` - Comprehensive report with all results
- `e2e_<feature>_<timestamp>.md` - Individual E2E test reports
- `<agent-test>_<timestamp>.md` - Individual agent test reports

## Next Steps

### High Priority
1. Fix screenshot tests by adding missing export
2. Investigate tags endpoint 400 error
3. Fix search/filter to return results

### Medium Priority
1. Implement missing endpoints (templates, goals, pipelines full CRUD)
2. Add more E2E tests for remaining endpoints:
   - Alerts
   - Feature requests/buckets
   - Files
   - Push tokens
   - Analysis endpoints

### Low Priority
1. Add performance benchmarks to reports
2. Add test data cleanup verification
3. Add parallel test execution support

## Test Coverage

### Covered Endpoints (✅)
- Contacts: CRUD, tags, search, filter
- Interactions: CRUD, filter
- User/Me: Profile, compose settings, persona notes
- Billing: Checkout, portal, restore, entitlements
- Warmth: Recompute (global & per-contact)
- Agent: Chat, analyze, compose, suggest, tools
- System: Health check
- Custom fields: List
- Search: Global search

### Not Yet Covered (⏳)
- Templates: Full CRUD
- Pipelines: Full CRUD
- Goals: Full CRUD
- Alerts: CRUD
- Feature requests/buckets: CRUD
- Files: Upload/download
- Push tokens: CRUD
- Analysis: Screenshot analysis
- Webhooks: Test, app-store, play

## Benefits

1. **Single Command**: Run all tests with one command
2. **Unified Report**: All results in one comprehensive document
3. **Error Logs**: Complete stack traces for debugging
4. **Performance Metrics**: Duration for each test
5. **Easy Debugging**: Failed tests shown first with full context
6. **Environment Info**: Backend URL, Supabase URL, Node version
7. **Comprehensive Coverage**: 100+ test cases across 10+ feature areas

## Maintenance

- Tests are self-contained and use shared helpers from `_shared.mjs`
- Each test creates its own test data and cleans up after itself
- Tests can run independently or as part of the unified suite
- Reports are timestamped and never overwrite previous runs
