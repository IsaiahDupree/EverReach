# Warmth Score System - Complete Guide

**Last Updated:** November 4, 2025  
**Version:** 2.0 (Anchor Model with Continuity Guarantees)

---

## Table of Contents

1. [Overview](#overview)
2. [Mathematical Foundation](#mathematical-foundation)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Integration](#frontend-integration)
5. [Testing Guide](#testing-guide)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The Warmth Score System tracks relationship health using exponential decay with mode-specific rates. **Key innovation:** Anchor-based model ensures smooth mode transitions without score jumps.

### Core Concepts

- **Warmth Score:** 0-100 metric representing relationship temperature
- **Warmth Mode:** Decay rate (slow/medium/fast/test)
- **Anchor Model:** Stores `(score, time)` pair to compute current score on-demand
- **Continuity Guarantee:** Mode switches preserve score exactly

### Warmth Bands

| Score Range | Band | Color | Meaning |
|-------------|------|-------|---------|
| 80-100 | `hot` | Red | Active relationship |
| 60-79 | `warm` | Orange | Regular contact |
| 40-59 | `neutral` | Yellow | Occasional contact |
| 20-39 | `cool` | Blue | Infrequent contact |
| 0-19 | `cold` | Gray | Dormant relationship |

---

## Mathematical Foundation

### Exponential Decay Formula

```
score(t) = W_min + (anchor_score - W_min) × e^(-λ × days_elapsed)
```

**Where:**
- `W_min = 0` (minimum score)
- `anchor_score` = score at anchor time
- `λ` (lambda) = decay rate per day
- `days_elapsed` = time since anchor

### Lambda Values (Decay Rates)

| Mode | Lambda | Half-Life | Time to score=30 |
|------|--------|-----------|------------------|
| **Slow** | 0.040132 | ~17 days | ~30 days |
| **Medium** | 0.085998 | ~8 days | ~14 days |
| **Fast** | 0.171996 | ~4 days | ~7 days |
| **Test** | 55.26 | ~18 minutes | ~2 hours |

### Exact Target Calculation

To reach a target score `S` from anchor `A` in mode `m`:

```
t_days = ln((A - W_min) / (S - W_min)) / λ[m]
```

Then set `anchor_at = now - t_days`.

---

## Backend Implementation

### Database Schema

```sql
-- contacts table (relevant columns)
CREATE TABLE contacts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Current cached values
  warmth INTEGER,                  -- Rounded display score (0-100)
  warmth_band TEXT,                 -- 'hot', 'warm', 'neutral', 'cool', 'cold'
  
  -- Anchor model (source of truth)
  warmth_mode warmth_mode,          -- 'slow', 'medium', 'fast', 'test'
  warmth_anchor_score NUMERIC(5,2), -- Score at anchor time (full precision)
  warmth_anchor_at TIMESTAMPTZ,     -- When anchor was set
  
  -- Cache for performance
  warmth_score_cached INTEGER,      -- Same as warmth
  warmth_cached_at TIMESTAMPTZ,     -- When cache was updated
  
  last_interaction_at TIMESTAMPTZ
);

-- Mode change log
CREATE TABLE warmth_mode_changes (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL,
  user_id UUID NOT NULL,
  from_mode TEXT NOT NULL,
  to_mode TEXT NOT NULL,
  score_before INTEGER,
  score_after INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Core Functions (lib/warmth-ewma.ts)

```typescript
/**
 * Calculate current warmth score from anchor
 */
export function warmthScoreFromAnchor(
  anchorScore: number,
  anchorAt: Date | string,
  mode: WarmthMode,
  now: Date = new Date(),
  wmin = 0
): number {
  const anchorTime = typeof anchorAt === 'string' ? new Date(anchorAt) : anchorAt;
  const dtDays = Math.max(0, (now.getTime() - anchorTime.getTime()) / DAY_MS);
  const lambda = LAMBDA_PER_DAY[mode];
  const raw = wmin + (anchorScore - wmin) * Math.exp(-lambda * dtDays);
  return Math.max(0, Math.min(100, Math.round(raw)));
}

/**
 * Apply mode switch without score jump
 */
export function applyModeSwitchNoJump(
  contact: {
    warmth_mode: WarmthMode;
    warmth_anchor_score: number;
    warmth_anchor_at: string | Date;
  },
  newMode: WarmthMode
) {
  const now = new Date();
  
  // Calculate current score with OLD mode
  const currentScore = warmthScoreFromAnchor(
    contact.warmth_anchor_score,
    contact.warmth_anchor_at,
    contact.warmth_mode,
    now
  );

  // Re-anchor: keep score, change decay rate
  return {
    warmth_mode: newMode,
    warmth_anchor_score: currentScore,
    warmth_anchor_at: now.toISOString(),
    warmth: currentScore,
    warmth_band: getWarmthBand(currentScore),
    warmth_score_cached: currentScore,
    warmth_cached_at: now.toISOString(),
  };
}
```

### API Endpoints

#### GET /api/v1/contacts/:id/warmth/mode

Get current warmth mode and score.

**Response:**
```json
{
  "contact_id": "abc-123",
  "current_mode": "medium",
  "current_score": 75.43,  // ← Full floating point
  "current_band": "warm",
  "last_interaction_at": "2025-11-01T12:00:00Z"
}
```

#### PATCH /api/v1/contacts/:id/warmth/mode

Switch warmth mode (preserves score continuity).

**Request:**
```json
{
  "mode": "fast"  // slow, medium, fast, test
}
```

**Response:**
```json
{
  "contact_id": "abc-123",
  "mode_before": "medium",
  "mode_after": "fast",
  "score_before": 75.43,
  "score_after": 75.43,  // ← No jump!
  "band_after": "warm",
  "changed_at": "2025-11-04T14:30:00Z",
  "message": "Mode changed to fast. Score unchanged: 75. Future decay rate adjusted."
}
```

#### GET /api/v1/contacts/:id/warmth-history

Get warmth score history over time.

**Query Params:**
- `window`: `7d`, `30d`, `90d` (default: `30d`)

**Response:**
```json
{
  "contact_id": "abc-123",
  "window": "30d",
  "snapshots": [
    {
      "timestamp": "2025-10-05T12:00:00Z",
      "score": 100,
      "band": "hot",
      "mode": "medium"
    },
    {
      "timestamp": "2025-10-12T12:00:00Z",
      "score": 85,
      "band": "hot",
      "mode": "medium"
    },
    // ...
  ]
}
```

---

## Frontend Integration

### React Native Example

#### 1. Fetch Warmth Score

```typescript
import { useQuery } from '@tanstack/react-query';

function ContactDetail({ contactId }: { contactId: string }) {
  // Fetch current warmth score
  const { data: warmth, refetch } = useQuery({
    queryKey: ['contact', contactId, 'warmth'],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      return response.json();
    },
    refetchInterval: 60000, // Auto-refresh every minute
  });

  return (
    <View>
      <Text>Score: {warmth?.current_score.toFixed(1)}</Text>
      <Text>Band: {warmth?.current_band}</Text>
      <WarmthModeSelector
        contactId={contactId}
        currentMode={warmth?.current_mode}
        onModeChange={refetch}
      />
    </View>
  );
}
```

#### 2. Switch Mode

```typescript
import { useMutation, useQueryClient } from '@tanstack/react-query';

function WarmthModeSelector({ contactId, currentMode, onModeChange }) {
  const queryClient = useQueryClient();
  
  const switchMode = useMutation({
    mutationFn: async (newMode: 'slow' | 'medium' | 'fast') => {
      const response = await fetch(
        `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ mode: newMode }),
        }
      );
      
      if (!response.ok) throw new Error('Mode switch failed');
      return response.json();
    },
    onSuccess: (data) => {
      console.log(`Mode switched: ${data.mode_before} → ${data.mode_after}`);
      console.log(`Score continuity: ${data.score_before} → ${data.score_after}`);
      
      // ✅ Backend handles the update, just invalidate cache
      queryClient.invalidateQueries(['contact', contactId, 'warmth']);
      
      // ❌ DON'T call updatePerson() - causes infinite loop!
      // updatePerson(contactId, { warmth_mode: newMode }); // NO!
      
      onModeChange?.();
    },
  });

  return (
    <View>
      <Button
        title="Slow"
        onPress={() => switchMode.mutate('slow')}
        disabled={currentMode === 'slow'}
      />
      <Button
        title="Medium"
        onPress={() => switchMode.mutate('medium')}
        disabled={currentMode === 'medium'}
      />
      <Button
        title="Fast"
        onPress={() => switchMode.mutate('fast')}
        disabled={currentMode === 'fast'}
      />
    </View>
  );
}
```

#### 3. Display Warmth History

```typescript
import { LineChart } from 'react-native-chart-kit';

function WarmthHistoryChart({ contactId }) {
  const { data: history } = useQuery({
    queryKey: ['contact', contactId, 'warmth-history'],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/v1/contacts/${contactId}/warmth-history?window=30d`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.json();
    },
  });

  if (!history) return <Loading />;

  return (
    <LineChart
      data={{
        labels: history.snapshots.map(s => formatDate(s.timestamp)),
        datasets: [{
          data: history.snapshots.map(s => s.score),
        }],
      }}
      width={350}
      height={220}
      chartConfig={{
        backgroundColor: '#fff',
        color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
      }}
    />
  );
}
```

### ⚠️ Critical: Avoid Infinite Loops

**DON'T DO THIS:**
```typescript
onModeChange={(mode) => {
  // ❌ This causes infinite loop:
  updatePerson(contactId, { warmth_mode: mode });
  // → triggers PeopleProvider refresh
  // → component re-renders
  // → syncs from existingPerson
  // → triggers effect again
  // → LOOP!
}}
```

**DO THIS:**
```typescript
onModeChange={async (mode) => {
  // ✅ Let backend handle it, just invalidate cache
  await switchModeMutation.mutate(mode);
  queryClient.invalidateQueries(['contact', contactId]);
}}
```

---

## Testing Guide

### Run Tests

```powershell
# Set environment variables
$env:SUPABASE_URL = "https://your-project.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "your-service-key"
$env:TEST_USER_ID = "your-user-id"

# Run improved continuity test
node test-warmth-continuity-improved.mjs
```

### What Gets Tested

✅ **Exact Mathematical Anchoring**
- No approximations - uses exact `t_days = ln((A - W_min) / (S - W_min)) / λ`
- Guaranteed to hit target score within floating-point tolerance

✅ **API-Based Mode Switching**
- Calls `PATCH /api/v1/contacts/:id/warmth/mode`
- Validates API response and DB state

✅ **Full Precision Assertions**
- Compares `warmth_anchor_score` (numeric) not `warmth` (int)
- Tolerance: 1e-6 for anchor continuity

✅ **Bidirectional Transitions**
- Tests: slow→medium, medium→fast, fast→slow, etc.

✅ **Randomized Sequences**
- 5+ random mode switches with random target scores

✅ **Mode Change Logs**
- Verifies `warmth_mode_changes` table entries

✅ **Warmth Band Validation**
- Asserts `warmth_band` matches `getWarmthBand(score)`

✅ **Negative Control**
- Intentionally creates jump, verifies test detects it

✅ **CI-Ready Exit Codes**
- Exit 0 on success, 1 on failure
- PASS/FAIL summary with failure details

### Expected Output

```
🧪 Warmth Score Continuity Testing - IMPROVED VERSION

🔧 Creating test contact...
✅ Created: Continuity Test (Improved) (abc-123)
   Initial: score=100, mode=medium, anchor=100

============================================================
TEST PLAN
============================================================
1. Exact anchoring: medium@100 → target 75 → switch to fast
2. Exact anchoring: fast@75 → target 50 → switch to slow
3. Exact anchoring: slow@50 → target 30 → switch to medium
4. Bidirectional: medium@30 → target 60 → switch to fast
5. Randomized: 5 random transitions
6. Negative control: detect intentional jump
============================================================

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TEST: medium → fast at score ≈ 75
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   🎯 Anchored to target: 75.00 (actual: 75.000001, t_days: 3.3182)
   ✅ API response mode_after = fast
   ✅ No score jump (API)
   ✅ DB warmth_mode = fast
   ✅ Anchor score continuity (DB)
   ✅ Warmth band correct
   ✅ Log from_mode = medium
   ✅ Log to_mode = fast
   ✅ Log score matches
   ✅ Mode switch complete: medium → fast

[... more tests ...]

============================================================
📊 TEST SUMMARY
============================================================
Total Tests: 47
✅ Passed: 47
❌ Failed: 0
Success Rate: 100.0%
============================================================

✅ ALL TESTS PASSED
```

---

## Best Practices

### Backend

1. **Always use anchor model for mode switches**
   - Call `applyModeSwitchNoJump()` to preserve continuity
   - Never manually set `warmth_mode` without re-anchoring

2. **Update cache after interactions**
   ```typescript
   await applyTouch(intensity); // Updates anchor_score to 80-100
   ```

3. **Log mode changes**
   - Insert into `warmth_mode_changes` table
   - Enables audit trail and analytics

4. **Use full precision in calculations**
   - Store `warmth_anchor_score` as `NUMERIC(5,2)`
   - Round only for display (`warmth` integer)

### Frontend

1. **Fetch warmth score regularly**
   - Use `refetchInterval: 60000` (1 minute)
   - Shows live decay

2. **Never call updatePerson after mode switch**
   - Backend handles everything
   - Just invalidate React Query cache

3. **Display full precision when useful**
   - Show `75.4` instead of `75` for power users
   - Round for casual display

4. **Handle loading and error states**
   ```typescript
   if (warmth.isLoading) return <Skeleton />;
   if (warmth.isError) return <Error />;
   ```

5. **Provide mode selection UI**
   - Explain decay rates to users
   - Show estimated "days until cool/cold"

---

## Troubleshooting

### Problem: Score jumped after mode switch

**Cause:** Using old `family_name`/`given_name` schema or wrong anchor.

**Fix:** 
- Use `display_name` field
- Always call `applyModeSwitchNoJump()`
- Check `warmth_anchor_score` equals `score_before`

### Problem: Test mode not decaying fast enough

**Cause:** Lambda value might be cached or incorrect.

**Fix:**
- Verify `LAMBDA_PER_DAY.test = 55.26`
- Check calculation: `e^(-55.26 × 0.25) ≈ 0` (6 hours)

### Problem: Frontend shows stale warmth score

**Cause:** Cache not invalidated after mode switch.

**Fix:**
```typescript
queryClient.invalidateQueries(['contact', contactId, 'warmth']);
```

### Problem: Infinite loop when switching modes

**Cause:** Calling `updatePerson()` in `onModeChange` callback.

**Fix:** Remove `updatePerson()` call. Backend updates everything.

### Problem: API returns "Could not find column"

**Cause:** Using old schema columns.

**Fix:**
- Use `display_name` not `given_name`/`family_name`
- Include `org_id` when creating contacts

---

## Mathematical Verification

### Half-Life Calculation

Half-life `t_½` is when score drops to 50% of anchor:

```
0.5 = e^(-λ × t_½)
ln(0.5) = -λ × t_½
t_½ = -ln(0.5) / λ = ln(2) / λ
```

**Verified:**
- Slow: `ln(2) / 0.040132 ≈ 17.27 days` ✓
- Medium: `ln(2) / 0.085998 ≈ 8.06 days` ✓
- Fast: `ln(2) / 0.171996 ≈ 4.03 days` ✓
- Test: `ln(2) / 55.26 ≈ 0.0125 days ≈ 18 minutes` ✓

### Days to Threshold

Days to reach score=30 from 100:

```
30 = 0 + (100 - 0) × e^(-λ × t)
0.3 = e^(-λ × t)
t = -ln(0.3) / λ
```

**Verified:**
- Slow: `-ln(0.3) / 0.040132 ≈ 30.0 days` ✓
- Medium: `-ln(0.3) / 0.085998 ≈ 14.0 days` ✓
- Fast: `-ln(0.3) / 0.171996 ≈ 7.0 days` ✓

---

## Deployment Checklist

### Backend
- [ ] Run migrations (`20251104_fix_persona_notes_complete.sql`)
- [ ] Deploy to Vercel
- [ ] Verify endpoints return full precision scores
- [ ] Test mode switch preserves continuity
- [ ] Check `warmth_mode_changes` table populated

### Frontend
- [ ] Update API calls to use new endpoints
- [ ] Remove `updatePerson()` from mode switch handlers
- [ ] Add warmth score display with decimals
- [ ] Implement warmth history chart
- [ ] Test mode switching doesn't cause loops
- [ ] Verify cache invalidation works

### Testing
- [ ] Run `test-warmth-continuity-improved.mjs`
- [ ] All tests pass (exit code 0)
- [ ] No score jumps detected
- [ ] Mode change logs verified
- [ ] Warmth bands correct

---

## Resources

- **Backend Code:** `backend-vercel/lib/warmth-ewma.ts`
- **API Endpoints:** `backend-vercel/app/api/v1/contacts/[id]/warmth/`
- **Test Suite:** `test-warmth-continuity-improved.mjs`
- **Lambda Constants:** [EWMA Theory](https://en.wikipedia.org/wiki/Exponential_smoothing)

---

**Questions?** Contact the backend team or check the test output for verification.
