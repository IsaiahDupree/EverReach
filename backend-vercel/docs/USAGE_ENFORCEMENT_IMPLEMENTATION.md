# Usage Enforcement Implementation Guide

## ✅ What's Complete

1. **✅ Tests Created:** Comprehensive test suite in `__tests__/lib/usage-limits.test.ts`
2. **✅ Library Ready:** `lib/usage-limits.ts` fully implemented
3. **✅ Database Ready:** Migration with functions and limits
4. **✅ UI Ready:** Usage summary endpoint reads from `usage_periods`

---

## 🚀 Implementation Steps

### Step 1: Run Tests

```bash
cd backend/backend-vercel
npm test -- usage-limits.test.ts
```

**Expected:** All tests pass ✅

---

### Step 2: Add Enforcement to Routes

#### Pattern for ALL Routes:

```typescript
import { canUseCompose, incrementComposeUsage } from "@/lib/usage-limits";
import { getClientOrThrow } from "@/lib/supabase";

export async function POST(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized("Unauthorized", req);
  
  const supabase = getClientOrThrow(req);
  
  // ✅ CHECK LIMIT BEFORE PROCESSING
  const usageCheck = await canUseCompose(supabase, user.id);
  if (!usageCheck.allowed) {
    return new Response(JSON.stringify({
      error: 'usage_limit_reached',
      message: usageCheck.reason || 'Monthly usage limit exceeded',
      current_usage: usageCheck.current_usage,
      limit: usageCheck.limit,
      resets_at: usageCheck.resets_at,
      tier: usageCheck.tier,
    }), { 
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // ... existing route logic ...
  
  // ✅ INCREMENT USAGE AFTER SUCCESS
  await incrementComposeUsage(supabase, user.id);
  
  return ok(result, req);
}
```

---

### Step 3: Update Specific Routes

#### Compose Routes:

**1. `/app/api/v1/compose/route.ts`**
```typescript
// Add after auth, before processing
const usageCheck = await canUseCompose(supabase, user.id);
if (!usageCheck.allowed) {
  return new Response(JSON.stringify({
    error: 'compose_limit_reached',
    ...usageCheck
  }), { status: 429 });
}

// ... existing compose logic ...

// Add after success
await incrementComposeUsage(supabase, user.id);
```

**2. `/app/api/v1/messages/prepare/route.ts`**
```typescript
// Same pattern as above
```

**3. `/app/api/v1/agent/compose/smart/route.ts`**
```typescript
// Same pattern as above
```

#### Voice Routes:

**1. `/app/api/v1/me/persona-notes/[id]/transcribe/route.ts`**
```typescript
import { canUseVoiceTranscription, incrementVoiceTranscriptionUsage } from "@/lib/usage-limits";

// Before transcription - estimate duration
const estimatedMinutes = audioDuration / 60; // Convert seconds to minutes

const usageCheck = await canUseVoiceTranscription(supabase, user.id, estimatedMinutes);
if (!usageCheck.allowed) {
  return new Response(JSON.stringify({
    error: 'voice_limit_reached',
    ...usageCheck
  }), { status: 429 });
}

// ... existing transcription logic ...

// After success - use actual duration
const actualMinutes = transcriptionResult.duration / 60;
await incrementVoiceTranscriptionUsage(supabase, user.id, actualMinutes);
```

**2. `/app/api/v1/transcribe/route.ts`**
```typescript
// Same pattern as above
```

---

## 🧪 Testing Enforcement

### Manual Testing:

**1. Test Core Tier Limits:**
```bash
# Make 50 compose requests
for i in {1..50}; do
  curl -X POST http://localhost:3000/api/v1/compose \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"prompt":"test"}'
done

# 51st request should return 429
curl -X POST http://localhost:3000/api/v1/compose \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"prompt":"test"}'
```

**Expected Response:**
```json
{
  "error": "compose_limit_reached",
  "message": "Monthly compose limit reached",
  "current_usage": 50,
  "limit": 50,
  "remaining": 0,
  "resets_at": "2025-12-01T00:00:00Z",
  "tier": "core"
}
```

**2. Test Pro Tier:**
```sql
-- Upgrade user to pro
UPDATE entitlements 
SET plan = 'pro'
WHERE user_id = 'test-user-id';
```

Now they should have 200 compose runs/month.

**3. Test Voice Limits:**
```bash
# Upload audio file and transcribe
# Should track minutes used
```

---

## 📊 Monitoring Usage

### Check Current Usage:

```sql
SELECT 
  user_id,
  compose_runs_used,
  compose_runs_limit,
  voice_minutes_used,
  voice_minutes_limit,
  period_start,
  period_end
FROM usage_periods
WHERE period_end > NOW()
ORDER BY compose_runs_used DESC
LIMIT 10;
```

### Find Users Near Limits:

```sql
SELECT 
  u.email,
  up.compose_runs_used,
  up.compose_runs_limit,
  ROUND((up.compose_runs_used::float / NULLIF(up.compose_runs_limit, 0)) * 100, 2) as usage_percentage
FROM usage_periods up
JOIN auth.users u ON u.id = up.user_id
WHERE up.period_end > NOW()
  AND up.compose_runs_limit > 0
  AND up.compose_runs_used >= up.compose_runs_limit * 0.8 -- 80% or more
ORDER BY usage_percentage DESC;
```

---

## 🎯 Error Handling

### Frontend Should Handle 429:

```typescript
// In API client
if (response.status === 429) {
  const data = await response.json();
  
  // Show paywall with upgrade CTA
  showPaywall({
    title: 'Usage Limit Reached',
    message: `You've used ${data.current_usage} of ${data.limit} ${featureName}`,
    ctaText: 'Upgrade to Pro',
    tier: data.tier,
    resetsAt: data.resets_at,
  });
  
  return;
}
```

---

## 📈 Analytics Events

Add tracking for limit hits:

```typescript
// After returning 429
analytics.capture('usage_limit_reached', {
  feature: 'compose',
  current_usage: usageCheck.current_usage,
  limit: usageCheck.limit,
  tier: usageCheck.tier,
  user_id: user.id,
});
```

---

## ✅ Checklist

- [ ] Run tests (`npm test -- usage-limits.test.ts`)
- [ ] Update compose routes (3 routes)
- [ ] Update voice routes (2 routes)
- [ ] Test with core tier user
- [ ] Test with pro tier user
- [ ] Test error handling in frontend
- [ ] Add analytics tracking
- [ ] Monitor usage in production
- [ ] Document for team

---

## 🚨 Important Notes

1. **Fail Open:** If usage check fails, allow the operation (graceful degradation)
2. **Increment After Success:** Only count usage after operation succeeds
3. **Accurate Timing:** For voice, use actual transcription duration, not estimated
4. **Clear Errors:** Return helpful error messages with upgrade path
5. **Monitor Closely:** Watch for false positives in first week

---

## 🎉 Expected Results

After implementation:
- ✅ Core users limited to 50 compose/month, 30 voice minutes/month
- ✅ Pro users limited to 200 compose/month, 120 voice minutes/month
- ✅ Enterprise users unlimited
- ✅ Clear error messages when limits hit
- ✅ Subscription page shows accurate usage
- ✅ Upsell opportunity at limit
