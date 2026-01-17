# Warmth Calculation Fix - Implementation Summary

## Problem Fixed ✅

**Internal notes were incorrectly increasing warmth scores.**

When users added notes to contacts, the warmth score would go UP because the system counted internal notes as real interactions.

---

## Solution Implemented

**Filter interactions by meaningful kinds that represent actual contact activity.**

### Files Changed

#### 1. Created Constants File
**File:** `backend-vercel/lib/warmth.ts`

Defines which interaction kinds affect warmth:
```typescript
export const WARMTH_INTERACTION_KINDS = [
  // Communication
  'email', 'call', 'sms', 'meeting', 'dm',
  
  // Social media
  'social', 'linkedin', 'twitter', 'instagram', 'facebook',
  
  // Messaging
  'whatsapp', 'telegram', 'slack',
  
  // Other
  'video_call', 'in_person',
];
```

**Excluded kinds (do NOT affect warmth):**
- ❌ `note` - Internal notes
- ❌ `screenshot_note` - Screenshot analysis
- ❌ `pipeline_update` - Stage changes
- ❌ `system` - Automated events

#### 2. Updated Single-Contact Recompute
**File:** `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`

**Changes:**
- Added `.in('kind', WARMTH_INTERACTION_KINDS)` to frequency query
- Added `.in('kind', WARMTH_INTERACTION_KINDS)` to channel breadth query
- Changed recency to query last MEANINGFUL interaction instead of using `last_interaction_at`

**Before:**
```typescript
// Used ALL interactions
const { count } = await supabase
  .from('interactions')
  .select('id', { count: 'exact', head: true })
  .eq('contact_id', params.id)
  .gte('created_at', since90);
```

**After:**
```typescript
// Only counts meaningful interactions
const { count } = await supabase
  .from('interactions')
  .select('id', { count: 'exact', head: true })
  .eq('contact_id', params.id)
  .in('kind', WARMTH_INTERACTION_KINDS)  // ← Filter added
  .gte('created_at', since90);
```

#### 3. Updated Bulk Recompute
**File:** `backend-vercel/app/api/v1/warmth/recompute/route.ts`

Applied the same filtering logic to the bulk endpoint.

---

## How It Works Now

### Warmth Calculation Formula (Unchanged)

```
Base Score: 40

+ Recency Boost (0-25): Based on days since last MEANINGFUL interaction
+ Frequency Boost (0-15): Based on count of MEANINGFUL interactions in last 90 days
+ Channel Breadth (+5): If ≥2 distinct MEANINGFUL interaction kinds in last 30 days

- Decay (0-30): −0.5 per day after 7 days since last MEANINGFUL interaction

Final Score: Clamped to 0-100
```

### What Changed

**Before:**
- Counted ALL interactions (including notes)
- Used `contacts.last_interaction_at` (updated by notes)

**After:**
- Counts ONLY meaningful interactions (emails, calls, meetings, etc.)
- Queries for last meaningful interaction dynamically
- Internal notes have NO effect on warmth

---

## Testing the Fix

### Test Case 1: Adding Notes Should Not Increase Warmth

1. **Check Emily's current warmth:**
   - Settings → Debug (QA) → "Bulk Recompute All Contacts"
   - Note the warmth score

2. **Add a note to Emily:**
   - Open Emily's contact
   - Add a note (e.g., "Following up on project discussion")
   - Save

3. **Recompute warmth:**
   - Settings → Debug (QA) → "Test Warmth Decay (+1d)"
   - Or tap "Refresh Warmth" on Emily's contact page

4. **Expected result:**
   - Warmth should be UNCHANGED or DECREASED (decay)
   - Warmth should NOT increase from adding a note ✅

### Test Case 2: Actual Interactions Should Increase Warmth

1. **Create a real interaction:**
   - Send an email or log a call to Emily
   - This creates an interaction with `kind: 'email'` or `kind: 'call'`

2. **Recompute warmth:**
   - Settings → Debug (QA) → "Test Warmth Decay (+1d)"

3. **Expected result:**
   - Warmth SHOULD increase (recency + frequency boosts) ✅

### Test Case 3: Decay Still Works

1. **Use the offset tool:**
   - Settings → Debug (QA)
   - Tap "Increase Offset (+1d)" several times (e.g., +7d or +14d)
   - Tap "Test Warmth Decay (+7d)" or (+14d)

2. **Expected result:**
   - Warmth SHOULD decrease (decay applies after 7 days) ✅

### Console Logging

The recompute endpoint now logs debug info:
```
[Warmth] Contact 6d115bd9-...: daysSince=12.3, interCount=5, distinctKinds=2, warmth=58
```

Check console for:
- `daysSince` - Days since last MEANINGFUL interaction
- `interCount` - Count of MEANINGFUL interactions in last 90 days
- `distinctKinds` - Distinct MEANINGFUL interaction types in last 30 days
- `warmth` - Final calculated score

---

## Verification Checklist

- [ ] Adding internal notes does NOT increase warmth
- [ ] Sending emails/calls/meetings DOES increase warmth
- [ ] Warmth decays over time when no meaningful interactions occur
- [ ] Bulk recompute works for all contacts
- [ ] Debug tools show correct interaction counts (excluding notes)
- [ ] Emily Watson's warmth behaves correctly

---

## Backward Compatibility

✅ **Non-breaking change**
- No schema migrations required
- No data migrations required
- Existing interactions are unchanged
- Only the calculation logic is updated

**Existing notes:**
- Still stored in `interactions` table with `kind: 'note'`
- Still visible in contact history
- Just excluded from warmth calculation

**API responses:**
- No changes to response formats
- `warmth_updated_at` still returned
- Compatible with existing clients

---

## Adding New Interaction Types

When adding new interaction types in the future, decide if they should affect warmth:

### Should Affect Warmth (Add to `WARMTH_INTERACTION_KINDS`)
- Any real contact communication:
  - New messaging platforms (e.g., 'discord', 'wechat')
  - New meeting types (e.g., 'webinar', 'conference')
  - Social platforms (e.g., 'tiktok', 'threads')

### Should NOT Affect Warmth (Exclude from list)
- Internal system actions:
  - Screenshot analysis (`screenshot_note`)
  - Pipeline updates (`pipeline_update`)
  - Automated reminders (`system`, `reminder`)
  - Tag changes (`tag_update`)
  - Field edits (`field_update`)

**To add a new meaningful kind:**
```typescript
// backend-vercel/lib/warmth.ts
export const WARMTH_INTERACTION_KINDS = [
  // ... existing kinds
  'new_platform',  // ← Add here
] as const;
```

---

## Performance Considerations

### Additional Query

The fix adds one additional query per contact during recompute:
```typescript
// Query for last meaningful interaction
const { data: lastMeaningful } = await supabase
  .from('interactions')
  .select('created_at')
  .eq('contact_id', id)
  .in('kind', WARMTH_INTERACTION_KINDS)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

**Impact:** Minimal
- Single-row query with index
- Only runs during recompute (not on every page load)
- Worth the correctness gain

**Optimization opportunity (future):**
- Could add a `last_meaningful_interaction_at` column to `contacts` table
- Update via trigger when meaningful interactions are created
- Would eliminate the extra query

---

## Related Documentation

- `docs/WARMTH_CALCULATION_ISSUE.md` - Full problem analysis
- `docs/API_ENDPOINTS_AUDIT.md` - API endpoint audit and fixes
- `backend-vercel/lib/warmth.ts` - Warmth constants and config

---

## Deployment Notes

### Deploy Steps
1. ✅ Backend changes deployed (Edge Functions auto-deploy)
2. No database migrations needed
3. No frontend changes needed (uses existing API)

### Post-Deployment
1. Trigger bulk recompute for all contacts:
   - Settings → Debug (QA) → "Bulk Recompute All Contacts"
   - This will recalculate all warmth scores with the new logic

2. Monitor logs for any errors:
   ```
   [Warmth] Contact <id>: daysSince=X, interCount=Y, distinctKinds=Z, warmth=W
   ```

3. Verify warmth scores look reasonable across contact list

---

## Summary

**Problem:** Internal notes were boosting warmth scores ❌

**Solution:** Filter interactions by meaningful kinds ✅

**Result:** Warmth scores now accurately reflect real contact engagement ✅

**Impact:** Low-risk, high-value fix with no breaking changes ✅
