# Warmth Testing Guide

## Overview

We have 3 different tests for warmth scores, each serving a different purpose:

1. **test-latest-endpoints.mjs** - Full test suite including warmth increase & decrease
2. **test-warmth-time-decay.mjs** - Simulates time passing to test decay
3. **test-warmth-with-real-contact.mjs** - Tests with YOUR real contacts

## 1. Full Test Suite (Increase & Decrease)

**File**: `test-latest-endpoints.mjs`

**What it tests**:
- ✅ Warmth increases when adding interactions
- ✅ Warmth decreases when deleting interactions
- ✅ Delete interaction endpoint
- ✅ Contact notes CRUD
- ✅ File attachments & signed URLs

**How it works**:
1. Creates test contact
2. Adds 3 interactions
3. Recomputes warmth → Score INCREASES
4. Deletes all interactions
5. Recomputes warmth → Score DECREASES

**Run it**:
```bash
node test/backend/test-latest-endpoints.mjs
```

**Expected output**:
```
📈 WARMTH SCORE CHANGE (INCREASE):
   Before: 0
   After:  43
   Change: +43
   Band:   none → neutral
   ✅ Warmth increased: PASS

📉 WARMTH SCORE CHANGE (DECREASE):
   After first recompute: 43
   After removing interactions: 30
   Change: -13
   Band: neutral → cool
   ✅ Warmth decreased: PASS
```

---

## 2. Time Decay Test (Simulated)

**File**: `test-warmth-time-decay.mjs`

**What it tests**:
- ⏰ How warmth decays over time WITHOUT actually waiting
- 📉 Verifies decay penalty formula
- 📊 Shows warmth at different time intervals

**How it works**:
Creates interactions with OLD `occurred_at` timestamps to simulate time passing:
- Interaction "today" → High warmth
- Interaction "30 days ago" → Medium warmth
- Interaction "90 days ago" → Low warmth

**Run it**:
```bash
node test/backend/test-warmth-time-decay.mjs
```

**Expected output**:
```
📊 DECAY TIMELINE RESULTS
==========================================
Days Ago | Warmth | Band      | Expected
--------------------------------------------------
0        | 69     | warm      | hot/warm
7        | 65     | warm      | warm
14       | 62     | warm      | warm
30       | 52     | neutral   | neutral
60       | 25     | cool      | cool
90       | 23     | cool      | cool/cold

📉 Key Observations:
• After 7 days: Decay starts (0.5 points/day)
• After 30 days: Significant decay (~-11.5 points)
• After 60 days: Major decay (~-26.5 points)
• After 90+ days: Maximum decay (-30 points)
```

---

## 3. Real Contact Test (See it Live!)

**File**: `test-warmth-with-real-contact.mjs`

**What it does**:
- 👤 Uses YOUR actual contacts from your account
- 🔴 Shows REAL-TIME warmth changes
- ✅ Safe (cleans up after itself)

**How it works**:
1. Searches for contact by name or email
2. Shows current warmth score
3. Adds a test interaction
4. Recomputes warmth → You see the increase!
5. Waits 5 seconds so you can check your app
6. Deletes test interaction
7. Restores original state

**Run it**:
```bash
# By name
node test/backend/test-warmth-with-real-contact.mjs "John Doe"

# By email
node test/backend/test-warmth-with-real-contact.mjs john@example.com
```

**Example output**:
```
👤 Real Contact Warmth Test
==========================================

🔍 Searching for contact: "John Doe"

✅ Found contact: John Doe
   ID: abc-123
   Email: john@example.com

📊 BEFORE Changes
──────────────────────────────────────────────────
   Warmth Score: 55
   Warmth Band: neutral
   Last interaction: 2025-10-15T10:30:00Z
   Total interactions: 8

➕ Adding test interaction (email sent today)...
✅ Test interaction added: xyz-789

🔄 Recomputing warmth score...
✅ Warmth recomputed

📈 AFTER Changes
──────────────────────────────────────────────────
   Warmth Score: 72
   Warmth Band: warm
   Last interaction: 2025-10-31T19:00:00Z
   Total interactions: 9

💡 COMPARISON
──────────────────────────────────────────────────
   Before: 55 (neutral)
   After:  72 (warm)
   Change: +17 points
   ✅ Warmth INCREASED!

🤔 Cleanup Options:
   The test interaction will be automatically deleted.
   You can view this contact in your app to see the warmth change!

⏳ Waiting 5 seconds so you can check your app...

🧹 Deleting test interaction...
✅ Test interaction deleted

🔄 Recomputing warmth to restore original state...
✅ Warmth restored to original state

✨ Test complete! Your contact is back to its original state.
```

---

## Testing Warmth Decay Over Time (Real Account)

### Method 1: Use Old Timestamps

The time decay test already does this! Just run:
```bash
node test/backend/test-warmth-time-decay.mjs
```

### Method 2: Test with Your Real Contacts

To see how warmth decays for a contact you haven't talked to recently:

1. **Pick an old contact** you haven't contacted in a while
2. **Check their warmth**:
   ```bash
   node test/backend/test-warmth-with-real-contact.mjs "Old Friend Name"
   ```
3. You'll see their warmth is low due to time decay!

### Method 3: Watch Decay Happen Live

**This requires actually waiting** (can't simulate), but here's how:

1. Create a test contact
2. Add interaction today
3. Recompute warmth → High score
4. Wait 7 days...
5. Recompute warmth again → Score will have decreased

**Script for this**:
```javascript
// Day 1
await createContact();
await addInteraction(today);
await recomputeWarmth(); // Score: ~69

// Day 8 (7 days later)
await recomputeWarmth(); // Score: ~66 (decay started)

// Day 30
await recomputeWarmth(); // Score: ~58 (more decay)
```

---

## Understanding the Results

### Warmth Bands

| Score | Band | What it Means |
|-------|------|---------------|
| 80-100 | Hot | Very active relationship |
| 60-79 | Warm | Healthy relationship |
| 40-59 | Neutral | Moderate contact |
| 20-39 | Cool | Relationship cooling |
| 0-19 | Cold | At risk |

### Time Decay Schedule

| Days Since Last Contact | Decay Penalty | Net Effect on Score |
|-------------------------|---------------|---------------------|
| 0-7 | None | Full recency boost |
| 7-14 | -0.5/day | Slight decrease |
| 14-30 | -0.5/day | Moderate decrease |
| 30-60 | -0.5/day | Significant decrease |
| 60-90 | -0.5/day | Major decrease |
| 90+ | Maximum (-30) | Severe penalty |

### Why Scores Change

**Increases when**:
- ✅ Adding new interactions (especially recent ones)
- ✅ Using multiple channels (email + call + SMS)
- ✅ More frequent contact

**Decreases when**:
- ⏰ Time passes without contact (after 7 days)
- 🗑️ Deleting interactions
- 📉 Long gaps between interactions

---

## Real-World Testing Scenarios

### Scenario 1: "I want to see warmth increase"
```bash
# Use your real account
node test/backend/test-warmth-with-real-contact.mjs "Your Contact Name"

# Or use the full test
node test/backend/test-latest-endpoints.mjs
```

### Scenario 2: "I want to see time decay"
```bash
# Simulate time passing
node test/backend/test-warmth-time-decay.mjs
```

### Scenario 3: "I want to test with multiple contacts"
```bash
# Run for each contact
node test/backend/test-warmth-with-real-contact.mjs "Contact 1"
node test/backend/test-warmth-with-real-contact.mjs "Contact 2"
node test/backend/test-warmth-with-real-contact.mjs "Contact 3"
```

### Scenario 4: "I want to verify decay over actual time"
1. Pick a contact
2. Check warmth today
3. Don't contact them for 30 days
4. Check warmth again
5. It will be lower!

---

## Tips & Tricks

### Find Your Contacts Quickly
```bash
# Lists all contacts (first 10)
node test/backend/test-warmth-with-real-contact.mjs "zzz-no-match"
```

### Test Multiple Time Periods
The decay test already does this for you with 6 time periods:
- Today
- 1 week ago
- 2 weeks ago
- 1 month ago
- 2 months ago
- 3 months ago

### Watch Changes in Real-Time
1. Run the real contact test
2. Open your app
3. Navigate to that contact
4. Watch the warmth update!

### Verify the Formula
All tests show the exact formula calculations in action:
- Base score: 30
- Recency boost: 0-35 points
- Frequency boost: 0-25 points
- Channel diversity: 0-10 points
- Time decay penalty: 0-30 points

---

## Complete Documentation

For full details on how warmth scores work, see:
**[docs/WARMTH_SCORING_SYSTEM.md](../../docs/WARMTH_SCORING_SYSTEM.md)**

This includes:
- Complete formula breakdown
- Real-world examples
- Decay timeline tables
- Best practices
- FAQ

---

## Quick Reference

```bash
# Full test suite (increase & decrease)
node test/backend/test-latest-endpoints.mjs

# Time decay simulation
node test/backend/test-warmth-time-decay.mjs

# Real contact test
node test/backend/test-warmth-with-real-contact.mjs "Contact Name"
```

**Happy testing! 🎉**
