# Warmth Calculation Issue: Internal Notes Affecting Warmth Score

## Problem Statement

**Internal notes are incorrectly increasing warmth scores.**

When a user adds a note to a contact, it creates an `interaction` record with `kind: 'note'`. This causes:
1. ✅ The interaction count to increase (frequency boost ↑)
2. ✅ `last_interaction_at` to update to current time (recency boost ↑)
3. ✅ Potential distinct interaction kind increase (channel breadth ↑)

**Result:** Warmth scores go UP when they shouldn't, because internal notes are not actual contact interactions.

---

## Root Cause Analysis

### How Notes Are Saved

**File:** `backend-vercel/app/api/v1/contacts/[id]/notes/route.ts`  
**Lines:** 79-83

```typescript
const { data, error } = await supabase
  .from('interactions')
  .insert([{ 
    contact_id: parsed.data.contact_id, 
    kind: 'note', 
    content: parsed.data.content ?? null, 
    metadata: parsed.data.metadata ?? {} 
  }])
  .select('id, contact_id, kind, created_at')
  .single();
```

When a note is created, it inserts into the `interactions` table.

### Database Trigger

**File:** `supabase-future-schema.sql`  
**Lines:** 483-491

```sql
CREATE TRIGGER update_person_on_interaction
AFTER INSERT ON interactions
FOR EACH ROW
EXECUTE FUNCTION update_person_interaction_stats();

-- Function updates:
UPDATE people SET 
    last_interaction = NEW.occurred_at,
    last_interaction_type = NEW.type,
    last_interaction_summary = NEW.summary,
    interaction_count = (...)
```

The trigger automatically updates `last_interaction_at` on the contact whenever ANY interaction is inserted.

### Warmth Calculation

**File:** `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`

**Formula:**
```typescript
// Base: 40
let warmth = 40;

// Recency boost: +0 to +25 (based on days since last_interaction_at)
const recency = clamp(90 - daysSince, 0, 90) / 90;
warmth += Math.round(recency * 25);

// Frequency boost: +0 to +15 (based on interaction count in last 90 days)
const cnt = interCount ?? 0;
const freq = clamp(cnt, 0, 6);
warmth += Math.round((freq / 6) * 15);

// Channel breadth: +5 (if >=2 distinct kinds in last 30 days)
warmth += distinctKinds >= 2 ? 5 : 0;

// Decay: -0.5/day after 7 days (max -30)
if (daysSince > 7) {
  const dec = Math.min(30, (daysSince - 7) * 0.5);
  warmth -= Math.round(dec);
}
```

**The calculation includes ALL interactions, regardless of `kind`.**

---

## Impact

### What Should Affect Warmth ✅
- Actual contact interactions:
  - 📧 Email sent/received
  - 📞 Phone call
  - 💬 SMS/chat message
  - 🤝 Meeting
  - 📱 Social media interaction

### What Should NOT Affect Warmth ❌
- Internal actions:
  - 📝 Adding a note
  - 🗂️ Updating contact fields
  - 🏷️ Adding tags
  - 📋 Pipeline stage changes

**Current behavior:** Internal notes are treated the same as actual contact interactions, artificially inflating warmth scores.

---

## Solution Options

### Option 1: Filter Interaction Kinds in Warmth Calculation ⭐ RECOMMENDED

Modify the warmth recompute logic to only count meaningful interaction kinds.

**Implementation:**
```typescript
// backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts

// Define meaningful interaction kinds that affect warmth
const WARMTH_AFFECTING_KINDS = ['email', 'call', 'sms', 'meeting', 'dm', 'social'];

// Frequency: interactions in last 90 days (only meaningful kinds)
const { count: interCount } = await supabase
  .from('interactions')
  .select('id', { count: 'exact', head: true })
  .eq('contact_id', params.id)
  .in('kind', WARMTH_AFFECTING_KINDS)  // ← Filter here
  .gte('created_at', since90);

// Channel breadth: distinct kinds in last 30 days (only meaningful kinds)
const { data: kindsRows } = await supabase
  .from('interactions')
  .select('kind')
  .eq('contact_id', params.id)
  .in('kind', WARMTH_AFFECTING_KINDS)  // ← Filter here
  .gte('created_at', since30);

// Recency: Use last_meaningful_interaction_at instead of last_interaction_at
// OR: Query max(created_at) from interactions where kind IN (meaningful kinds)
const { data: lastMeaningful } = await supabase
  .from('interactions')
  .select('created_at')
  .eq('contact_id', params.id)
  .in('kind', WARMTH_AFFECTING_KINDS)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const lastAt = lastMeaningful?.created_at 
  ? new Date(lastMeaningful.created_at).getTime() 
  : undefined;
```

**Pros:**
- ✅ Simple, targeted fix
- ✅ No schema changes required
- ✅ Backward compatible
- ✅ Easy to adjust which kinds affect warmth

**Cons:**
- ⚠️ Need to update both single-contact and bulk recompute endpoints
- ⚠️ Recency calculation becomes slightly more expensive (extra query)

---

### Option 2: Add `affects_warmth` Flag to Interactions

Add a boolean field to the interactions table.

**Schema Change:**
```sql
ALTER TABLE interactions 
ADD COLUMN affects_warmth BOOLEAN DEFAULT TRUE;

-- Set existing notes to not affect warmth
UPDATE interactions 
SET affects_warmth = FALSE 
WHERE kind = 'note';
```

**Implementation:**
```typescript
// When creating notes
await supabase.from('interactions').insert([{
  contact_id,
  kind: 'note',
  content,
  affects_warmth: false,  // ← Explicit flag
}]);

// In warmth calculation
const { count } = await supabase
  .from('interactions')
  .select('id', { count: 'exact' })
  .eq('contact_id', id)
  .eq('affects_warmth', true)  // ← Filter on flag
  .gte('created_at', since90);
```

**Pros:**
- ✅ Explicit control per interaction
- ✅ Flexible (can toggle per record)
- ✅ Clear intent

**Cons:**
- ❌ Requires schema migration
- ❌ Need to update existing records
- ❌ Need to update database triggers
- ❌ More complex

---

### Option 3: Separate Internal Notes Table

Create a dedicated `contact_notes` table separate from `interactions`.

**Pros:**
- ✅ Clean separation of concerns
- ✅ Notes don't pollute interactions

**Cons:**
- ❌ Major schema change
- ❌ Need to migrate existing notes
- ❌ More complex queries (JOIN when showing activity timeline)

---

## Recommended Implementation: Option 1

**Why:** 
- Fastest to implement
- No breaking changes
- Solves the immediate problem
- Can be done entirely in the warmth calculation logic

---

## Implementation Steps

### 1. Update Single-Contact Warmth Recompute
**File:** `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`

```typescript
// Define meaningful kinds
const WARMTH_INTERACTION_KINDS = ['email', 'call', 'sms', 'meeting', 'dm', 'social', 'linkedin', 'twitter'];

// Update frequency query (line 38-42)
const { count: interCount, error: iErr } = await supabase
  .from('interactions')
  .select('id', { count: 'exact', head: true })
  .eq('contact_id', params.id)
  .in('kind', WARMTH_INTERACTION_KINDS)
  .gte('created_at', since90);

// Update channel breadth query (line 47-51)
const { data: kindsRows } = await supabase
  .from('interactions')
  .select('kind')
  .eq('contact_id', params.id)
  .in('kind', WARMTH_INTERACTION_KINDS)
  .gte('created_at', since30);

// Update recency calculation (line 33)
const { data: lastInteraction } = await supabase
  .from('interactions')
  .select('created_at')
  .eq('contact_id', params.id)
  .in('kind', WARMTH_INTERACTION_KINDS)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();

const lastAt = lastInteraction?.created_at 
  ? new Date(lastInteraction.created_at).getTime() 
  : undefined;
```

### 2. Update Bulk Warmth Recompute
**File:** `backend-vercel/app/api/v1/warmth/recompute/route.ts`

Apply the same changes to the bulk endpoint (lines 43-54).

### 3. Add Constant for Warmth-Affecting Kinds
**File:** `backend-vercel/lib/constants.ts` (create if needed)

```typescript
/**
 * Interaction kinds that affect warmth calculation.
 * Internal actions like notes should NOT be included.
 */
export const WARMTH_INTERACTION_KINDS = [
  'email',
  'call',
  'sms', 
  'meeting',
  'dm',
  'social',
  'linkedin',
  'twitter',
  'instagram',
  'facebook',
  // Add more as needed
] as const;
```

### 4. Document Interaction Kinds
**File:** `docs/INTERACTION_KINDS.md` (create)

List all interaction kinds and whether they affect warmth.

---

## Testing Plan

### Before Fix
1. Note Emily Watson's current warmth score
2. Add a note to Emily
3. Trigger warmth recompute
4. **Expected (broken):** Warmth increases ❌
5. **Actual:** Warmth increases ❌

### After Fix
1. Note Emily Watson's current warmth score
2. Add a note to Emily
3. Trigger warmth recompute  
4. **Expected:** Warmth unchanged or decreased (decay) ✅
5. **Verify:** Only actual contact interactions affect warmth ✅

### Additional Tests
- Add actual interaction (email) → warmth increases ✅
- Add multiple notes → warmth unchanged ✅
- Time passes → warmth decays ✅
- Actual interaction + notes → warmth increases from interaction only ✅

---

## Related Files

- `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`
- `backend-vercel/app/api/v1/warmth/recompute/route.ts`
- `backend-vercel/app/api/v1/contacts/[id]/notes/route.ts`
- `supabase-future-schema.sql`

---

## Additional Considerations

### Future: Add More Interaction Types

When adding new interaction types, explicitly decide if they should affect warmth:

```typescript
// Example: Screenshot analysis
await supabase.from('interactions').insert({
  kind: 'screenshot_note',  // ← Internal, should NOT affect warmth
  content: analysisResult,
});

// Example: LinkedIn message
await supabase.from('interactions').insert({
  kind: 'linkedin',  // ← Real interaction, SHOULD affect warmth
  content: messageText,
});
```

### Consider: Interaction Weights

Future enhancement could weight different interaction types:
- Email: 1.0x
- Call: 1.5x
- Meeting: 2.0x
- SMS: 0.8x
- Note: 0.0x (excluded)

---

## Conclusion

**Current behavior:** Internal notes incorrectly boost warmth scores.

**Root cause:** Warmth calculation counts ALL interactions without filtering by kind.

**Solution:** Filter interactions by meaningful kinds that represent actual contact activity.

**Impact:** Low risk, high value. Warmth scores will more accurately reflect actual relationship engagement.
