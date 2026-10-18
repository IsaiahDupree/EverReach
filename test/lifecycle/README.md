# Contact Lifecycle Tests

End-to-end tests that validate the complete contact journey from creation through interactions, verifying UI actions correctly update backend state with screenshot validation.

## Quick Start

### Prerequisites

1. **Android device/emulator running**
2. **Backend accessible** (https://ever-reach-be.vercel.app)
3. **Maestro installed**: `brew install maestro` (Mac) or `curl -Ls "https://get.maestro.mobile.dev" | bash`
4. **Test credentials set**:
```powershell
$env:TEST_EMAIL = "isaiahdupree33@gmail.com"
$env:TEST_PASSWORD = "frogger12"
```

### Run Tests

**Simple create/view flow** (30 seconds):
```bash
maestro test test/lifecycle/contacts/create-view.maestro.yaml -e APP_ID=com.everreach.crm
```

**Full lifecycle** (3-5 minutes):
```bash
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml -e APP_ID=com.everreach.crm
```

**Backend verification** (after Maestro run):
```powershell
# Extract contact ID from Maestro output
$env:LIFECYCLE_CONTACT_ID = "uuid-from-maestro"
npm test -- test/lifecycle/backend-verify/contact-state.test.ts
```

## What Gets Tested

### UI Flow (Maestro)
- ✅ Create contact via mobile form
- ✅ View contact details
- ✅ Update fields (company, tags)
- ✅ Add notes
- ✅ Log interactions
- ✅ Compose messages
- ✅ Search & filter
- ✅ Archive contact

### Backend State (Jest)
- ✅ Contact exists in database
- ✅ Fields match UI input
- ✅ Warmth calculation correct
- ✅ `last_interaction_at` updates
- ✅ Notes/messages persisted
- ✅ Search/filter returns contact
- ✅ Soft delete on archive

### Visual Validation (Screenshots)
- ✅ 13 screenshots per full lifecycle run
- ✅ Captures each major stage
- ✅ Stored in `screenshots/actual/`
- ✅ Compare against `screenshots/baseline/`

## File Structure

```
test/lifecycle/
├── README.md                    # This file
├── contacts/
│   ├── create-view.maestro.yaml           # Simple create + view (9 screenshots)
│   └── full-lifecycle.maestro.yaml        # Complete flow (13 stages)
├── backend-verify/
│   └── contact-state.test.ts              # Backend assertions (18 tests)
├── screenshots/
│   ├── baseline/                          # Expected UI states (first pass)
│   └── actual/                            # Current test run captures
└── CONTACT_LIFECYCLE_TESTING.md           # Full methodology doc
```

## Test Stages

### 1. CREATE (8s)
- UI: Fill form → Save
- Backend: Verify `POST /v1/contacts` succeeded
- Screenshot: Form filled, contact saved

### 2. VIEW (4s)
- UI: Open contact detail
- Backend: Verify `GET /v1/contacts/:id` returns data
- Screenshot: Detail screen, warmth badge

### 3. UPDATE (6s)
- UI: Edit company, tags → Save
- Backend: Verify `PATCH /v1/contacts/:id` updated fields
- Screenshot: Updated fields visible

### 4. NOTE (5s)
- UI: Add note → Save
- Backend: Verify `POST /v1/contacts/:id/notes` persisted
- Screenshot: Note in timeline

### 5. INTERACT (12s)
- UI: Log call interaction
- Backend: Verify `last_interaction_at` updated, warmth increased
- Screenshot: Interaction logged

### 6. MESSAGE (10s)
- UI: Compose draft
- Backend: Verify `POST /v1/messages/prepare` saved draft
- Screenshot: Draft saved

### 7. SEARCH (7s)
- UI: Search by name
- Backend: Verify `GET /v1/contacts?q=...` finds contact
- Screenshot: Search results

### 8. ARCHIVE (4s)
- UI: Archive contact
- Backend: Verify `deleted_at` set, not in list
- Screenshot: Removed from list

## Expected Outcomes

### Full Lifecycle Success Criteria

**UI Tests (Maestro)**:
- ✅ All 13 stages pass
- ✅ No timeouts or element-not-found errors
- ✅ Screenshots captured for each stage

**Backend Tests (Jest)**:
- ✅ 18/18 assertions pass
- ✅ Contact data matches UI input
- ✅ Warmth increases from 40 → 50-65 (depends on timing)
- ✅ All endpoints return expected data

**Screenshot Comparison**:
- ✅ < 5% pixel difference from baseline
- ✅ No visual regressions in critical UI elements

## Troubleshooting

### Maestro test fails at "Save" button
**Cause**: Button text may be "Save Contact" or "Create"
**Fix**: Update selector in YAML to match actual button text

### Backend test: "LIFECYCLE_CONTACT_ID not set"
**Cause**: Contact ID not extracted from Maestro run
**Fix**: 
1. Check Maestro output for contact UUID
2. Or add a Maestro step to output ID to file
3. Set `$env:LIFECYCLE_CONTACT_ID = "uuid"`

### Screenshot mismatch
**Cause**: Device resolution changed, or dynamic content (timestamps)
**Fix**: 
- Regenerate baseline: `cp screenshots/actual/* screenshots/baseline/`
- Or mask dynamic regions in comparison

### Warmth didn't increase
**Cause**: `last_interaction_at` not updating (backend issue)
**Fix**: 
- Check `/v1/messages/send` route calls `/v1/contacts/:id/warmth/recompute`
- Verify backend fix is deployed: `test(e2e): recompute warmth on send`

### "clearState: true" not working
**Cause**: Maestro cache issue
**Fix**: `maestro test --clear-state` or uninstall/reinstall app

## CI/CD Integration

### GitHub Actions Snippet

```yaml
- name: Run Contact Lifecycle Tests
  run: |
    maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml \
      -e APP_ID=com.everreach.crm \
      --format junit \
      --output lifecycle-results.xml

- name: Upload Screenshots
  uses: actions/upload-artifact@v3
  with:
    name: lifecycle-screenshots
    path: test/lifecycle/screenshots/actual/

- name: Verify Backend State
  env:
    LIFECYCLE_CONTACT_ID: ${{ steps.extract-id.outputs.contact_id }}
  run: npm test -- test/lifecycle/backend-verify/
```

## Baseline Management

### First Time Setup

```bash
# Run tests to generate screenshots
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml -e APP_ID=com.everreach.crm

# If tests pass and UI looks correct, save as baseline
cp test/lifecycle/screenshots/actual/* test/lifecycle/screenshots/baseline/

# Commit baseline
git add test/lifecycle/screenshots/baseline/
git commit -m "test(lifecycle): add screenshot baseline"
```

### Update Baseline (after UI changes)

```bash
# After intentional UI changes, regenerate baseline
maestro test test/lifecycle/contacts/full-lifecycle.maestro.yaml -e APP_ID=com.everreach.crm

# Review screenshots manually
open test/lifecycle/screenshots/actual/

# If correct, update baseline
rm test/lifecycle/screenshots/baseline/*
cp test/lifecycle/screenshots/actual/* test/lifecycle/screenshots/baseline/

# Commit updated baseline
git add test/lifecycle/screenshots/baseline/
git commit -m "test(lifecycle): update screenshot baseline after UI redesign"
```

## Performance Benchmarks

| Stage | Expected Duration | Timeout |
|-------|-------------------|---------|
| CREATE | 8s | 30s |
| VIEW | 4s | 20s |
| UPDATE | 6s | 30s |
| NOTE | 5s | 20s |
| INTERACT | 12s | 40s |
| MESSAGE | 10s | 40s |
| SEARCH | 7s | 30s |
| ARCHIVE | 4s | 20s |
| **TOTAL** | **56s** | **5min** |

## Metrics Tracking

After each run, the backend test outputs:

```
📊 Contact Lifecycle Summary:
   ID: abc123-...
   Name: Full Lifecycle 2025-10-18
   Company: Lifecycle Test Corp
   Warmth: 58 (warm)
   Tags: lifecycle, vip, test
   Last Interaction: 2025-10-18T23:35:42Z
   Created: 2025-10-18T23:32:15Z
   Updated: 2025-10-18T23:35:40Z
   Deleted: 2025-10-18T23:36:10Z
```

Track these over time:
- **Warmth progression**: Should increase after interactions
- **Test duration**: Should remain < 5 minutes
- **Screenshot diffs**: Should be < 5% pixel difference

## Related Docs

- **Methodology**: `test/PLANS/CONTACT_LIFECYCLE_TESTING.md`
- **E2E Plan**: `test/PLANS/BACKEND_MOBILE_E2E_PLAN.md`
- **Backend Helpers**: `test/backend/helpers.ts`
- **Maestro Docs**: https://maestro.mobile.dev/
