# Warmth Scoring System (Legacy Documentation)

> ⚠️ **IMPORTANT:** This document describes the OLD warmth scoring system. 
> 
> **For current system (EWMA-based), see:** [WARMTH_SCORE_ARCHITECTURE.md](./WARMTH_SCORE_ARCHITECTURE.md)
>
> This document is kept for historical reference only.

## Overview

The warmth scoring system measures relationship health on a scale of 0-100, automatically adjusting based on interaction patterns and time decay.

**Note:** The current production system uses EWMA (Exponentially Weighted Moving Average) with amplitude decay, which differs from the formula described below.

## How Warmth Scores Work

### Score Range: 0-100

| Score | Band | Meaning |
|-------|------|---------|
| 80-100 | Hot | Very active relationship, frequent recent contact |
| 60-79 | Warm | Healthy relationship, regular contact |
| 40-59 | Neutral | Moderate relationship, some contact |
| 20-39 | Cool | Relationship cooling down, infrequent contact |
| 0-19 | Cold | Relationship at risk, very little contact |

## Warmth Score Formula

### Base Score: 30 points
Every contact starts with a baseline of 30 points.

### Components (Max 100 total)

#### 1. Recency Boost (0-35 points)
**How it works**: More recent interactions give higher scores.

**Formula**: 
```
recency_score = ((90 - days_since_last_contact) / 90) × 35
```

**Examples**:
- Contact today (0 days): +35 points
- Contact 7 days ago: +32 points  
- Contact 30 days ago: +23 points
- Contact 60 days ago: +12 points
- Contact 90+ days ago: 0 points

#### 2. Frequency Boost (0-25 points)
**How it works**: More interactions in the last 90 days = higher score.

**Formula**:
```
frequency_score = (min(interaction_count, 6) / 6) × 25
```

**Examples**:
- 0 interactions: +0 points
- 1 interaction: +4 points
- 3 interactions: +13 points
- 6+ interactions: +25 points (maxed)

#### 3. Channel Diversity Bonus (0-10 points)
**How it works**: Using multiple communication channels shows stronger relationship.

**Formula**:
```
diversity_bonus = (distinct_channels >= 2) ? 10 : 0
```

**Examples**:
- Email only: +0 points
- Email + SMS: +10 points
- Email + Call + DM: +10 points

#### 4. Time Decay Penalty (0-30 points)
**How it works**: After 7 days of no contact, warmth starts to decay.

**Formula**:
```
decay_penalty = min(30, (days_since_last_contact - 7) × 0.5)
```

**Examples**:
- 0-7 days: 0 penalty
- 14 days: -3.5 points
- 30 days: -11.5 points
- 60 days: -26.5 points
- 67+ days: -30 points (max penalty)

## How Warmth Scores INCREASE

### Scenario 1: New Contact
```
Initial: 0 (no score)
Action: Create contact
Result: Still 0 (no interactions yet)
```

### Scenario 2: First Interaction
```
Before: 0
Action: Send email today
Calculation:
  Base: 30
  Recency: +35 (0 days old)
  Frequency: +4 (1 interaction)
  Diversity: +0 (only 1 channel)
  Decay: 0 (no time passed)
Result: 69 (Warm)
```

### Scenario 3: Multiple Interactions
```
Before: 69
Action: Add call and SMS in same week
Calculation:
  Base: 30
  Recency: +35 (still today)
  Frequency: +13 (3 interactions)
  Diversity: +10 (3 channels!)
  Decay: 0 (no time passed)
Result: 88 (Hot)
```

## How Warmth Scores DECREASE

### Method 1: Time Passing (Natural Decay)

#### Week 1: No Contact
```
Before: 88 (Hot)
Time: 7 days pass
Calculation:
  Base: 30
  Recency: +32 (7 days old)
  Frequency: +13 (still 3 interactions)
  Diversity: +10 (still 3 channels)
  Decay: 0 (just hit 7 day threshold)
Result: 85 (Hot)
Change: -3 points
```

#### Week 2: Still No Contact
```
Before: 85
Time: 14 days total
Calculation:
  Base: 30
  Recency: +29 (14 days old)
  Frequency: +13
  Diversity: +10
  Decay: -3.5 (7 days since threshold)
Result: 78.5 → 79 (Warm)
Change: -6 points from peak
```

#### Month 1: Still No Contact
```
Before: 79
Time: 30 days total
Calculation:
  Base: 30
  Recency: +23 (30 days old)
  Frequency: +13
  Diversity: +10
  Decay: -11.5 (23 days since threshold)
Result: 64.5 → 65 (Warm)
Change: -23 points from peak
Band change: Hot → Warm
```

#### Month 2: Still No Contact
```
Before: 65
Time: 60 days total
Calculation:
  Base: 30
  Recency: +12 (60 days old)
  Frequency: +13
  Diversity: +10
  Decay: -26.5 (53 days since threshold)
Result: 38.5 → 39 (Cool)
Change: -49 points from peak
Band change: Warm → Cool
```

#### Month 3: Still No Contact
```
Before: 39
Time: 90+ days total
Calculation:
  Base: 30
  Recency: 0 (90+ days old)
  Frequency: +13
  Diversity: +10
  Decay: -30 (max decay)
Result: 23 (Cool)
Change: -65 points from peak
Band: Cool (approaching Cold)
```

### Method 2: Deleting Interactions

If you delete interactions (e.g., removing old notes), the score recalculates immediately without those interactions.

```
Before: 88 (3 interactions, all channels)
Action: Delete 2 interactions
Calculation:
  Base: 30
  Recency: +35 (last interaction still today)
  Frequency: +4 (only 1 interaction now)
  Diversity: +0 (only 1 channel now)
  Decay: 0
Result: 69 (Warm)
Change: -19 points
Band change: Hot → Warm
```

## Decay Rate Timeline

| Days Since Last Contact | Recency Points | Decay Penalty | Net Recency Effect |
|-------------------------|----------------|---------------|-------------------|
| 0 (today) | +35 | 0 | +35 |
| 7 | +32 | 0 | +32 |
| 14 | +29 | -3.5 | +25.5 |
| 21 | +26 | -7 | +19 |
| 30 | +23 | -11.5 | +11.5 |
| 45 | +17 | -19 | -2 |
| 60 | +12 | -26.5 | -14.5 |
| 90+ | 0 | -30 | -30 |

**Key Insight**: After ~45 days, the decay penalty exceeds the recency boost, causing net negative contribution.

## Real-World Examples

### Example 1: Active Business Contact
```
Interactions:
- Email every week (52/year)
- Monthly calls (12/year)
- Quarterly in-person (4/year)

Typical Score: 85-95 (Hot)
Why: Consistent recent contact, high frequency, diverse channels
```

### Example 2: Good Friend (Intermittent Contact)
```
Interactions:
- Text every 2-3 weeks
- Occasional calls
- Rare meetups

Typical Score: 65-75 (Warm)
Why: Regular but not super frequent, moderate diversity
```

### Example 3: Old College Friend
```
Interactions:
- Last contact: 3 months ago
- Before that: 6 months ago
- Total: 2-3 interactions/year

Typical Score: 30-45 (Neutral/Cool)
Why: Infrequent contact, long gaps, decay accumulating
```

### Example 4: Dormant Relationship
```
Interactions:
- Last contact: 1 year ago
- No recent activity

Typical Score: 15-25 (Cool/Cold)
Why: Severe decay, no recent recency boost
```

## Testing Warmth Changes

### Test 1: Immediate Increase
```bash
1. Create contact
2. Add interaction (today)
3. Recompute warmth
Result: Score increases immediately
```

### Test 2: Natural Decay Over Time
**Problem**: Can't actually wait 30 days in a test!

**Solution**: Create interactions with old `occurred_at` timestamps

```bash
1. Create contact
2. Add interaction dated 30 days ago
3. Recompute warmth
Result: Score reflects decay as if time passed
```

### Test 3: See Real-Time Changes
**Use your actual account to watch warmth change:**

```bash
1. Pick a real contact
2. Check current warmth score
3. Add a new interaction (call, email, etc.)
4. Recompute warmth
5. Watch score increase in real-time!
```

## API Endpoints

### Recompute Warmth
```http
POST /api/v1/contacts/:id/warmth/recompute
```

**Response:**
```json
{
  "contact": {
    "id": "...",
    "warmth": 75,
    "warmth_band": "warm"
  },
  "warmth_score": 75
}
```

### Get Warmth History
```http
GET /api/v1/contacts/:id/warmth/history
```

View how warmth has changed over time.

## Best Practices

1. **Recompute regularly**: Run warmth recompute after adding interactions
2. **Monitor trends**: Watch for contacts moving from Warm → Cool
3. **Set alerts**: Get notified when VIPs drop below a threshold
4. **Re-engage proactively**: Reach out when scores start declining
5. **Track channels**: Diversify communication methods for stronger relationships

## Warmth Score Philosophy

The warmth score isn't just math—it reflects relationship reality:

- **Recent contact matters most**: You remember people you've talked to recently
- **Frequency shows investment**: Regular contact = stronger bond
- **Diversity indicates depth**: Multi-channel relationships are richer
- **Time erodes bonds**: Without maintenance, relationships fade
- **Decay is natural**: It's okay for scores to drop—it's a signal to re-engage

## Technical Implementation

### Database Fields
- `contacts.warmth`: INTEGER (0-100)
- `contacts.warmth_band`: VARCHAR (hot, warm, neutral, cool, cold)
- `contacts.last_interaction_at`: TIMESTAMP

### Trigger
Warmth history is automatically recorded when warmth score changes.

### Cron Jobs
Recommended: Run warmth recompute daily for all contacts to ensure freshness.

```sql
-- Example: Recompute for all contacts
SELECT id FROM contacts WHERE warmth IS NOT NULL;
```

## FAQ

**Q: Why did my score drop even though I didn't delete anything?**
A: Time decay is automatic. After 7 days of no contact, scores start declining.

**Q: Can a score go to 0?**
A: Yes, if a contact has no interactions and 90+ days have passed.

**Q: How often should I recompute warmth?**
A: After every new interaction, or daily via cron for all contacts.

**Q: What's the minimum score for a "healthy" relationship?**
A: 60+ (Warm band) indicates a healthy, active relationship.

**Q: Can I customize the formula?**
A: Yes! The algorithm is in `app/api/v1/contacts/[id]/warmth/recompute/route.ts`

## Related Documentation
- [Warmth History System](./warmth-history.md)
- [Interaction Tracking](./interactions.md)
- [Warmth Alerts](./warmth-alerts.md)
