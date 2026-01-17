# Warmth Score Architecture & Frontend Integration Guide

**Complete guide to the multi-mode warmth scoring system, calculation methods, and bulk data fetching for frontend applications**

**Last Updated:** November 2, 2025 - Added multi-mode cadence system

---

## Table of Contents
1. [Current Architecture](#current-architecture)
2. [Warmth Modes (NEW)](#warmth-modes-new)
3. [Calculation Method (EWMA)](#calculation-method-ewma)
4. [API Endpoints](#api-endpoints)
5. [Bulk Warmth Fetching](#bulk-warmth-fetching)
6. [Frontend Integration Patterns](#frontend-integration-patterns)
7. [Centralized Warmth Management](#centralized-warmth-management)
8. [Best Practices](#best-practices)
9. [Migration Notes](#migration-notes)

---

## Current Architecture

### Overview

The warmth score system measures relationship health on a **0-100 scale** using an **EWMA (Exponentially Weighted Moving Average)** algorithm with **amplitude decay**.

**Key Components:**
- **Amplitude**: Internal metric that tracks interaction momentum (0-100)
- **Warmth Score**: User-facing score derived from amplitude + base score
- **Warmth Band**: Categorical label (hot, warm, neutral, cool, cold)
- **Time Decay**: Exponential decay with 30-day half-life

### Database Schema

```sql
-- contacts table
contacts (
  id uuid,
  amplitude real DEFAULT 0,                -- Internal EWMA amplitude
  warmth integer,                          -- User-facing score (0-100)
  warmth_band text,                        -- 'hot', 'warm', 'neutral', 'cool', 'cold'
  warmth_mode warmth_mode DEFAULT 'medium', -- NEW: Decay cadence mode
  warmth_score_cached integer,             -- NEW: Cached score for performance
  warmth_cached_at timestamptz,            -- NEW: Cache timestamp
  warmth_last_updated_at timestamptz,      -- Last recompute time
  last_interaction_at timestamptz          -- Most recent interaction
)

-- NEW: warmth_mode enum type
CREATE TYPE warmth_mode AS ENUM ('slow', 'medium', 'fast', 'test');

-- NEW: Mode change audit log
warmth_mode_changes (
  id uuid,
  contact_id uuid,
  user_id uuid,
  from_mode warmth_mode,
  to_mode warmth_mode,
  score_before integer,
  score_after integer,
  changed_at timestamptz
)
```

###  Score Bands

| Score | Band | Meaning |
|-------|------|---------|
| 80-100 | **hot** | Very active, frequent recent contact |
| 60-79 | **warm** | Healthy, regular contact |
| 40-59 | **neutral** | Moderate, some contact |
| 20-39 | **cool** | Infrequent contact, cooling down |
| 0-19 | **cold** | Very little contact, at risk |

---

## Warmth Modes (NEW)

### Overview

**NEW FEATURE:** Users can now select from **4 different warmth cadence modes** per contact, allowing personalized tracking based on relationship type.

### The 4 Modes

| Mode | Horizon | Half-Life | λ (decay/day) | Use Case |
|------|---------|-----------|---------------|----------|
| **Slow** 🐢 | ~30 days | 17.3 days | 0.040132 | Monthly check-ins, casual acquaintances |
| **Medium** 🚶 | ~14 days | 8.1 days | 0.085998 | Regular professional contacts (default) |
| **Fast** 🏃 | ~7 days | 4.0 days | 0.171996 | Close friends, active clients |
| **Test** ⚡ | ~2 hours | 18 minutes | 55.26 | Development/testing only (visible decay) |

**Horizon** = Days until score drops from 100 → 30 (needs attention)

### How Mode Switching Works ⚡ (Anchor Model)

When a user changes the warmth mode for a contact:

1. **Score Stays Same** ✅: Current score does NOT jump
2. **Re-Anchor**: System records current score as new "anchor point" at current time
3. **Future Decay Changes**: Going forward, decay follows new mode's λ (decay rate)
4. **C⁰ Continuity Preserved**: Smooth transition with no discontinuity

**Mathematical Model:**

```
Anchor-based decay: score(t) = Wmin + (anchor_score - Wmin) × e^{-λ (t - anchor_at)}

On mode switch:
1. Calculate current score with OLD mode
2. Set anchor_score = current score
3. Set anchor_at = now
4. Future calculations use NEW mode's λ
```

**Example:**

```text
Contact: John Doe
Last interaction: 10 days ago
Current Score: 65

Before (Medium mode):  Score = 65 ✨
Switch to Fast mode:   Score = 65 ✅ (NO JUMP!)

Future behavior:
- Score stays at 65 immediately after switch
- Then decays faster (fast mode λ = 0.172 vs medium λ = 0.086)
- Will reach 30 in ~5 days instead of ~10 days
```

**Why This Matters:**

❌ **OLD Behavior** (before Nov 2, 2025):
```
Switch medium → fast
Score 65 → 25 (JUMP! Confusing for users)
```

✅ **NEW Behavior** (after anchor model):
```
Switch medium → fast
Score 65 → 65 (smooth, only future decay changes)
```

### Mode Selection Best Practices

**Slow Mode** - Best for:

- Quarterly clients
- Casual networking contacts
- Annual check-ins
- Board members

**Medium Mode** - Best for:

- Regular colleagues
- Active clients
- Professional network
- Most contacts (default)

**Fast Mode** - Best for:

- VIP clients
- Close friends
- Hot prospects
- Daily collaborators

**Test Mode** - For:

- Development only
- Watching decay in real-time
- Demo purposes

---

## Calculation Method (EWMA)

### Algorithm: Exponentially Weighted Moving Average

The warmth score uses a sophisticated EWMA algorithm that:
- **Boosts** on interactions (weighted by channel type)
- **Decays** exponentially over time (30-day half-life)
- **Stabilizes** around realistic values

### Mathematical Formula

#### Constants (Mode-Specific)
```typescript
// Multi-mode decay constants
const LAMBDA_PER_DAY: Record<WarmthMode, number> = {
  slow: 0.040132,    // ~30 days to reach score 30
  medium: 0.085998,  // ~14 days to reach score 30 (default)
  fast: 0.171996,    // ~7 days to reach score 30
  test: 2.407946,    // ~12 hours to reach score 30
};

const BASE_SCORE = 30;  // Baseline score
```

#### Impulse Weights by Channel
```typescript
const IMPULSE_WEIGHTS = {
  email: 5,
  sms: 4,
  dm: 4,
  call: 7,
  meeting: 9,
  note: 3,
  other: 5
};
```

#### Amplitude Update (on interaction)
```typescript
// Get contact's warmth mode
const mode: WarmthMode = contact.warmth_mode || 'medium';
const lambda = LAMBDA_PER_DAY[mode];

// Calculate time since last update
const dtDays = (now - lastUpdated) / (1000 * 60 * 60 * 24);

// Apply exponential decay (mode-specific)
const decay = Math.exp(-lambda * dtDays);
const ampDecayed = prevAmp * decay;

// Add interaction impulse
const ampNext = Math.min(100, ampDecayed + impulseFor(kind));
```

#### Warmth Score Calculation
```typescript
// Apply decay to amplitude
const ampNow = amplitude * Math.exp(-LAMBDA_PER_DAY * daysSinceUpdate);

// Calculate final score
const score = Math.max(0, Math.min(100, BASE_SCORE + ampNow));

// Determine band
const band = 
  score >= 80 ? 'hot' :
  score >= 60 ? 'warm' :
  score >= 40 ? 'neutral' :
  score >= 20 ? 'cool' : 'cold';
```

### Decay Timeline

| Days Since Interaction | Amplitude Remaining | Warmth Score Impact |
|------------------------|---------------------|---------------------|
| 0 (immediate) | 100% | Full boost |
| 7 days | 85% | -15% decay |
| 14 days | 72% | -28% decay |
| 30 days | 50% | -50% decay (half-life) |
| 60 days | 25% | -75% decay |
| 90 days | 13% | -87% decay |

---

## API Endpoints

### 1. **Recompute Single Contact** ⚡
```http
POST /api/v1/contacts/:id/warmth/recompute
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "contact": {
    "id": "uuid",
    "warmth": 75,
    "warmth_band": "warm"
  },
  "warmth_score": 75
}
```

**Use Case:** Recompute after adding interaction, or on-demand refresh

---

### 2. **Bulk Recompute** 📦
```http
POST /api/v1/warmth/recompute
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "contact_ids": ["uuid1", "uuid2", "..."]
}
```

**Limits:**
- Max 200 contacts per request
- Deduplicates array automatically

**Response:**
```json
{
  "results": [
    { "id": "uuid1", "warmth": 75 },
    { "id": "uuid2", "warmth": 82 },
    { "id": "uuid3", "error": "not_found" }
  ]
}
```

**Use Case:** Refresh multiple contacts at once (e.g., on list page load)

---

### 3. **Warmth Summary** 📊
```http
GET /api/v1/warmth/summary
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "total_contacts": 150,
  "by_band": {
    "hot": 25,
    "warm": 60,
    "cooling": 40,
    "cold": 25
  },
  "average_score": 58.4,
  "contacts_needing_attention": 65,
  "last_updated_at": "2025-11-02T12:00:00Z"
}
```

**Rate Limit:** 60 requests/minute

**Use Case:** Dashboard overview, analytics widgets

---

### 4. **Get Available Warmth Modes** 🆕
```http
GET /api/v1/warmth/modes
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "modes": [
    {
      "mode": "slow",
      "lambda": 0.040132,
      "halfLifeDays": 17.3,
      "daysToReachout": 29.9,
      "description": "~30 days between touches"
    },
    {
      "mode": "medium",
      "lambda": 0.085998,
      "halfLifeDays": 8.1,
      "daysToReachout": 13.9,
      "description": "~14 days between touches"
    },
    {
      "mode": "fast",
      "lambda": 0.171996,
      "halfLifeDays": 4.0,
      "daysToReachout": 7.0,
      "description": "~7 days between touches"
    },
    {
      "mode": "test",
      "lambda": 2.407946,
      "halfLifeDays": 0.7,
      "daysToReachout": 0.5,
      "description": "~12 hours (testing only)"
    }
  ],
  "default": "medium"
}
```

**Use Case:** Get mode metadata for UI selector, show user what each mode means

---

### 5. **Get Contact's Warmth Mode** 🆕
```http
GET /api/v1/contacts/:id/warmth/mode
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "contact_id": "uuid",
  "current_mode": "medium",
  "current_score": 65,
  "current_band": "warm",
  "last_interaction_at": "2025-10-20T10:00:00Z"
}
```

**Use Case:** Display current mode in contact detail, fetch before showing mode selector

---

### 6. **Switch Warmth Mode** ⭐ 🆕
```http
PATCH /api/v1/contacts/:id/warmth/mode
Authorization: Bearer {JWT_TOKEN}
Content-Type: application/json

{
  "mode": "fast"
}
```

**Response:**
```json
{
  "contact_id": "uuid",
  "mode_before": "medium",
  "mode_after": "fast",
  "score_before": 65,
  "score_after": 25,
  "band_after": "cool",
  "changed_at": "2025-11-02T14:00:00Z"
}
```

**Important:** Score recalculates instantly based on new mode!

**Use Case:** User changes cadence for a contact, update tracking preferences

---

### 7. **Get Contacts with Warmth** 🔍
```http
GET /api/v1/contacts?include_warmth=true
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "contacts": [
    {
      "id": "uuid",
      "display_name": "John Doe",
      "warmth": 75,
      "warmth_band": "warm",
      "last_interaction_at": "2025-10-15T10:00:00Z"
    }
  ],
  "total": 150,
  "page": 1
}
```

**Use Case:** Fetch contacts with warmth already included (no separate call needed)

---

### 8. **Warmth History** 📈
```http
GET /api/v1/contacts/:id/warmth/history?days=30
Authorization: Bearer {JWT_TOKEN}
```

**Response:**
```json
{
  "contact_id": "uuid",
  "history": [
    {
      "warmth": 82,
      "warmth_band": "hot",
      "recorded_at": "2025-11-02T12:00:00Z"
    },
    {
      "warmth": 75,
      "warmth_band": "warm",
      "recorded_at": "2025-10-25T12:00:00Z"
    }
  ]
}
```

**Use Case:** Show warmth trend over time, charts

---

## Bulk Warmth Fetching

### Pattern 1: Fetch Contacts with Warmth Included

**Best for:** List pages, dashboards

```typescript
// Single request, warmth included
const response = await fetch(
  `${API_BASE}/v1/contacts?limit=50&include_warmth=true`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
);

const { contacts } = await response.json();

// Warmth is already on each contact
contacts.forEach(contact => {
  console.log(`${contact.display_name}: ${contact.warmth} (${contact.warmth_band})`);
});
```

**Pros:**
- ✅ Single request
- ✅ Warmth always fresh
- ✅ No extra recompute needed

**Cons:**
- ⚠️ Slightly slower than without warmth

---

### Pattern 2: Bulk Recompute After Fetch

**Best for:** When you need guaranteed fresh scores

```typescript
// 1. Fetch contacts
const { contacts } = await fetch(
  `${API_BASE}/v1/contacts?limit=200`
).then(r => r.json());

// 2. Extract IDs
const contactIds = contacts.map(c => c.id);

// 3. Bulk recompute (if needed)
const { results } = await fetch(
  `${API_BASE}/v1/warmth/recompute`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ contact_ids: contactIds })
  }
).then(r => r.json());

// 4. Merge warmth scores back into contacts
const warmthMap = Object.fromEntries(
  results.map(r => [r.id, r.warmth])
);

const contactsWithWarmth = contacts.map(c => ({
  ...c,
  warmth: warmthMap[c.id] || c.warmth
}));
```

**Pros:**
- ✅ Guaranteed fresh scores
- ✅ Control over when to refresh

**Cons:**
- ⚠️ Two requests
- ⚠️ More complex code

---

### Pattern 3: Dashboard Summary

**Best for:** Overview widgets, analytics

```typescript
// Get high-level stats
const summary = await fetch(
  `${API_BASE}/v1/warmth/summary`,
  {
    headers: { Authorization: `Bearer ${token}` }
  }
).then(r => r.json());

// Use summary for charts
console.log(`Average warmth: ${summary.average_score}`);
console.log(`Hot contacts: ${summary.by_band.hot}`);
console.log(`Needing attention: ${summary.contacts_needing_attention}`);
```

**Pros:**
- ✅ Single lightweight request
- ✅ Perfect for dashboards
- ✅ No individual contact processing

**Cons:**
- ⚠️ No individual contact scores

---

## Frontend Integration Patterns

### Centralized Warmth Manager

Create a central service to manage warmth scores across your app:

```typescript
// lib/warmth-manager.ts
export class WarmthManager {
  private cache: Map<string, WarmthScore> = new Map();
  private baseUrl: string;
  private token: string;

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  // Fetch warmth for single contact
  async getWarmth(contactId: string): Promise<WarmthScore> {
    // Check cache first
    if (this.cache.has(contactId)) {
      const cached = this.cache.get(contactId)!;
      // Return if fresh (< 5 minutes old)
      if (Date.now() - cached.fetchedAt < 5 * 60 * 1000) {
        return cached;
      }
    }

    // Fetch fresh
    const response = await fetch(
      `${this.baseUrl}/v1/contacts/${contactId}/warmth/recompute`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );

    const { warmth_score, contact } = await response.json();
    const score: WarmthScore = {
      score: warmth_score,
      band: contact.warmth_band,
      fetchedAt: Date.now()
    };

    this.cache.set(contactId, score);
    return score;
  }

  // Bulk fetch warmth for multiple contacts
  async getBulkWarmth(contactIds: string[]): Promise<Map<string, WarmthScore>> {
    // Filter out cached contacts (fresh < 5 min)
    const now = Date.now();
    const needFetch = contactIds.filter(id => {
      const cached = this.cache.get(id);
      return !cached || (now - cached.fetchedAt > 5 * 60 * 1000);
    });

    if (needFetch.length === 0) {
      // All cached
      return new Map(contactIds.map(id => [id, this.cache.get(id)!]));
    }

    // Batch fetch (max 200 at a time)
    const results = new Map<string, WarmthScore>();
    
    for (let i = 0; i < needFetch.length; i += 200) {
      const batch = needFetch.slice(i, i + 200);
      
      const response = await fetch(
        `${this.baseUrl}/v1/warmth/recompute`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ contact_ids: batch })
        }
      );

      const { results: batchResults } = await response.json();
      
      batchResults.forEach((r: any) => {
        if (!r.error) {
          const score: WarmthScore = {
            score: r.warmth,
            band: r.warmth >= 80 ? 'hot' :
                  r.warmth >= 60 ? 'warm' :
                  r.warmth >= 40 ? 'neutral' :
                  r.warmth >= 20 ? 'cool' : 'cold',
            fetchedAt: now
          };
          this.cache.set(r.id, score);
          results.set(r.id, score);
        }
      });
    }

    // Return all (fresh + cached)
    return new Map(
      contactIds.map(id => [
        id,
        results.get(id) || this.cache.get(id)!
      ])
    );
  }

  // Get summary stats
  async getSummary(): Promise<WarmthSummary> {
    const response = await fetch(
      `${this.baseUrl}/v1/warmth/summary`,
      {
        headers: { Authorization: `Bearer ${this.token}` }
      }
    );

    return response.json();
  }

  // Clear cache (e.g., on logout)
  clearCache() {
    this.cache.clear();
  }
}

// Types
interface WarmthScore {
  score: number;
  band: 'hot' | 'warm' | 'neutral' | 'cool' | 'cold';
  fetchedAt: number;
}

interface WarmthSummary {
  total_contacts: number;
  by_band: {
    hot: number;
    warm: number;
    cooling: number;
    cold: number;
  };
  average_score: number;
  contacts_needing_attention: number;
}
```

---

### React Hook Example

```typescript
// hooks/useWarmth.ts
import { useEffect, useState } from 'react';
import { warmthManager } from '@/lib/warmth-manager';

export function useWarmth(contactId: string) {
  const [warmth, setWarmth] = useState<WarmthScore | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    warmthManager.getWarmth(contactId).then(score => {
      if (mounted) {
        setWarmth(score);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [contactId]);

  return { warmth, loading };
}

// hooks/useBulkWarmth.ts
export function useBulkWarmth(contactIds: string[]) {
  const [warmthMap, setWarmthMap] = useState<Map<string, WarmthScore>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    warmthManager.getBulkWarmth(contactIds).then(map => {
      if (mounted) {
        setWarmthMap(map);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, [contactIds.join(',')]);

  return { warmthMap, loading };
}

// hooks/useWarmthSummary.ts
export function useWarmthSummary() {
  const [summary, setSummary] = useState<WarmthSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    warmthManager.getSummary().then(data => {
      if (mounted) {
        setSummary(data);
        setLoading(false);
      }
    });

    return () => { mounted = false; };
  }, []);

  return { summary, loading };
}
```

---

### Usage Examples

#### Example 1: Contact List Page
```typescript
// pages/contacts.tsx
import { useBulkWarmth } from '@/hooks/useWarmth';

function ContactListPage({ contacts }: { contacts: Contact[] }) {
  const contactIds = contacts.map(c => c.id);
  const { warmthMap, loading } = useBulkWarmth(contactIds);

  return (
    <div>
      {contacts.map(contact => {
        const warmth = warmthMap.get(contact.id);
        return (
          <ContactCard
            key={contact.id}
            contact={contact}
            warmth={warmth?.score}
            warmthBand={warmth?.band}
          />
        );
      })}
    </div>
  );
}
```

#### Example 2: Dashboard Widget
```typescript
// components/WarmthSummaryWidget.tsx
import { useWarmthSummary } from '@/hooks/useWarmth';

function WarmthSummaryWidget() {
  const { summary, loading } = useWarmthSummary();

  if (loading) return <Spinner />;

  return (
    <div className="stats-widget">
      <h2>Relationship Health</h2>
      <div className="average-score">
        Average: {summary?.average_score}
      </div>
      <div className="bands">
        <div className="hot">Hot: {summary?.by_band.hot}</div>
        <div className="warm">Warm: {summary?.by_band.warm}</div>
        <div className="cooling">Cooling: {summary?.by_band.cooling}</div>
        <div className="cold">Cold: {summary?.by_band.cold}</div>
      </div>
      <div className="alert">
        ⚠️ {summary?.contacts_needing_attention} contacts need attention
      </div>
    </div>
  );
}
```

#### Example 3: Single Contact Page
```typescript
// pages/contact/[id].tsx
import { useWarmth } from '@/hooks/useWarmth';

function ContactDetailPage({ contactId }: { contactId: string }) {
  const { warmth, loading } = useWarmth(contactId);

  return (
    <div>
      <h1>Contact Details</h1>
      {loading ? (
        <div>Loading warmth...</div>
      ) : (
        <WarmthBadge 
          score={warmth?.score} 
          band={warmth?.band} 
        />
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. **Cache Warmth Scores**
- ✅ Cache for 5 minutes to reduce API calls
- ✅ Invalidate cache after adding interactions
- ✅ Use centralized manager for consistent caching

### 2. **Batch Fetches**
- ✅ Use bulk endpoint for lists (max 200 contacts)
- ✅ Prefetch warmth for visible contacts
- ✅ Debounce recompute requests

### 3. **Recompute Strategy**
- ✅ **Automatic:** After interaction added/deleted
- ✅ **Manual:** User clicks "refresh" button
- ✅ **Background:** Cron job daily for all contacts

### 4. **UI/UX**
- ✅ Show warmth badge on contact cards
- ✅ Use color coding (red/yellow/green)
- ✅ Display trend arrows (↑ increasing, ↓ decreasing)
- ✅ Show "last updated" timestamp

### 5. **Performance**
- ✅ Include warmth in initial contact fetch
- ✅ Only recompute when needed (not on every page load)
- ✅ Use summary endpoint for dashboards (not individual scores)

---

## Migration Notes

### Old System (Pre-EWMA)

The previous system used a simpler formula:
- **Base:** 30 points
- **Recency:** 0-35 points (based on days since last contact)
- **Frequency:** 0-25 points (interaction count in 90 days)
- **Diversity:** 0-10 points (distinct channels)
- **Decay:** -30 points (after 7 days)

### New System (EWMA)

The current system uses EWMA with amplitude:
- **Amplitude:** Tracks interaction momentum with exponential decay
- **Impulse:** Each interaction adds weighted boost
- **Decay:** Continuous exponential decay (30-day half-life)
- **Score:** Base + decayed amplitude

### Key Differences

| Aspect | Old System | New System |
|--------|-----------|------------|
| **Decay** | Step function (after 7 days) | Continuous exponential |
| **Interaction boost** | Fixed frequency count | Weighted by channel type |
| **Calculation** | Recalculated from scratch | Updates existing amplitude |
| **Smoothness** | Jumpy, discrete changes | Smooth, continuous changes |
| **Realism** | Artificial thresholds | Natural decay curve |

### Why EWMA is Better

✅ **More realistic** - Mimics how relationships actually fade  
✅ **Smoother** - No sudden jumps or cliff edges  
✅ **Weighted** - Important interactions (meetings) count more  
✅ **Efficient** - Updates amplitude, doesn't recalculate everything  
✅ **Predictable** - Clear half-life decay model  

### Multi-Mode Update (November 2025)

**NEW:** The system now supports 4 different warmth cadence modes:

- **`warmth_mode` column** added to contacts table (default: `medium`)
- **Mode-specific decay** - Each mode has its own λ constant
- **Instant recalculation** - Score updates immediately when mode changes
- **Audit tracking** - Mode changes logged in `warmth_mode_changes` table

**Benefits:**
- ✅ Personalized tracking per contact
- ✅ VIP clients can be set to fast mode (7-day horizon)
- ✅ Casual contacts can be set to slow mode (30-day horizon)
- ✅ Test mode for development/demos (12-hour visible decay)

**Migration:** All existing contacts default to `medium` mode. No action required.

---

## Frontend Implementation (Anchor Model Update)

### API Contract - No Breaking Changes ✅

The mode switching endpoint response structure is **unchanged**:

```typescript
PATCH /v1/contacts/:id/warmth/mode

// Response
{
  "contact_id": "uuid",
  "mode_before": "medium",
  "mode_after": "fast",
  "score_before": 65,
  "score_after": 65,  // ← Now stays same instead of jumping!
  "band_after": "warm",
  "changed_at": "2025-11-02T...",
  "message": "Mode changed to fast. Score unchanged: 65. Future decay rate adjusted."
}
```

### Required Frontend Changes

#### 1. Update Toast/Notification Message ⚠️ **Critical**

```typescript
// ❌ OLD: Confusing when score changes
const onModeSwitch = async (newMode) => {
  const result = await switchMode(contactId, newMode);
  
  showToast({
    title: "Mode changed",
    message: `Warmth cadence updated to ${newMode}`,
  });
};

// ✅ NEW: Clear explanation of behavior
const onModeSwitch = async (newMode) => {
  const result = await switchMode(contactId, newMode);
  
  showToast({
    title: `Cadence: ${capitalize(newMode)}`,
    message: result.message, // Use backend message
    // Or custom:
    message: `Score stays at ${result.score_after}. Future decay adjusted.`,
  });
};
```

#### 2. Update Mode Selector Component

Add explanatory text to prevent user confusion:

```typescript
// components/WarmthModeSelector.tsx

<View style={styles.modeSelector}>
  <Text style={styles.title}>Warmth Cadence</Text>
  
  {/* ✅ ADD THIS */}
  <Text style={styles.explanation}>
    Changing the cadence adjusts how quickly warmth decays. 
    Current score stays the same, only future decay rate changes.
  </Text>
  
  <RadioGroup value={mode} onChange={handleModeChange}>
    <Radio value="slow">Slow (~30 days)</Radio>
    <Radio value="medium">Medium (~14 days)</Radio>
    <Radio value="fast">Fast (~7 days)</Radio>
  </RadioGroup>
</View>
```

#### 3. Update Help/Documentation Text

```typescript
const HELP_TEXT = {
  slow: "Score decays slowly (~30 days). Perfect for monthly contacts.",
  medium: "Balanced decay (~14 days). Good for regular contacts.",
  fast: "Quick decay (~7 days). Best for close friends and VIPs.",
  
  // ✅ ADD THIS
  note: "💡 Changing cadence won't jump your score. It only affects future decay speed."
};
```

#### 4. Update Confirmation Dialog (If Any)

```typescript
// ❌ OLD: Misleading
Alert.alert(
  "Change Warmth Mode?",
  "This will recalculate the warmth score.",
  [...]
);

// ✅ NEW: Accurate
Alert.alert(
  "Change Warmth Cadence?",
  "Score will stay the same. Only future decay rate changes.",
  [
    { text: "Cancel", style: "cancel" },
    { text: "Change", onPress: () => switchMode(newMode) }
  ]
);
```

### Optional Enhancements

#### Decay Curve Visualization

Show before/after comparison to make the behavior clear:

```typescript
<View style={styles.comparison}>
  <Text style={styles.label}>Before (Medium):</Text>
  <DecayCurve mode="medium" currentScore={65} />
  
  <Text style={styles.label}>After (Fast):</Text>
  <DecayCurve mode="fast" currentScore={65} />
  
  <Text style={styles.note}>
    ✓ Score stays at {currentScore}
    ✓ Future decay is {newMode === 'fast' ? 'faster' : 'slower'}
  </Text>
</View>
```

### Testing Checklist

Frontend developers should verify:

- [ ] Mode switch → Toast shows "Score unchanged" message
- [ ] Mode switch → Score value doesn't jump in UI
- [ ] Mode switch → Next due date adjusts correctly
- [ ] Help modal explains no-jump behavior
- [ ] Error handling still works
- [ ] Cache invalidation triggers refresh

### What Doesn't Need Changes

✅ API call structure (same endpoints)  
✅ Data fetching hooks  
✅ Score display components  
✅ Cache invalidation logic  

### Quick Win

**Minimal change for maximum clarity:**

```typescript
// Update just the success message
toast.success(
  `Cadence: ${newMode}. Score stays at ${score}. Future decay adjusted.`
);
```

This single line prevents user confusion! 🎉

---

## Related Documentation

- [Warmth Modes Frontend Guide](./WARMTH_MODES_FRONTEND_GUIDE.md) ⭐ **NEW**
- [Warmth History Endpoint](./WARMTH_HISTORY_ENDPOINT.md)
- [API Examples](./API_EXAMPLES.md)
- [Frontend API Guide](./FRONTEND_API_GUIDE.md)

---

**Last Updated:** November 2, 2025 - Added multi-mode cadence system  
**Status:** Production (EWMA system with multi-mode support)
