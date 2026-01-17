# Agent Tests

This folder contains agent-related tests and scripts that exercise the backend agent endpoints and end-to-end flows.

- `ai-context-actions.smoke.mjs` – End-to-end smoke test that:
  - creates a contact
  - seeds an interaction
  - composes a message with the agent
  - logs a draft message
  - recomputes warmth
  - lists available agent tools
  - performs an agent chat call
  - writes a Markdown report under `test/automated-tests/reports/`

## Prerequisites

Set the following environment variables (PowerShell examples):

```powershell
# Backend to target
$env:BACKEND_BASE = "https://ever-reach-be.vercel.app"
$env:TEST_ORIGIN  = "https://everreach.app"

# Sign-in (Option A: REST sign-in via Supabase)
$env:SUPABASE_URL = "https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_ANON_KEY = "<anon_key>"
$env:TEST_EMAIL = "<email>"
$env:TEST_PASSWORD = "<password>"

# Or Option B: provide an existing JWT (skip sign-in)
# $env:ACCESS_TOKEN = "<jwt>"
```

## Run a single test

```powershell
node .\test\agent\ai-context-actions.smoke.mjs
```

## Run all agent tests

### Unified Runner (Recommended)

Generates a single comprehensive report with all test results, error logs, and performance metrics:

```powershell
node .\test\agent\run-all-unified.mjs
```

### Legacy Runner

Runs tests individually without unified reporting:

```powershell
node .\test\agent\run-all.mjs
```

Reports will be generated under `test/agent/reports/`.

## Tool Coverage Matrix

| Tool / Endpoint            | Test file                             | Success criteria |
|----------------------------|---------------------------------------|------------------|
| get_persona_notes (tool)   | `agent-persona-notes.mjs`             | Used tool and non-empty output |
| get_contact_interactions   | `agent-interactions-summary.mjs`      | Used tool and non-empty output |
| get_contact                | `agent-contact-details.mjs`           | Used tool and output mentions contact name |
| update_contact             | `agent-update-tags.mjs`               | Used tool and tag present in GET /contacts/:id |
| compose → prepare → send   | `agent-compose-prepare-send.mjs`      | Compose 200/201, Prepare 201, Send 200 with sent status |
| analyze contact endpoint   | `agent-analyze-contact.mjs`           | 200, correct contact name, non-empty analysis |
| suggest actions endpoint   | `agent-suggest-actions.mjs`           | 200, suggestions[] present |
| cross-platform entitlements | `entitlements-cross-platform.mjs`    | GET /v1/me/entitlements returns plan/features, POST /v1/billing/restore recomputes |
| AI context & actions       | `ai-context-actions.smoke.mjs`        | End-to-end flow with agent chat and tools |

## Test Coverage

The unified test suite covers:

### Agent Tests (12 files)
- ✅ Agent chat and conversation
- ✅ Contact analysis and insights
- ✅ Message composition and goals
- ✅ Persona notes management
- ✅ Screenshot analysis (2 tests - currently failing due to missing export)
- ✅ Action suggestions
- ✅ Tag updates
- ✅ Interaction summaries
- ✅ Cross-platform entitlements (8 tests)
- ✅ AI context and actions smoke test

### E2E Tests (6 files - NEW)
- ✅ **Contacts CRUD** (9 tests) - Create, read, update, delete, tags, search, filter
- ✅ **Interactions** (6 tests) - Create, list, get, update, filter by contact/kind
- ✅ **Templates/Warmth/Pipelines** (12 tests) - Templates CRUD, warmth recompute, pipelines CRUD, goals CRUD
- ✅ **User & System** (11 tests) - User profile, compose settings, persona notes, custom fields, search, health check
- ✅ **Billing** (8 tests) - Checkout, portal, restore, entitlements (auth & unauth)
- ✅ **Advanced Features** (10 tests) - Alerts, push tokens, feature requests/buckets, analysis endpoints

### Performance Benchmarks (1 file - NEW)
- ⚡ **Performance Testing** (8 benchmarks) - Message generation, contact ops, search, analysis
  - **Critical SLAs**: Message gen < 3s, Compose prep < 2s
  - **High Priority**: Contact operations < 500ms, Search < 1s
  - **Medium Priority**: Analysis < 5s, Warmth recompute < 2s
  - Includes: Avg, Min, Max, P95 timings with performance ratings

**Total**: 19 test files covering 120+ individual test cases
**API Endpoints**: 113 total endpoints in backend (verified via `backend-vercel/scripts/list-all-endpoints.mjs`)
**Test Coverage**: 50+ critical endpoints tested across 12+ feature areas + Performance monitoring

**Note**: The backend has 113 endpoints across 24 categories. Our tests focus on the most critical user-facing and business-critical endpoints.
