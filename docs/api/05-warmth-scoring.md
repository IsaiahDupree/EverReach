# Warmth & Scoring API

Track and analyze relationship health with automatic warmth scoring based on interaction patterns.

**Base Endpoint**: `/v1/warmth`

---

## Overview

**Warmth Score** (0-100) measures relationship health:
- **Hot (80-100)**: Very engaged, frequent contact
- **Warm (60-79)**: Good relationship, regular interaction
- **Neutral (40-59)**: Moderate engagement
- **Cool (20-39)**: Declining engagement, needs attention
- **Cold (0-19)**: At risk, minimal recent contact

### Automatic Updates

Warmth scores automatically recalculate when:
- New interaction is logged
- Time passes (decay factor)
- Contact is manually updated
- Bulk recomputation is triggered

---

## Get Warmth Summary

Get an overview of relationship health across all contacts.

```http
GET /v1/warmth/summary
```

### Response

```json
{
  "total_contacts": 150,
  "by_band": {
    "hot": 25,
    "warm": 60,
    "cooling": 40,
    "cold": 25
  },
  "average_score": 58.5,
  "contacts_needing_attention": 65,
  "last_updated_at": "2025-10-12T19:30:00Z"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_contacts` | number | Total active contacts |
| `by_band.hot` | number | Contacts with warmth 81-100 |
| `by_band.warm` | number | Contacts with warmth 61-80 |
| `by_band.cooling` | number | Contacts with warmth 41-60 |
| `by_band.cold` | number | Contacts with warmth 0-40 |
| `average_score` | number | Average warmth across all contacts |
| `contacts_needing_attention` | number | Sum of cooling + cold contacts |
| `last_updated_at` | string | ISO 8601 timestamp |

### Example

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/v1/warmth/summary',
  {
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  }
);

const summary = await response.json();

// Display in dashboard
console.log(`Total Contacts: ${summary.total_contacts}`);
console.log(`Hot: ${summary.by_band.hot}`);
console.log(`Warm: ${summary.by_band.warm}`);
console.log(`Cooling: ${summary.by_band.cooling}`);
console.log(`Cold: ${summary.by_band.cold}`);
console.log(`Average Score: ${summary.average_score}`);
console.log(`Need Attention: ${summary.contacts_needing_attention}`);
```

### React Query Hook

```typescript
import { useQuery } from '@tanstack/react-query';

function useWarmthSummary() {
  return useQuery({
    queryKey: ['warmth-summary'],
    queryFn: () => apiCall('/v1/warmth/summary'),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

// Usage in component
function DashboardScreen() {
  const { data: summary, isLoading } = useWarmthSummary();
  
  if (isLoading) return <SkeletonLoader />;
  
  return (
    <View>
      <WarmthBandCard
        hot={summary.by_band.hot}
        warm={summary.by_band.warm}
        cooling={summary.by_band.cooling}
        cold={summary.by_band.cold}
      />
      <Text>Average: {summary.average_score}</Text>
      <Text>Need Attention: {summary.contacts_needing_attention}</Text>
    </View>
  );
}
```

---

## Recompute Warmth (Bulk)

Recalculate warmth scores for multiple contacts.

```http
POST /v1/warmth/recompute
Content-Type: application/json
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `contact_ids` | UUID[] | No | Specific contacts (empty = all) |

### Example - Specific Contacts

```typescript
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/warmth/recompute',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
      'Origin': 'https://everreach.app'
    },
    body: JSON.stringify({
      contact_ids: [
        '550e8400-e29b-41d4-a716-446655440000',
        '660e9500-f39c-52e5-b827-557766550111'
      ]
    })
  }
);

const { results } = await response.json();
```

### Response

```json
{
  "results": [
    {
      "contact_id": "550e8400-e29b-41d4-a716-446655440000",
      "warmth_score": 72,
      "warmth_band": "warm",
      "previous_score": 68,
      "change": 4
    },
    {
      "contact_id": "660e9500-f39c-52e5-b827-557766550111",
      "warmth_score": 45,
      "warmth_band": "neutral",
      "previous_score": 52,
      "change": -7
    }
  ]
}
```

### Example - All Contacts

```typescript
// Recompute all contacts (use sparingly)
const response = await fetch(
  'https://ever-reach-be.vercel.app/api/v1/warmth/recompute',
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contact_ids: [] // Empty array = all contacts
    })
  }
);
```

---

## Recompute Single Contact

Recalculate warmth for one contact.

```http
POST /v1/contacts/:id/warmth/recompute
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}/warmth/recompute`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    }
  }
);

const { warmth_score, warmth_band } = await response.json();
```

### Response

```json
{
  "contact_id": "550e8400-e29b-41d4-a716-446655440000",
  "warmth_score": 75,
  "warmth_band": "warm",
  "previous_score": 72,
  "factors": {
    "interaction_recency": 15,
    "interaction_frequency": 20,
    "interaction_quality": 25,
    "relationship_age": 10,
    "engagement_trend": 5
  }
}
```

---

## Manual Override

Set a custom warmth score and prevent automatic updates.

```http
PATCH /v1/contacts/:id
Content-Type: application/json
```

### Example

```typescript
const response = await fetch(
  `https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}`,
  {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      warmth: 95,
      warmth_override: true,
      warmth_override_reason: 'Major partnership signed, VIP status'
    })
  }
);
```

### Remove Override

```typescript
await fetch(`https://ever-reach-be.vercel.app/api/v1/contacts/${contactId}`, {
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    warmth_override: false
  })
});
```

---

## Warmth Calculation Factors

### 1. Interaction Recency (40% weight)
- Last 7 days: Maximum score
- 8-30 days: Decreasing score
- 30+ days: Significant penalty
- 90+ days: Near zero

### 2. Interaction Frequency (25% weight)
- Weekly contact: High score
- Monthly: Medium score
- Quarterly: Low score
- Less frequent: Minimal score

### 3. Interaction Quality (20% weight)
- Meetings > Calls > Emails > Notes
- Longer interactions score higher
- Two-way communication scores higher

### 4. Engagement Trend (10% weight)
- Increasing frequency: Bonus
- Consistent: Neutral
- Decreasing: Penalty

### 5. Relationship Age (5% weight)
- Established relationships get slight boost
- Brand new connections score neutral

---

## Warmth Bands

### Hot (80-100)
**Characteristics**:
- Very recent contact (< 7 days)
- Frequent interactions (multiple per week)
- High engagement quality

**Actions**:
- Maintain momentum
- Nurture with value-add content
- Look for expansion opportunities

### Warm (60-79)
**Characteristics**:
- Regular contact (1-2 weeks)
- Consistent engagement
- Healthy relationship

**Actions**:
- Continue regular touchpoints
- Share relevant resources
- Schedule periodic check-ins

### Neutral (40-59)
**Characteristics**:
- Occasional contact (2-4 weeks)
- Moderate engagement
- Stable but not growing

**Actions**:
- Increase touchpoint frequency
- Re-engage with value proposition
- Find new conversation topics

### Cool (20-39)
**Characteristics**:
- Infrequent contact (30-60 days)
- Declining engagement
- At risk of going cold

**Actions**:
- Immediate re-engagement needed
- Personalized outreach
- Understand blockers or changes

### Cold (0-19)
**Characteristics**:
- Rare or no contact (60+ days)
- Minimal engagement
- Relationship at risk

**Actions**:
- Win-back campaign
- Assess if relationship is worth saving
- Remove from active pipeline if unresponsive

---

## Common Patterns

### Get Contacts by Warmth Band

```typescript
const response = await fetch(
  '/v1/contacts?warmth_band=cool&limit=50',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { contacts } = await response.json();
console.log(`${contacts.length} contacts need attention`);
```

### Monitor Warmth Decline

```typescript
// Get all contacts with warmth < 40
const response = await fetch(
  '/v1/contacts?warmth_lte=39&sort=warmth.asc',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
);

const { contacts } = await response.json();

// Contacts sorted coldest first
contacts.forEach(c => {
  console.log(`${c.display_name}: ${c.warmth} (${c.warmth_band})`);
});
```

### Track Warmth Changes

```typescript
// Before interaction
const before = await fetch(`/v1/contacts/${contactId}`, {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

// Log interaction
await fetch('/v1/interactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contact_id: contactId,
    kind: 'call',
    content: 'Great catch-up call'
  })
});

// After interaction (warmth auto-recalculated)
const after = await fetch(`/v1/contacts/${contactId}`, {
  headers: { 'Authorization': `Bearer ${jwt}` }
}).then(r => r.json());

console.log(`Warmth: ${before.contact.warmth} → ${after.contact.warmth}`);
```

### Daily Warmth Monitoring

```typescript
// Get contacts that dropped to cool/cold
const cooling = await fetch(
  '/v1/contacts?warmth_lte=39&sort=warmth.asc&limit=20',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
).then(r => r.json());

// Prioritize VIPs
const vipCooling = cooling.contacts.filter(c => 
  c.tags.includes('vip') || c.tags.includes('customer')
);

console.log('VIPs needing attention:', vipCooling);
```

---

## Warmth Alerts

Set up alerts for warmth threshold violations (see [Warmth Alerts](./warmth-alerts.md)).

```typescript
// Set watch status on important contact
await fetch(`/v1/contacts/${contactId}/watch`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    watch_status: 'vip',        // none, watch, important, vip
    warmth_threshold: 40         // Alert if warmth drops below 40
  })
});
```

---

## Best Practices

### 1. Regular Recomputation
```typescript
// Run weekly to keep scores fresh
// (Automatic decay happens, but manual triggers ensure accuracy)
setInterval(async () => {
  await fetch('/v1/warmth/recompute', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body: JSON.stringify({ contact_ids: [] })
  });
}, 7 * 24 * 60 * 60 * 1000); // Weekly
```

### 2. Focus on Cooling Contacts
```typescript
// Daily check for contacts that need attention
const needsAttention = await fetch(
  '/v1/contacts?warmth_band=cool&warmth_band=cold&tags=customer',
  { headers: { 'Authorization': `Bearer ${jwt}` } }
).then(r => r.json());
```

### 3. Respect Overrides
```typescript
// Don't recompute contacts with manual overrides
if (!contact.warmth_override) {
  await fetch(`/v1/contacts/${contact.id}/warmth/recompute`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${jwt}` }
  });
}
```

---

## Next Steps

- [AI Analysis](./06-ai-analysis.md) - Get AI insights on relationship health
- [AI Suggestions](./08-ai-suggestions.md) - Get proactive engagement recommendations
- [Interactions](./03-interactions.md) - Log activities that affect warmth
