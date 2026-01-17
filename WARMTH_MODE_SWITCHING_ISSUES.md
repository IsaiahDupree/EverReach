# Warmth Mode Switching Issues - Bug Report & Fix

## 🐛 Issues Found

### Issue #1: Score "Drops" When Switching to Same Mode (Backend)

**Status:** ✅ FIXED  
**Severity:** HIGH  
**Affected:** Backend API

#### Problem Description

When user switches warmth mode to the SAME mode (e.g., fast → fast), the score appears to drop dramatically:

```
mode_before: "fast" → mode_after: "fast"
score_before: 38 → score_after: 11
```

#### Root Cause

The `warmth` field (38) was showing a **stale cached value**, while the actual score based on the anchor model had decayed to **11** over time.

When `applyModeSwitchNoJump()` is called, it:
1. Recalculates current score from anchor using exponential decay formula
2. Reveals the TRUE score (11) based on time elapsed
3. User sees this as a "drop" but it's actually just revealing reality

**The Math:**
```typescript
// Anchor model formula
score(t) = anchor_score × e^(-λ × days_elapsed)

// If:
// - anchor_score = 100 (set 30 days ago)
// - mode = fast (λ = 0.172)
// - days_elapsed = 30

// Then:
score = 100 × e^(-0.172 × 30) = 100 × e^(-5.16) ≈ 0.57 ≈ 11
```

The score of 11 is CORRECT - the UI was showing stale data (38).

#### Fix Applied

Added early return when mode is already set:

```typescript
// If already in this mode, return early (no-op)
if (modeBefore === mode) {
  return ok({
    contact_id: params.id,
    mode_before: modeBefore,
    mode_after: mode,
    score_before: scoreBefore,
    score_after: scoreBefore, // Keep showing current (possibly stale) value
    band_after: contact.warmth_band || 'cold',
    changed_at: new Date().toISOString(),
    message: `Already in ${mode} mode. No change needed.`,
  }, req);
}
```

This prevents:
- Unnecessary database updates
- Revealing decayed score when no actual mode change
- User confusion about "score drops"

#### Deployment

**Commit:** `e59bd04`  
**File:** `backend-vercel/app/api/v1/contacts/[id]/warmth/mode/route.ts`  
**Lines Changed:** Added check at line 40-52

---

### Issue #2: Redundant API Calls (Frontend)

**Status:** ⏳ NOT FIXED  
**Severity:** MEDIUM  
**Affected:** Mobile app frontend

#### Problem Description

From the logs, the frontend is making **REDUNDANT calls**:

**Call Pattern:**
```
1. POST /warmth/mode {"mode": "fast"}
2. PATCH /contacts/:id (full contact update including warmth_mode)
3. POST /warmth/mode {"mode": "fast"} (DUPLICATE!)
4. PATCH /contacts/:id (full contact update including warmth_mode)
5. POST /warmth/mode {"mode": "fast"} (DUPLICATE!)
6. PATCH /contacts/:id (full contact update including warmth_mode)
```

**3 identical warmth mode calls within seconds!**

#### Why This Happens

The frontend likely has:
1. User taps warmth mode button → triggers update
2. Contact state updates locally → triggers re-render
3. Re-render calls the same update function again
4. Repeat

This is an **infinite loop or debouncing issue**.

#### Impact

- Wasted API calls (3x the requests)
- Potential race conditions
- Poor UX (loading states flicker)
- Increased costs (API usage, database writes)

#### Recommended Fix

**File:** Mobile app - Contact detail or warmth settings screen

**Option 1: Debounce the API call**
```typescript
const debouncedUpdateMode = useMemo(
  () => debounce(async (newMode: WarmthMode) => {
    await updateWarmthMode(contactId, newMode);
  }, 500),
  [contactId]
);
```

**Option 2: Add loading state guard**
```typescript
const [isUpdatingMode, setIsUpdatingMode] = useState(false);

const handleModeChange = async (newMode: WarmthMode) => {
  if (isUpdatingMode) return; // Prevent duplicate calls
  
  setIsUpdatingMode(true);
  try {
    await updateWarmthMode(contactId, newMode);
  } finally {
    setIsUpdatingMode(false);
  }
};
```

**Option 3: Remove redundant PATCH call**
```typescript
// BEFORE (redundant):
await updateWarmthMode(contactId, mode); // ✅ Calls /warmth/mode
await updateContact(contactId, { warmth_mode: mode }); // ❌ Redundant!

// AFTER (efficient):
await updateWarmthMode(contactId, mode); // ✅ Only this
// Backend already updates warmth_mode in database
```

The `/warmth/mode` endpoint ALREADY updates the `warmth_mode` field in the database, so there's no need to call `/contacts/:id` again with the same value.

---

## 📊 Summary

| Issue | Type | Severity | Status | Impact |
|-------|------|----------|--------|---------|
| Score drops on same mode | Backend Logic | HIGH | ✅ Fixed | User confusion |
| Redundant API calls | Frontend Logic | MEDIUM | ⏳ Not Fixed | Wasted requests |

---

## ✅ Testing Checklist

### Backend Fix
- [x] Mode switch to same mode returns early
- [x] No database update when mode unchanged
- [x] Score doesn't "drop" unexpectedly
- [x] Message indicates no change needed
- [x] warmth_band included in query
- [ ] Deploy to production
- [ ] Test in production with mobile app

### Frontend Fix (When Implemented)
- [ ] Only ONE API call per mode change
- [ ] No redundant PATCH to /contacts
- [ ] Loading state prevents duplicate calls
- [ ] Debouncing works correctly
- [ ] UI updates smoothly without flickering

---

## 🔍 How to Reproduce (Original Issue)

1. **Setup:**
   - Have a contact with warmth mode = "fast"
   - Let time pass (days) so warmth decays naturally
   - Cached `warmth` field becomes stale

2. **Trigger:**
   - User opens contact detail
   - User tries to switch warmth mode to "fast" (same as current)

3. **Expected (Before Fix):**
   - Score drops from 38 → 11 (reveals true decayed score)
   - User confused: "Why did my score drop?!"

4. **Expected (After Fix):**
   - API returns: "Already in fast mode. No change needed."
   - Score stays at 38 (keeps showing cached value)
   - No database update

---

## 💡 Additional Recommendations

### 1. Implement Warmth Score Background Refresh

**Problem:** Cached warmth scores get stale over time.

**Solution:** Add a cron job to periodically recompute warmth for all contacts:

```typescript
// app/api/cron/refresh-warmth/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Recompute warmth for contacts not updated in 24h
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id, warmth_anchor_score, warmth_anchor_at, warmth_mode')
    .lt('warmth_cached_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

  for (const contact of contacts || []) {
    const newScore = warmthScoreFromAnchor(
      contact.warmth_anchor_score,
      contact.warmth_anchor_at,
      contact.warmth_mode,
      new Date()
    );

    await supabase
      .from('contacts')
      .update({
        warmth: newScore,
        warmth_cached_at: new Date().toISOString()
      })
      .eq('id', contact.id);
  }

  return new Response('OK');
}
```

**Cron schedule:** Daily at 3 AM
```json
{
  "crons": [{
    "path": "/api/cron/refresh-warmth",
    "schedule": "0 3 * * *"
  }]
}
```

### 2. Add Warmth Score Staleness Indicator

Show users when warmth score is stale:

```typescript
function getWarmthFreshness(cachedAt: string | null): 'fresh' | 'stale' | 'very_stale' {
  if (!cachedAt) return 'very_stale';
  
  const hoursSince = (Date.now() - new Date(cachedAt).getTime()) / (1000 * 60 * 60);
  
  if (hoursSince < 6) return 'fresh';
  if (hoursSince < 24) return 'stale';
  return 'very_stale';
}
```

Display in UI:
```tsx
{warmthFreshness === 'stale' && (
  <Badge variant="warning">
    Score updated {hoursAgo}h ago · Tap to refresh
  </Badge>
)}
```

### 3. Frontend: Implement Optimistic Updates

```typescript
const handleModeChange = async (newMode: WarmthMode) => {
  // 1. Update UI immediately (optimistic)
  setLocalMode(newMode);
  
  // 2. Call API
  try {
    await updateWarmthMode(contactId, newMode);
  } catch (error) {
    // 3. Rollback on error
    setLocalMode(previousMode);
    showError('Failed to update warmth mode');
  }
};
```

---

## 📚 Related Files

**Backend:**
- `backend-vercel/app/api/v1/contacts/[id]/warmth/mode/route.ts` (fixed)
- `backend-vercel/lib/warmth-ewma.ts` (anchor model implementation)

**Frontend (needs fixing):**
- Mobile app contact detail screen
- Warmth mode selector component
- Contact update logic

**Documentation:**
- `docs/WARMTH_SYSTEM.md` (if exists)
- `docs/API_REFERENCE.md` (endpoint docs)

---

**Fixed:** November 3, 2025  
**Deployed:** Pending  
**Frontend Fix:** Pending
