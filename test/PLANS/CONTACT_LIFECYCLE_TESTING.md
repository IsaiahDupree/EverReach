# Contact Lifecycle Testing Methodology

Last updated: 2025-10-18

## Overview

Contact lifecycle testing validates the complete journey of a contact from creation through interactions, ensuring UI actions correctly update backend state and all system touchpoints remain consistent.

---

## Methodology

### Principles

1. **UI-First Creation**: Create contacts via mobile/web UI (not API) to simulate real user flow
2. **State Verification**: After each UI action, verify backend state via API
3. **Visual Validation**: Capture screenshots at each stage for regression detection
4. **Multi-Touchpoint**: Test all endpoints/features that interact with contacts
5. **State Transitions**: Verify contact moves through expected states (created → updated → interacted → archived)

### Lifecycle Stages

```
┌─────────────┐
│   CREATE    │ Mobile UI: Add contact form
│             │ Backend: POST /v1/contacts
│             │ Verify: contacts table, warmth=40, no interactions
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   VIEW      │ Mobile UI: Contact detail screen
│             │ Backend: GET /v1/contacts/:id
│             │ Verify: Display name, emails, warmth badge
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   UPDATE    │ Mobile UI: Edit contact fields
│             │ Backend: PATCH /v1/contacts/:id
│             │ Verify: Field updates, updated_at timestamp
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  INTERACT   │ Mobile UI: Send message, log call
│             │ Backend: POST /v1/messages/send, POST /v1/interactions
│             │ Verify: last_interaction_at, warmth increase, interaction count
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  PIPELINE   │ Mobile UI: Move stage (if supported)
│             │ Backend: POST /v1/contacts/:id/pipeline/move
│             │ Verify: Stage change, history log
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   NOTES     │ Mobile UI: Add note
│             │ Backend: POST /v1/contacts/:id/notes
│             │ Verify: Note appears in timeline
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  ARCHIVE    │ Mobile UI: Delete/archive
│             │ Backend: PATCH /v1/contacts/:id (deleted_at)
│             │ Verify: Soft delete, not in list
└─────────────┘
```

---

## Test Structure

### File Organization

```
test/
├── lifecycle/
│   ├── LIFECYCLE_TESTS.md          # This file
│   ├── contacts/
│   │   ├── create-view.maestro.yaml
│   │   ├── update-fields.maestro.yaml
│   │   ├── send-message.maestro.yaml
│   │   ├── add-note.maestro.yaml
│   │   ├── archive.maestro.yaml
│   │   └── full-lifecycle.maestro.yaml  # Complete flow
│   ├── screenshots/
│   │   ├── baseline/                    # Expected UI states
│   │   └── actual/                       # Test run captures
│   └── backend-verify/
│       └── contact-state.test.ts        # Backend state assertions
```

### Test Naming Convention

- **Maestro flows**: `<entity>-<action>.maestro.yaml`
- **Screenshots**: `<flow-name>-<step>-<timestamp>.png`
- **Backend tests**: `<entity>-<lifecycle-stage>.test.ts`

---

## Implementation

### 1. Maestro Flow with Screenshots

**Example: `test/lifecycle/contacts/create-view.maestro.yaml`**

```yaml
appId: com.everreach.crm
name: Contact Create and View Lifecycle
---

# Stage 1: Navigate to Add Contact
- launchApp:
    clearState: true
- assertVisible: "People"
- tapOn: "Add Contact"
- takeScreenshot: create-view-01-add-screen

# Stage 2: Fill contact form
- tapOn: "Name"
- inputText: "Lifecycle Test User"
- tapOn: "Email"
- inputText: "lifecycle-${TIMESTAMP}@test.com"
- tapOn: "Phone"
- inputText: "+15555551234"
- takeScreenshot: create-view-02-form-filled

# Stage 3: Save contact
- tapOn: "Save"
- assertVisible: "Lifecycle Test User"
- takeScreenshot: create-view-03-contact-saved

# Stage 4: Verify contact details screen
- tapOn: "Lifecycle Test User"
- assertVisible: "Email"
- assertVisible: "lifecycle-${TIMESTAMP}@test.com"
- assertVisible: "Warmth"
- takeScreenshot: create-view-04-detail-screen

# Export contact ID for backend verification
- runFlow:
    file: ../backend-verify/extract-contact-id.yaml
```

### 2. Backend State Verification

**Example: `test/lifecycle/backend-verify/contact-state.test.ts`**

```typescript
import { getAccessToken, apiFetch } from '../../backend/helpers';

describe('Lifecycle: Contact Create → View', () => {
  let token: string;
  let contactId: string;

  beforeAll(async () => {
    token = await getAccessToken();
    // Extract contactId from Maestro test run (e.g., via env var or file)
    contactId = process.env.LIFECYCLE_CONTACT_ID || '';
  });

  it('Contact exists in database after UI creation', async () => {
    const res = await apiFetch(`/api/v1/contacts/${contactId}`, {
      method: 'GET',
      token,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    
    expect(json.contact.display_name).toBe('Lifecycle Test User');
    expect(json.contact.emails).toContain('lifecycle-test@example.com');
    expect(json.contact.warmth).toBe(40); // Default
    expect(json.contact.last_interaction_at).toBeNull(); // No interactions yet
  });

  it('Contact appears in list endpoint', async () => {
    const res = await apiFetch('/api/v1/contacts?limit=50', {
      method: 'GET',
      token,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    const found = json.items.find((c: any) => c.id === contactId);
    expect(found).toBeTruthy();
    expect(found.display_name).toBe('Lifecycle Test User');
  });

  it('No interactions exist yet', async () => {
    const res = await apiFetch(`/api/v1/contacts/${contactId}/messages`, {
      method: 'GET',
      token,
    });

    expect(res.ok).toBe(true);
    const json = await res.json();
    expect(json.items || []).toHaveLength(0);
  });
});
```

### 3. Full Lifecycle Test

**Example: `test/lifecycle/contacts/full-lifecycle.maestro.yaml`**

```yaml
appId: com.everreach.crm
name: Complete Contact Lifecycle
---

# === STAGE 1: CREATE ===
- launchApp:
    clearState: true
- tapOn: "People"
- tapOn: "Add Contact"
- inputText: "Full Lifecycle Test"
- tapOn: "Save"
- takeScreenshot: lifecycle-01-created

# === STAGE 2: VIEW ===
- tapOn: "Full Lifecycle Test"
- assertVisible: "Warmth"
- assertVisible: "40" # Default warmth
- takeScreenshot: lifecycle-02-initial-view

# === STAGE 3: UPDATE ===
- tapOn: "Edit"
- tapOn: "Company"
- inputText: "Test Corp"
- tapOn: "Tags"
- inputText: "vip"
- tapOn: "Save"
- assertVisible: "Test Corp"
- takeScreenshot: lifecycle-03-updated

# === STAGE 4: ADD NOTE ===
- tapOn: "Notes"
- tapOn: "Add Note"
- inputText: "Met at conference"
- tapOn: "Save"
- assertVisible: "Met at conference"
- takeScreenshot: lifecycle-04-note-added

# === STAGE 5: LOG INTERACTION ===
- tapOn: "Interactions"
- tapOn: "Log Interaction"
- tapOn: "Type: Call"
- inputText: "Discussed pricing"
- tapOn: "Save"
- assertVisible: "Discussed pricing"
- takeScreenshot: lifecycle-05-interaction-logged

# === STAGE 6: SEND MESSAGE (DRAFT) ===
- tapOn: "Messages"
- tapOn: "Compose"
- inputText: "Follow-up email"
- tapOn: "Save Draft"
- assertVisible: "Draft saved"
- takeScreenshot: lifecycle-06-message-drafted

# === STAGE 7: VERIFY WARMTH INCREASED ===
- tapOn: "Back"
- assertVisible: "Warmth"
# Note: Warmth should be > 40 now due to interaction
- takeScreenshot: lifecycle-07-warmth-updated

# === STAGE 8: SEARCH & FIND ===
- tapOn: "Search"
- inputText: "Full Lifecycle"
- assertVisible: "Full Lifecycle Test"
- takeScreenshot: lifecycle-08-search-results

# === STAGE 9: ARCHIVE ===
- tapOn: "Full Lifecycle Test"
- tapOn: "More"
- tapOn: "Archive"
- tapOn: "Confirm"
- assertNotVisible: "Full Lifecycle Test"
- takeScreenshot: lifecycle-09-archived
```

---

## Backend Verification Checklist

After each UI stage, verify these backend states:

### Create Stage
- ✅ `GET /v1/contacts/:id` returns contact
- ✅ `display_name` matches input
- ✅ `emails` array contains input
- ✅ `warmth` = 40 (default)
- ✅ `last_interaction_at` = null
- ✅ `created_at` is recent (< 5s ago)
- ✅ `deleted_at` = null

### Update Stage
- ✅ `PATCH /v1/contacts/:id` succeeded
- ✅ Updated fields match new values
- ✅ `updated_at` > `created_at`
- ✅ `warmth` unchanged (no new interactions)

### Interact Stage (Message Sent)
- ✅ `POST /v1/messages/send` succeeded
- ✅ `GET /v1/contacts/:id` shows `last_interaction_at` updated
- ✅ `warmth` > previous value (increased due to recency)
- ✅ `GET /v1/contacts/:id/messages` returns new message
- ✅ Interaction count increased

### Note Stage
- ✅ `POST /v1/contacts/:id/notes` succeeded
- ✅ `GET /v1/contacts/:id/notes` returns new note
- ✅ Note content matches input

### Pipeline Stage (if applicable)
- ✅ `POST /v1/contacts/:id/pipeline/move` succeeded
- ✅ `GET /v1/contacts/:id/pipeline/history` shows move
- ✅ Current stage reflects new value

### Archive Stage
- ✅ `PATCH /v1/contacts/:id` with `deleted_at`
- ✅ `deleted_at` is set (soft delete)
- ✅ `GET /v1/contacts` list excludes archived contact
- ✅ `GET /v1/contacts/:id` still accessible (for restore)

---

## Screenshot Comparison

### Baseline Management

1. **Capture Baseline** (first passing run):
```bash
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml
cp .maestro/screenshots/* test/lifecycle/screenshots/baseline/
```

2. **Compare on Subsequent Runs**:
```bash
# Run test
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml

# Compare (using imagemagick or similar)
compare baseline/lifecycle-01-created.png actual/lifecycle-01-created.png diff.png

# Fail test if diff > threshold (e.g., 5% pixel difference)
```

### Visual Assertions

**Key UI Elements to Verify**:
- ✅ Warmth badge color (cold → neutral → warm progression)
- ✅ Interaction count increases
- ✅ Last contact timestamp updates
- ✅ Notes/messages appear in timeline
- ✅ Tags display correctly
- ✅ Archived contacts hidden from list

---

## Running Lifecycle Tests

### Prerequisites

1. **Android Build**:
```bash
npx expo run:android
```

2. **Backend Running**:
- Ensure `https://ever-reach-be.vercel.app` is accessible
- Or set `BACKEND_BASE_URL` to local backend

3. **Test Credentials**:
```powershell
$env:TEST_EMAIL="isaiahdupree33@gmail.com"
$env:TEST_PASSWORD="frogger12"
```

### Execute Tests

**Single Stage**:
```bash
maestro test test/lifecycle/contacts/create-view.maestro.yaml -e APP_ID=com.everreach.crm
```

**Full Lifecycle**:
```bash
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml -e APP_ID=com.everreach.crm --format junit --output lifecycle-results.xml
```

**Backend Verification**:
```powershell
# After Maestro run, extract contact ID
$env:LIFECYCLE_CONTACT_ID = "uuid-from-maestro-output"
npm test -- test/lifecycle/backend-verify/contact-state.test.ts
```

**All Lifecycle Tests**:
```bash
maestro test test/lifecycle/contacts/ -e APP_ID=com.everreach.crm
```

---

## Reporting

### Test Report Structure

```
Lifecycle Test Report
=====================

Run ID: lifecycle-2025-10-18-19-35
Duration: 3m 42s
Status: PASSED ✅

Stages:
1. CREATE    ✅ (8s)  - UI: Pass, Backend: Pass, Screenshot: Match
2. VIEW      ✅ (4s)  - UI: Pass, Backend: Pass, Screenshot: Match
3. UPDATE    ✅ (6s)  - UI: Pass, Backend: Pass, Screenshot: Match
4. INTERACT  ✅ (12s) - UI: Pass, Backend: Pass, Screenshot: Match
5. NOTES     ✅ (5s)  - UI: Pass, Backend: Pass, Screenshot: Match
6. PIPELINE  ✅ (7s)  - UI: Pass, Backend: Pass, Screenshot: Match
7. ARCHIVE   ✅ (4s)  - UI: Pass, Backend: Pass, Screenshot: Match

Backend State Verification:
- Contact created: ✅
- Fields updated: ✅
- Warmth increased: ✅ (40 → 58)
- Interactions logged: ✅ (0 → 2)
- Notes added: ✅ (1)
- Archived correctly: ✅

Screenshot Comparison:
- Baseline matches: 7/7 ✅
- Max pixel diff: 2.3%
- Visual regressions: 0

Artifacts:
- Screenshots: ./test/lifecycle/screenshots/actual/
- Backend logs: ./test/lifecycle/backend-verify/logs.json
- Maestro recording: ./test/lifecycle/recordings/full-lifecycle.mp4
```

### Metrics to Track

- **Stage Completion Time**: Measure each lifecycle stage duration
- **Backend Consistency**: % of UI actions that correctly update backend
- **Visual Stability**: % of screenshots matching baseline
- **Warmth Progression**: Track warmth score changes through lifecycle
- **API Call Success Rate**: % of backend verifications passing

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Contact Lifecycle Tests

on:
  pull_request:
    paths:
      - 'app/**'
      - 'backend-vercel/**'

jobs:
  lifecycle-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Start Android Emulator
        uses: reactivecircus/android-emulator-runner@v2
        with:
          api-level: 33
          script: |
            # Build and install APK
            npx expo run:android --no-build-cache
      
      - name: Run Maestro Lifecycle Tests
        run: |
          maestro test test/lifecycle/contacts/ \
            -e APP_ID=com.everreach.crm \
            --format junit \
            --output lifecycle-results.xml
      
      - name: Verify Backend State
        env:
          TEST_EMAIL: ${{ secrets.TEST_EMAIL }}
          TEST_PASSWORD: ${{ secrets.TEST_PASSWORD }}
        run: |
          npm test -- test/lifecycle/backend-verify/
      
      - name: Upload Screenshots
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: lifecycle-screenshots
          path: test/lifecycle/screenshots/actual/
      
      - name: Compare Screenshots
        run: |
          node scripts/compare-screenshots.js
      
      - name: Comment PR with Results
        uses: actions/github-script@v6
        with:
          script: |
            const report = require('./lifecycle-report.json');
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              body: `## Lifecycle Tests: ${report.status}\n\n${report.summary}`
            });
```

---

## Best Practices

1. **Idempotency**: Use timestamped contact names to avoid conflicts
2. **Cleanup**: Archive/delete test contacts after run (or use `clearState: true`)
3. **Isolation**: Each test should be independent (no shared state)
4. **Timing**: Use `waitForAnimationToEnd` in Maestro to handle transitions
5. **Error Handling**: Capture screenshots on failure for debugging
6. **Backend First**: Verify backend state before asserting UI (source of truth)
7. **Incremental**: Test individual stages before full lifecycle
8. **Data Seeding**: Use known baseline data for predictable warmth calculations

---

## Troubleshooting

### UI Test Fails but Backend Passes
- UI element selectors may have changed
- Animation/loading delays not accounted for
- Check actual vs baseline screenshots for visual regressions

### Backend Test Fails but UI Passes
- RLS policy blocking test user
- API endpoint changed
- Race condition (UI hasn't propagated to backend yet)
- Add `await sleep(500)` before backend verification

### Screenshot Mismatch
- Device/screen size changed
- Font rendering differences
- Timestamps/dynamic content in screenshot
- Update baseline or mask dynamic regions

### Warmth Not Increasing
- `last_interaction_at` not updating (check /messages/send)
- Warmth recompute not triggered
- Check `/v1/contacts/:id/warmth/recompute` was called

---

## Future Enhancements

1. **Video Recording**: Capture full Maestro run as MP4 for review
2. **Performance Metrics**: Track render time, API latency per stage
3. **Accessibility**: Validate screen reader labels, contrast ratios
4. **Multi-Device**: Test on different screen sizes (phone, tablet)
5. **Offline Mode**: Test contact creation while offline, sync on reconnect
6. **Conflict Resolution**: Test simultaneous edits from web + mobile
7. **Import Flow**: Test bulk contact import lifecycle
8. **Export Flow**: Test contact export with all fields

---

## References

- **Maestro Docs**: https://maestro.mobile.dev/
- **E2E Test Plan**: `test/PLANS/BACKEND_MOBILE_E2E_PLAN.md`
- **Backend Helpers**: `test/backend/helpers.ts`
- **Screenshot Tools**: ImageMagick `compare`, Playwright visual regression
