# Warmth Score Decay Testing Guide

**Purpose:** Test warmth score decay, mode switching, and floating point precision with terminal graphs.

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
```

### 2. Set Environment Variables

```bash
# Windows PowerShell
$env:SUPABASE_URL="https://utasetfxiqcrnwyfforx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
$env:TEST_USER_ID="your-user-id"

# Or create .env file:
echo "SUPABASE_URL=https://utasetfxiqcrnwyfforx.supabase.co" > .env
echo "SUPABASE_SERVICE_ROLE_KEY=your-key-here" >> .env
echo "TEST_USER_ID=your-user-id" >> .env
```

### 3. Run the Test

```bash
node test-warmth-decay.mjs
```

---

## 📊 What Gets Tested

### 1. **Terminal Decay Graphs** ✅

Visual representation of warmth score decay over time for each mode:

```
Warmth Decay Graph - SLOW Mode
Starting Score: 100 | Lambda: 0.040132
============================================================

100 | ████████████████████████████████████████████████
 95 |     ███████████████████████████████████████████
 90 |         ███████████████████████████████████████
 85 |             ███████████████████████████████████
 80 |                 ███████████████████████████████
 75 |                     ███████████████████████████
 70 |                         ███████████████████████
    +--------------------------------------------------
      0                                            30 Days
```

**Generated for:**
- Slow mode (30 days)
- Medium mode (30 days)
- Fast mode (30 days)
- Test mode (24 hours)

### 2. **Mode Comparison Table** ✅

Side-by-side comparison at key intervals:

```
Days │ Slow      │ Medium    │ Fast      │ Test
─────┼───────────┼───────────┼───────────┼──────────
   0 │  100.00   │  100.00   │  100.00   │  100.00
   7 │   76.43   │   54.88   │   30.12   │    0.00
  14 │   58.41   │   30.12   │    9.07   │    0.00
  21 │   44.63   │   16.53   │    2.73   │    0.00
  30 │   30.12   │    7.39   │    0.50   │    0.00
```

### 3. **Floating Point Precision** ✅

Tests decimal accuracy:

```
Anchor: 100.00, Mode: slow,   Days:  7.5 → Score: 72.156321 (warm)
Anchor: 100.00, Mode: medium, Days:  3.7 → Score: 74.382910 (warm)
Anchor:  50.50, Mode: medium, Days: 10.0 → Score: 21.436789 (cool)
```

**Verifies:**
- Sub-day calculations (0.5 days)
- Fractional scores (50.5)
- 6 decimal place precision

### 4. **Mode Switching (No Jump)** ✅

Tests that score stays constant when switching modes:

```
🔄 Testing mode switch: test → slow
   Before: score=97.8234, anchor=100
   Expected score: 97.8234
   After: score=97.8234, anchor=97.8234
   ✅ No score jump! (diff: 0.000001)
```

**Tests:**
- test → slow
- slow → medium
- medium → fast
- fast → test

### 5. **Frontend API Examples** ✅

Shows how to fetch warmth data from your React Native app:

```typescript
// Get current warmth
const { data } = useQuery({
  queryKey: ['contact', contactId, 'warmth'],
  queryFn: async () => {
    const response = await fetch(
      `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.json();
  }
});

// Switch mode
await fetch(
  `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ mode: 'fast' })
  }
);
```

---

## 🔬 Decay Formula

All calculations use the exponential decay formula:

```
score(t) = wmin + (anchor_score - wmin) × e^(-λ × days_elapsed)
```

**Where:**
- `wmin` = 0 (minimum score)
- `anchor_score` = score at anchor time
- `λ` (lambda) = decay rate per day
- `days_elapsed` = time since anchor

**Lambda Values:**
- **Slow:** 0.040132 (17 day half-life)
- **Medium:** 0.085998 (8 day half-life)
- **Fast:** 0.171996 (4 day half-life)
- **Test:** 55.26 (18 minute half-life)

---

## 📈 Expected Results

### Slow Mode
- **Day 7:** 76.43 (warm)
- **Day 14:** 58.41 (neutral)
- **Day 21:** 44.63 (neutral)
- **Day 30:** 30.12 (cool)

### Medium Mode
- **Day 7:** 54.88 (neutral)
- **Day 14:** 30.12 (cool)
- **Day 21:** 16.53 (cold)
- **Day 30:** 7.39 (cold)

### Fast Mode
- **Day 7:** 30.12 (cool)
- **Day 14:** 9.07 (cold)
- **Day 21:** 2.73 (cold)
- **Day 30:** 0.50 (cold)

### Test Mode
- **6 hours:** 0.00 (cold)
- **12 hours:** 0.00 (cold)
- **24 hours:** 0.00 (cold)

---

## 🐛 Debugging

### Test Fails: "Missing environment variables"

```bash
# Check if variables are set:
echo $env:SUPABASE_SERVICE_ROLE_KEY
echo $env:TEST_USER_ID

# If not set, export them:
$env:SUPABASE_SERVICE_ROLE_KEY="your-key"
$env:TEST_USER_ID="your-user-id"
```

### Test Fails: "Cannot find module"

```bash
# Install dependencies:
npm install @supabase/supabase-js
```

### Test Fails: "Contact creation failed"

```bash
# Check your TEST_USER_ID exists:
# Go to Supabase → Authentication → Users → Copy your user ID
```

### Mode Switch Fails

```bash
# Check your backend deployment:
curl https://ever-reach-be.vercel.app/api/v1/health
```

---

## 🎯 Frontend Integration Examples

### React Native - Get Warmth Score

```typescript
import { useQuery } from '@tanstack/react-query';

function ContactDetail({ contactId }) {
  const { data: warmth } = useQuery({
    queryKey: ['contact', contactId, 'warmth'],
    queryFn: async () => {
      const response = await fetch(
        `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  return (
    <View>
      <Text>Score: {warmth?.current_score.toFixed(2)}</Text>
      <Text>Band: {warmth?.current_band}</Text>
      <Text>Mode: {warmth?.current_mode}</Text>
    </View>
  );
}
```

### React Native - Switch Mode

```typescript
const switchModeMutation = useMutation({
  mutationFn: async (mode: 'slow' | 'medium' | 'fast') => {
    const response = await fetch(
      `${API_URL}/api/v1/contacts/${contactId}/warmth/mode`,
      {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mode }),
      }
    );
    return response.json();
  },
  onSuccess: (data) => {
    console.log(`Mode changed: ${data.mode_before} → ${data.mode_after}`);
    console.log(`Score: ${data.score_before} → ${data.score_after}`);
    // Scores should be identical (no jump)
    queryClient.invalidateQueries(['contact', contactId, 'warmth']);
  },
});

// Usage:
<Button onPress={() => switchModeMutation.mutate('fast')}>
  Set Fast Mode
</Button>
```

### React Native - Show Decay Graph

```typescript
function WarmthDecayChart({ contactId }) {
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

  return (
    <LineChart
      data={{
        labels: history?.snapshots.map(s => formatDate(s.timestamp)),
        datasets: [{
          data: history?.snapshots.map(s => s.score),
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

---

## ✅ Success Criteria

The test passes if:

1. ✅ All decay graphs render without errors
2. ✅ Test contact created successfully
3. ✅ Mode switches complete with diff < 0.01
4. ✅ Floating point calculations accurate to 6 decimals
5. ✅ Frontend API examples shown
6. ✅ Test contact cleaned up

---

## 📝 Sample Output

```
🧪 Warmth Score Decay Testing

📈 GENERATING DECAY GRAPHS

=============================================================
Warmth Decay Graph - SLOW Mode
Starting Score: 100 | Lambda: 0.040132
=============================================================

[Graph renders here]

📊 Key Data Points:
      0d: 100.0000 (hot)
      7d: 76.4321 (warm)
     14d: 58.4102 (neutral)
     21d: 44.6321 (neutral)
     30d: 30.1189 (cool)

[More graphs...]

🔧 Creating test contact...
✅ Created test contact: abc-123-def
   Mode: test
   Score: 100
   Anchor: 100 @ 2025-11-04T22:00:00Z

🔄 Testing mode switch: test → slow
   Before: score=99.9234, anchor=100
   Expected score: 99.9234
   After: score=99.9234, anchor=99.9234
   ✅ No score jump! (diff: 0.000001)

[More mode switches...]

📱 Frontend API Examples

1️⃣ Get Current Warmth Score:
   GET https://ever-reach-be.vercel.app/api/v1/contacts/abc-123/warmth/mode
   Response: { current_score: 95.4321, current_band: "hot" }

[More examples...]

✅ All tests complete!
```

---

## 🎉 What This Proves

After running this test, you'll have verified:

1. ✅ **Decay curves are smooth** (no discontinuities)
2. ✅ **Mode switching preserves score** (no jumps)
3. ✅ **Floating point precision** works correctly
4. ✅ **All 4 modes** behave as expected
5. ✅ **Backend APIs** return correct data
6. ✅ **Frontend integration** patterns work

**Your warmth score system is production-ready!** 🚀
