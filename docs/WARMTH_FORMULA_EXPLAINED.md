# Warmth Score Formula - Complete Explanation

## Overview

Warmth score is a **0-100 metric** that reflects how engaged your relationship is with a contact. It's based on:
- ✅ **Recency** - How recently you interacted
- ✅ **Frequency** - How often you interact
- ✅ **Channel diversity** - How many ways you communicate
- ✅ **Time decay** - Score naturally decreases if you don't stay in touch

---

## The Complete Formula

```
Warmth Score = BASE + RECENCY_BOOST + FREQUENCY_BOOST + CHANNEL_BONUS - DECAY

Where:
  BASE = 40 (everyone starts here)
  RECENCY_BOOST = 0 to +25 (based on days since last interaction)
  FREQUENCY_BOOST = 0 to +15 (based on interaction count)
  CHANNEL_BONUS = 0 or +5 (diversity bonus)
  DECAY = 0 to -30 (penalty for no contact)
  
Final score is clamped between 0 and 100
```

---

## Formula Breakdown

### 1. Base Score: 40
**Every contact starts at 40.**

This represents a neutral relationship - not hot, not cold.

---

### 2. Recency Boost: 0 to +25
**How recently did you interact?**

```typescript
// Calculate days since last interaction
daysSince = (now - lastInteractionAt) / (1 day in milliseconds)

// Convert to recency multiplier (0.0 to 1.0)
recencyMultiplier = clamp(90 - daysSince, 0, 90) / 90

// Apply boost
recencyBoost = round(recencyMultiplier × 25)
```

**Examples:**
- **Just talked today (0 days):** `(90 - 0) / 90 = 1.0` → **+25 points** 🔥
- **Talked 30 days ago:** `(90 - 30) / 90 = 0.67` → **+17 points** 🌡️
- **Talked 60 days ago:** `(90 - 60) / 90 = 0.33` → **+8 points** 🧊
- **Talked 90+ days ago:** `(90 - 90) / 90 = 0.0` → **+0 points** ❄️

**Key insight:** The more recent the interaction, the warmer the relationship.

---

### 3. Frequency Boost: 0 to +15
**How often do you interact?**

```typescript
// Count interactions in last 90 days
interactionCount = COUNT(interactions WHERE created_at > now - 90 days)

// Cap at 6 (diminishing returns after that)
cappedCount = clamp(interactionCount, 0, 6)

// Convert to frequency multiplier (0.0 to 1.0)
frequencyMultiplier = cappedCount / 6

// Apply boost
frequencyBoost = round(frequencyMultiplier × 15)
```

**Examples:**
- **0 interactions:** `0 / 6 = 0.0` → **+0 points**
- **1 interaction:** `1 / 6 = 0.17` → **+3 points**
- **3 interactions:** `3 / 6 = 0.5` → **+8 points**
- **6+ interactions:** `6 / 6 = 1.0` → **+15 points** 🔥

**Key insight:** Regular contact builds a stronger relationship.

---

### 4. Channel Breadth Bonus: 0 or +5
**Do you communicate in multiple ways?**

```typescript
// Count distinct interaction kinds in last 30 days
distinctKinds = COUNT_DISTINCT(kind) WHERE created_at > now - 30 days

// Award bonus if diverse
channelBonus = distinctKinds >= 2 ? 5 : 0
```

**Examples:**
- **Only email:** 1 kind → **+0 points**
- **Email + calls:** 2 kinds → **+5 points** ✅
- **Email + calls + meetings:** 3 kinds → **+5 points** ✅
- **Email + LinkedIn + WhatsApp:** 3 kinds → **+5 points** ✅

**Key insight:** Multi-channel relationships are stronger.

---

### 5. Decay Penalty: 0 to -30
**Relationships cool down if you don't stay in touch.**

```typescript
// Only applies after 7 days of no contact
if (daysSince > 7) {
  daysOverThreshold = daysSince - 7
  
  // -0.5 points per day (rounded)
  decayAmount = min(30, daysOverThreshold × 0.5)
  
  decay = -round(decayAmount)
}
```

**Examples:**
- **0-7 days:** No decay → **-0 points** ✅
- **14 days (7 over):** `7 × 0.5 = 3.5` → **-4 points**
- **30 days (23 over):** `23 × 0.5 = 11.5` → **-12 points**
- **60 days (53 over):** `53 × 0.5 = 26.5` → **-27 points**
- **90+ days (83+ over):** `83 × 0.5 = 41.5` → **-30 points** (capped) ❄️

**Key insight:** The longer you don't talk, the colder the relationship gets.

---

## Real-World Examples

### Example 1: Brand New Contact (Just Added)
```
Variables:
- daysSince: 0 (just added)
- interactionCount: 0 (no history)
- distinctKinds: 0 (no interactions)

Calculation:
  BASE:           40
  RECENCY:        +25  (just contacted)
  FREQUENCY:      +0   (no history yet)
  CHANNEL:        +0   (only 1 kind)
  DECAY:          -0   (within 7 days)
  ─────────────────
  WARMTH:         65   (Warm) 🌡️
```

### Example 2: Active Relationship (Regular Contact)
```
Variables:
- daysSince: 3 (talked 3 days ago)
- interactionCount: 8 (active in last 90 days)
- distinctKinds: 3 (email, call, meeting)

Calculation:
  BASE:           40
  RECENCY:        +24  ((90-3)/90 × 25 = 24.17)
  FREQUENCY:      +15  (6/6 × 15 = 15, capped at 6)
  CHANNEL:        +5   (3 kinds ≥ 2)
  DECAY:          -0   (within 7 days)
  ─────────────────
  WARMTH:         84   (Hot) 🔥
```

### Example 3: Cooling Relationship (No Recent Contact)
```
Variables:
- daysSince: 30 (last contact 30 days ago)
- interactionCount: 2 (sparse history)
- distinctKinds: 1 (only email)

Calculation:
  BASE:           40
  RECENCY:        +17  ((90-30)/90 × 25 = 16.67)
  FREQUENCY:      +5   (2/6 × 15 = 5)
  CHANNEL:        +0   (only 1 kind)
  DECAY:          -12  ((30-7) × 0.5 = 11.5, rounded to 12)
  ─────────────────
  WARMTH:         50   (Neutral) 😐
```

### Example 4: Cold Relationship (Long Time No Contact)
```
Variables:
- daysSince: 120 (4 months ago)
- interactionCount: 0 (in last 90 days)
- distinctKinds: 0

Calculation:
  BASE:           40
  RECENCY:        +0   ((90-120)/90 = negative, clamped to 0)
  FREQUENCY:      +0   (0/6 × 15 = 0)
  CHANNEL:        +0   (0 kinds)
  DECAY:          -30  ((120-7) × 0.5 = 56.5, capped at 30)
  ─────────────────
  WARMTH:         10   (Cold) ❄️
```

### Example 5: Emily Watson's Case
```
Scenario: User adds internal notes frequently but has no actual contact

Variables:
- daysSince: 45 (last REAL interaction 45 days ago)
- interactionCount: 0 (notes don't count after our fix ✅)
- distinctKinds: 0

Calculation:
  BASE:           40
  RECENCY:        +13  ((90-45)/90 × 25 = 12.5)
  FREQUENCY:      +0   (0 meaningful interactions)
  CHANNEL:        +0   (0 distinct kinds)
  DECAY:          -19  ((45-7) × 0.5 = 19)
  ─────────────────
  WARMTH:         34   (Neutral) 😐

After our fix: Notes don't affect warmth, so score accurately reflects 
the lack of real contact.
```

---

## Warmth Bands

The score maps to descriptive bands:

| Score | Band | Icon | Description |
|-------|------|------|-------------|
| 70-100 | **Hot** 🔥 | Red | Very engaged, frequent contact |
| 50-69 | **Warm** 🌡️ | Orange | Moderately engaged, regular contact |
| 30-49 | **Neutral** 😐 | Yellow | Minimal engagement, occasional contact |
| 15-29 | **Cool** 🧊 | Blue | Low engagement, rare contact |
| 0-14 | **Cold** ❄️ | Gray | Dormant relationship, no recent contact |

---

## What Makes Warmth Go UP ⬆️

### 1. Send/Receive Messages ✅
- Email
- SMS
- Phone call
- DM (LinkedIn, Twitter, etc.)
- Meeting

**Impact:**
- ✅ Updates `lastInteractionAt` → Recency boost increases
- ✅ Adds to interaction count → Frequency boost increases
- ✅ May add new channel kind → Channel bonus activates

### 2. Use Multiple Communication Channels ✅
- Talk on email AND call
- Email AND meeting
- LinkedIn AND WhatsApp

**Impact:**
- ✅ Increases distinct kinds → Channel bonus (+5)

### 3. Maintain Regular Contact ✅
- Send an email every week
- Have monthly check-ins
- Consistent touchpoints

**Impact:**
- ✅ Keeps recency boost high
- ✅ Builds frequency boost
- ✅ Prevents decay

---

## What Makes Warmth Go DOWN ⬇️

### 1. Time Passes Without Contact ❌
**The #1 cause of warmth decay.**

After 7 days of no contact, warmth drops by **−0.5 points per day** (rounded).

**Example timeline for someone at Warmth 70:**
- Day 7: Still 70 (grace period)
- Day 14: 66 (−0.5 × 7 = −3.5, rounded to −4)
- Day 30: 58 (−0.5 × 23 = −11.5, rounded to −12)
- Day 60: 44 (−0.5 × 53 = −26.5, rounded to −27)
- Day 90+: 40 (−30 max decay, back to base)

### 2. Not Interacting Frequently ❌
If you only talk once every 90 days, frequency boost = 0.

### 3. Only Using One Channel ❌
If you only email (never call/meet), channel bonus = 0.

---

## What Does NOT Affect Warmth (After Our Fix) ✅

### Internal Actions (Correctly Excluded)
- ❌ Adding notes
- ❌ Updating contact fields (name, company, etc.)
- ❌ Adding tags
- ❌ Moving pipeline stages
- ❌ Screenshot analysis
- ❌ System events

**Why?** These are internal organization activities, not actual contact with the person.

---

## Implementation Status: Current System

### ✅ What We Have Implemented

#### 1. Base Score ✅
```typescript
let warmth = 40; // base
```
**Status:** ✅ Correctly implemented

#### 2. Recency Boost ✅
```typescript
if (typeof daysSince === 'number') {
  const recency = clamp(90 - daysSince, 0, 90) / 90; // 1..0
  warmth += Math.round(recency * 25);
}
```
**Status:** ✅ Correctly implemented
- Uses last MEANINGFUL interaction (after our fix)
- 0-90 day window
- Max +25 boost

#### 3. Frequency Boost ✅
```typescript
const cnt = interCount ?? 0;
const freq = clamp(cnt, 0, 6);
warmth += Math.round((freq / 6) * 15);
```
**Status:** ✅ Correctly implemented
- Counts meaningful interactions in last 90 days
- Caps at 6 interactions (diminishing returns)
- Max +15 boost

#### 4. Channel Breadth Bonus ✅
```typescript
warmth += distinctKinds >= 2 ? 5 : 0;
```
**Status:** ✅ Correctly implemented
- Counts distinct meaningful kinds in last 30 days
- Binary bonus: 0 or +5

#### 5. Decay Penalty ✅
```typescript
if (typeof daysSince === 'number' && daysSince > 7) {
  const dec = Math.min(30, (daysSince - 7) * 0.5);
  warmth -= Math.round(dec);
}
```
**Status:** ✅ Correctly implemented
- Starts after 7 days
- −0.5 per day (rounded)
- Capped at −30 max

#### 6. Score Clamping ✅
```typescript
warmth = clamp(warmth, 0, 100);
```
**Status:** ✅ Correctly implemented
- Min: 0
- Max: 100

#### 7. Interaction Filtering ✅
```typescript
.in('kind', WARMTH_INTERACTION_KINDS)
```
**Status:** ✅ Correctly implemented (as of latest fix)
- Excludes internal notes
- Only counts meaningful interactions

---

## Variables We Use

### Time-Based Variables
| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `daysSince` | number | Last meaningful interaction | Recency calculation |
| `now` | timestamp | Current time (+ offset for QA) | Reference point |
| `since90` | timestamp | Now - 90 days | Frequency window |
| `since30` | timestamp | Now - 30 days | Channel breadth window |

### Interaction-Based Variables
| Variable | Type | Source | Purpose |
|----------|------|--------|---------|
| `interCount` | integer | Count of interactions in 90d | Frequency calculation |
| `distinctKinds` | integer | Unique kinds in 30d | Channel breadth |
| `lastMeaningful` | timestamp | Query interactions table | Recency calculation |

### Configuration Constants
| Constant | Value | Purpose |
|----------|-------|---------|
| `BASE_SCORE` | 40 | Starting point |
| `MAX_RECENCY_BOOST` | 25 | Recency ceiling |
| `MAX_FREQUENCY_BOOST` | 15 | Frequency ceiling |
| `CHANNEL_BREADTH_BONUS` | 5 | Diversity bonus |
| `DECAY_START_DAYS` | 7 | Grace period |
| `DECAY_PER_DAY` | 0.5 | Decay rate |
| `MAX_DECAY` | 30 | Decay ceiling |

---

## Time-Based Behavior Summary

### How Warmth Changes Over Time (No New Contact)

Starting warmth: **65** (just contacted)

| Days | Recency Boost | Decay | Net Change | New Warmth | Band |
|------|---------------|-------|------------|------------|------|
| 0 | +25 | 0 | +25 | 65 | Warm 🌡️ |
| 3 | +24 | 0 | +24 | 64 | Warm 🌡️ |
| 7 | +23 | 0 | +23 | 63 | Warm 🌡️ |
| 14 | +21 | -4 | +17 | 57 | Warm 🌡️ |
| 30 | +17 | -12 | +5 | 45 | Neutral 😐 |
| 60 | +8 | -27 | -19 | 21 | Cool 🧊 |
| 90 | 0 | -30 | -30 | 10 | Cold ❄️ |

**Key takeaway:** Without contact, warmth naturally decreases over time.

### How Warmth Changes With Regular Contact

If you interact every 7 days:

| Days | Recency Boost | Frequency | Net | Warmth | Band |
|------|---------------|-----------|-----|--------|------|
| 0 | +25 | +3 | +68 | 68 | Warm 🌡️ |
| 7 | +23 | +5 | +68 | 68 | Warm 🌡️ |
| 14 | +23 | +8 | +71 | 71 | Hot 🔥 |
| 21 | +23 | +10 | +73 | 73 | Hot 🔥 |
| 30 | +23 | +13 | +76 | 76 | Hot 🔥 |
| 60 | +23 | +15 | +78 | 78 | Hot 🔥 |

**Key takeaway:** Regular contact maintains or increases warmth over time.

---

## System Design Decisions

### Why These Numbers?

1. **Base = 40**
   - Neutral starting point
   - Allows room to go up or down
   - Not too high (not everyone is warm initially)
   - Not too low (everyone deserves a fair shot)

2. **Max Recency Boost = 25**
   - Recent contact is most important
   - Can boost from 40 to 65 immediately
   - But not enough alone to reach "hot" (70+)

3. **Max Frequency Boost = 15**
   - Regular contact matters
   - Combined with recency can reach "hot"
   - Caps at 6 interactions (diminishing returns)

4. **Channel Bonus = 5**
   - Small bonus for diversity
   - Encourages multi-channel relationships
   - Not too large to dominate the score

5. **Decay Rate = −0.5/day after 7 days**
   - Grace period (7 days) is reasonable
   - Slow decay initially (−3.5 in first week)
   - Accelerates over time
   - Takes 60 days to lose all boosts

6. **Max Decay = −30**
   - Can't drop below base (40 - 30 = 10)
   - Everyone can recover with new contact

---

## Summary

### The Formula (Simple Version)
```
Warmth = 40 + Recency(0-25) + Frequency(0-15) + Channels(0-5) - Decay(0-30)
```

### What Makes It Go UP ⬆️
1. ✅ Send/receive messages (email, call, SMS, etc.)
2. ✅ Use multiple channels (email + call + meeting)
3. ✅ Interact frequently (6+ times in 90 days)

### What Makes It Go DOWN ⬇️
1. ❌ Time passes without contact (−0.5/day after 7 days)
2. ❌ Infrequent interactions
3. ❌ Single-channel communication only

### Is It Implemented Correctly? ✅
**Yes!** All components are properly implemented:
- ✅ Base score
- ✅ Recency boost (with meaningful interaction filter)
- ✅ Frequency boost (with meaningful interaction filter)
- ✅ Channel breadth bonus (with meaningful interaction filter)
- ✅ Time-based decay
- ✅ Score clamping (0-100)
- ✅ Internal notes excluded (our fix)

---

## References

- Implementation: `backend-vercel/app/api/v1/contacts/[id]/warmth/recompute/route.ts`
- Constants: `backend-vercel/lib/warmth.ts`
- Bulk: `backend-vercel/app/api/v1/warmth/recompute/route.ts`
