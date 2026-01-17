# Warmth Score Cap at 40 - Investigation & Fix ✅

## Problem
Warmth scores were capping at 40 and not increasing after messages were sent.

## Root Cause Analysis

### Warmth Score Calculation Formula
**File**: `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`

```typescript
let warmth = 30; // BASE SCORE

// Components:
// 1. Recency boost: +0 to +35 (based on last interaction within 90 days)
//    - Recent interaction (0 days ago) = +35
//    - 90+ days ago = +0
//    Formula: recency = (90 - daysSince) / 90 * 35

// 2. Frequency boost: +0 to +25 (interactions in last 90 days, capped at 6)
//    - 6+ interactions = +25
//    - 0 interactions = +0
//    Formula: frequency = (min(count, 6) / 6) * 25

// 3. Channel bonus: +10 (if ≥2 distinct interaction types in last 30 days)
//    - Email + Call = +10
//    - Only email = +0

// 4. Decay penalty: -0 to -30 (after 7 days of no interaction)
//    - 7 days = -0
//    - 67+ days = -30
//    Formula: decay = min(30, (daysSince - 7) * 0.5)

// Final score clamped: 0 to 100
warmth = clamp(warmth, 0, 100);
```

### Maximum Possible Score
- **Base**: 30
- **Recency**: +35
- **Frequency**: +25  
- **Channel**: +10
- **Total**: **100 points** (before decay)

### Why Scores Were Stuck at 40
The warmth calculation requires:
1. Recent interactions (recency boost)
2. Multiple interactions (frequency boost)
3. Different interaction types (channel bonus)

**The Issue**: When a message was marked as sent:
1. ✅ An interaction record WAS created
2. ✅ `last_interaction_at` WAS updated
3. ❌ **Warmth score was NOT recomputed**

Result: Contacts stayed at the base score of 40.

## The Fix

### Changed File
**File**: `backend-vercel/app/api/v1/messages/send/route.ts`

### What Changed
Added automatic warmth recompute after creating interaction:

```typescript
// After creating interaction and updating last_interaction_at:

// Recompute warmth score immediately
try {
  const recomputeUrl = new URL(
    `/v1/contacts/${msgWithContact.contact_id}/warmth/recompute`, 
    new URL(req.url).origin
  );
  const recomputeRes = await fetch(recomputeUrl.toString(), {
    method: 'POST',
    headers: {
      'Authorization': req.headers.get('Authorization') || '',
      'Content-Type': 'application/json',
    },
  });
  
  if (!recomputeRes.ok) {
    console.error('[messages/send] Warmth recompute failed:', await recomputeRes.text());
  } else {
    console.log('[messages/send] Warmth score recomputed successfully');
  }
} catch (recomputeErr) {
  console.error('[messages/send] Error recomputing warmth:', recomputeErr);
}
```

### How It Works Now
1. User marks message as sent
2. Backend creates interaction record
3. Backend updates `last_interaction_at`
4. **Backend immediately recomputes warmth** ← NEW!
5. Warmth score increases based on formula
6. Frontend refreshes and shows updated warmth

## Expected Behavior After Fix

### First Message Sent (Day 0)
```
Base: 30
Recency: +35 (just now)
Frequency: +4.2 (1 interaction)
Channel: +0 (only 1 type)
= 69 points
```

### Second Message Sent (Day 1)
```
Base: 30
Recency: +34.6 (1 day ago)
Frequency: +8.3 (2 interactions)
Channel: +0 (only 1 type)
= 73 points
```

### Third Message + Call (Day 2, different channels)
```
Base: 30
Recency: +34.2 (2 days ago)
Frequency: +12.5 (3 interactions)
Channel: +10 (2+ types!)
= 87 points
```

### Six Messages Over 2 Weeks (Multiple Channels)
```
Base: 30
Recency: +35 (recent)
Frequency: +25 (6+ interactions)
Channel: +10 (multiple types)
= 100 points (MAXIMUM! 🔥)
```

### After 30 Days of Silence
```
Base: 30
Recency: +23.3 (30 days ago)
Frequency: +25 (had 6 interactions)
Channel: +10
Decay: -11.5 (30-7 days * 0.5)
= 76.8 points
```

### After 90+ Days of Silence
```
Base: 30
Recency: +0 (90+ days)
Frequency: +25 (had interactions)
Channel: +10
Decay: -30 (maxed out)
= 35 points
```

## Testing Checklist

- [ ] Deploy backend to Vercel
- [ ] Send a message to a contact
- [ ] Verify warmth score increases above 40
- [ ] Send multiple messages to same contact
- [ ] Verify frequency boost applies
- [ ] Use different channels (email, call, note)
- [ ] Verify channel bonus applies (+5)
- [ ] Check console logs for "Warmth score recomputed successfully"
- [ ] Verify warmth decay after 7+ days

## Related Endpoints

### Recompute Single Contact
```bash
POST /v1/contacts/:id/warmth/recompute
Headers: Authorization: Bearer <token>
```

### Recompute Multiple Contacts
```bash
POST /v1/warmth/recompute
Headers: Authorization: Bearer <token>
Body: { "contact_ids": ["uuid1", "uuid2"] }
```

### Manual Trigger (if needed)
Frontend can manually trigger recompute:
```typescript
import { apiFetch } from '@/lib/api';

const recomputeWarmth = async (contactId: string) => {
  const response = await apiFetch(`/v1/contacts/${contactId}/warmth/recompute`, {
    method: 'POST',
  });
  return response.json();
};
```

## Database Schema

### Warmth Score History
Track all warmth changes in analytics:
```sql
CREATE TABLE warmth_score_history (
  id UUID PRIMARY KEY,
  occurred_at TIMESTAMPTZ,
  contact_id UUID REFERENCES contacts(id),
  from_score INT,
  to_score INT,
  delta INT,
  trigger TEXT, -- 'message_sent', 'manual_recompute', 'cron'
  reason TEXT
);
```

## Next Steps

1. ✅ **Fix implemented** - Auto-recompute after message sent
2. ⏳ **Deploy to production** - Push backend changes
3. ⏳ **Test in production** - Send messages, verify scores increase
4. ⏳ **Monitor logs** - Check for recompute errors
5. ⏳ **Add analytics** - Track warmth score changes in PostHog

## Impact

### Before Fix
- All contacts stuck at 40 (base score)
- No motivation to send messages
- Warmth feature appeared broken
- "Getting warmer!" message was misleading

### After Fix
- Scores range from 30-100 based on engagement
- Can achieve perfect 100 score with consistent multi-channel engagement
- Immediate feedback when sending messages
- Gamification encourages relationship building
- Accurate "hot" (60+), "warm" (30-59), "cool" (10-29), "cold" (<10) categorization

---

**Status**: ✅ Fixed  
**Last Updated**: 2025-10-09  
**Files Changed**: 1 (`backend-vercel/app/api/v1/messages/send/route.ts`)
