# Accurate Warmth Scores Across Entire App

**Goal**: Provide consistent, precise warmth scores for all contacts across every screen (list, detail, context) in the app.

**Status**: Planning  
**Priority**: High  
**Estimated Effort**: 2-3 days

---

## Problem Statement

Currently, warmth scores may be:
- Inconsistent across different API endpoints
- Stale (cached values not refreshed)
- Computed differently in different places
- Missing from some endpoints (e.g., contact list)

**We need**: One source of truth, real-time accuracy, and consistent fields everywhere.

---

## Solution Architecture

### Single Source of Truth

All warmth calculations use one helper function:

```typescript
// lib/warmth-ewma.ts
export function warmthScoreFromAnchor(
  anchorScore: number,
  anchorAt: string | Date,
  mode: WarmthMode
): number {
  const now = Date.now();
  const anchorTime = new Date(anchorAt).getTime();
  const daysSince = (now - anchorTime) / DAY_MS;
  const lambda = LAMBDA_PER_DAY[mode];
  
  return WMIN + (anchorScore - WMIN) * Math.exp(-lambda * daysSince);
}
```

### Consistent Response Shape

Every endpoint returns the same warmth fields:

```typescript
interface ContactWithWarmth {
  id: string;
  display_name: string;
  // ... other fields
  
  // Warmth fields (always present)
  warmth_score_current: number;      // Real-time calculated (float)
  warmth_band: WarmthBand;           // hot/warm/neutral/cool/cold
  warmth_mode: WarmthMode;           // slow/medium/fast
  warmth_anchor_score: number;       // Anchor value
  warmth_anchor_at: string;          // Anchor timestamp
  
  // Optional cache hints
  warmth_score_cached?: number;      // Last cached value
  warmth_cached_at?: string;         // Cache timestamp
}
```

---

## Backend Implementation

### Phase 1: Core Helper & Transformer

**File**: `lib/warmth-helpers.ts`

```typescript
import { warmthScoreFromAnchor, getWarmthBand } from './warmth-ewma';

export function withCurrentWarmth(contact: any) {
  const warmthScoreCurrent = warmthScoreFromAnchor(
    contact.warmth_anchor_score || contact.warmth || 50,
    contact.warmth_anchor_at || new Date().toISOString(),
    contact.warmth_mode || 'medium'
  );

  return {
    ...contact,
    warmth_score_current: warmthScoreCurrent,
    warmth_band: getWarmthBand(warmthScoreCurrent),
  };
}
```

### Phase 2: Update Existing Endpoints

#### 1. GET `/api/v1/contacts/:id`

```typescript
// app/api/v1/contacts/[id]/route.ts
import { withCurrentWarmth } from '@/lib/warmth-helpers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const supabase = getClientOrThrow(req);
  
  const { data: contact, error } = await supabase
    .from('contacts')
    .select('*, warmth_anchor_score, warmth_anchor_at, warmth_mode, warmth_cached_at')
    .eq('id', params.id)
    .single();

  if (error) return serverError(error.message, req);
  if (!contact) return notFound('Contact not found', req);

  // Add computed warmth fields
  const enriched = withCurrentWarmth(contact);

  return ok(enriched, req);
}
```

#### 2. GET `/api/v1/contacts/:id/context-bundle`

```typescript
// app/api/v1/contacts/[id]/context-bundle/route.ts
import { withCurrentWarmth } from '@/lib/warmth-helpers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  // ... existing code to fetch contact and interactions

  // Enrich contact with current warmth
  const enrichedContact = withCurrentWarmth(contact);

  return ok({
    contact: enrichedContact,
    interactions: recentInteractions,
    // ... rest of bundle
  }, req);
}
```

#### 3. NEW: GET `/api/v1/contacts` (List with Warmth)

```typescript
// app/api/v1/contacts/route.ts
import { withCurrentWarmth } from '@/lib/warmth-helpers';

export async function GET(req: Request) {
  const user = await getUser(req);
  if (!user) return unauthorized('Unauthorized', req);

  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100);
  const sortBy = url.searchParams.get('sort') || 'created_at:desc';
  const bandFilter = url.searchParams.get('band')?.split(','); // ['hot', 'warm']

  const supabase = getClientOrThrow(req);
  
  let query = supabase
    .from('contacts')
    .select('*, warmth_anchor_score, warmth_anchor_at, warmth_mode, warmth_cached_at', { count: 'exact' })
    .eq('user_id', user.id)
    .range((page - 1) * limit, page * limit - 1);

  // Apply sorting (if by warmth, we'll sort in-memory after computing)
  if (!sortBy.startsWith('warmth_score_current')) {
    const [field, direction] = sortBy.split(':');
    query = query.order(field, { ascending: direction === 'asc' });
  }

  const { data: contacts, error, count } = await query;

  if (error) return serverError(error.message, req);

  // Enrich all contacts with current warmth
  let enriched = contacts.map(withCurrentWarmth);

  // Filter by band if requested
  if (bandFilter && bandFilter.length > 0) {
    enriched = enriched.filter(c => bandFilter.includes(c.warmth_band));
  }

  // Sort by warmth if requested
  if (sortBy.startsWith('warmth_score_current')) {
    const direction = sortBy.split(':')[1];
    enriched.sort((a, b) => {
      const diff = a.warmth_score_current - b.warmth_score_current;
      return direction === 'asc' ? diff : -diff;
    });
  }

  return ok({
    contacts: enriched,
    pagination: {
      page,
      limit,
      total: count || 0,
      pages: Math.ceil((count || 0) / limit),
    },
  }, req);
}
```

### Phase 3: Automatic Recompute & Caching

#### Trigger on Interactions

```typescript
// app/api/v1/interactions/route.ts
export async function POST(req: Request) {
  // ... create interaction

  // Update warmth cache
  const currentWarmth = warmthScoreFromAnchor(
    contact.warmth_anchor_score,
    contact.warmth_anchor_at,
    contact.warmth_mode
  );

  await supabase
    .from('contacts')
    .update({
      warmth_score_cached: Math.round(currentWarmth),
      warmth_cached_at: new Date().toISOString(),
    })
    .eq('id', contact_id);

  return ok(interaction, req);
}
```

#### Trigger on Mode Change

```typescript
// app/api/v1/contacts/[id]/warmth/mode/route.ts
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  // ... apply mode switch

  // Update cache
  await supabase
    .from('contacts')
    .update({
      warmth_score_cached: Math.round(updated.warmth),
      warmth_cached_at: new Date().toISOString(),
    })
    .eq('id', params.id);

  return ok(result, req);
}
```

#### Nightly Cron Recompute

```typescript
// app/api/cron/recompute-warmth/route.ts
export async function GET(req: Request) {
  // Verify cron secret
  if (req.headers.get('Authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get contacts with stale cache (> 6 hours old)
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  
  const { data: staleContacts } = await supabase
    .from('contacts')
    .select('id, warmth_anchor_score, warmth_anchor_at, warmth_mode')
    .or(`warmth_cached_at.is.null,warmth_cached_at.lt.${sixHoursAgo}`)
    .limit(1000); // Process in batches

  if (!staleContacts || staleContacts.length === 0) {
    return new Response(JSON.stringify({ updated: 0 }), { status: 200 });
  }

  // Recompute and update
  const updates = staleContacts.map(contact => {
    const currentWarmth = warmthScoreFromAnchor(
      contact.warmth_anchor_score,
      contact.warmth_anchor_at,
      contact.warmth_mode
    );

    return {
      id: contact.id,
      warmth_score_cached: Math.round(currentWarmth),
      warmth_cached_at: new Date().toISOString(),
    };
  });

  // Batch update
  for (const update of updates) {
    await supabase
      .from('contacts')
      .update({
        warmth_score_cached: update.warmth_score_cached,
        warmth_cached_at: update.warmth_cached_at,
      })
      .eq('id', update.id);
  }

  return new Response(JSON.stringify({ updated: updates.length }), { status: 200 });
}
```

**Add to vercel.json**:

```json
{
  "crons": [
    {
      "path": "/api/cron/recompute-warmth",
      "schedule": "0 2 * * *"
    }
  ]
}
```

### Phase 4: Backfill Migration

```sql
-- migrations/backfill-warmth-anchors.sql

-- Set default anchors for contacts missing them
UPDATE contacts
SET 
  warmth_anchor_score = COALESCE(warmth, 50),
  warmth_anchor_at = COALESCE(last_touch_at, created_at, NOW()),
  warmth_mode = COALESCE(warmth_mode, 'medium'),
  warmth_cached_at = NOW()
WHERE 
  warmth_anchor_score IS NULL 
  OR warmth_anchor_at IS NULL;

-- Create index for cron queries
CREATE INDEX IF NOT EXISTS idx_contacts_warmth_cached_at 
ON contacts(warmth_cached_at) 
WHERE warmth_cached_at IS NOT NULL;
```

---

## Frontend Implementation

### Phase 1: API Client & Hooks

**File**: `lib/api/client.ts`

```typescript
import { supabase } from './supabase';

export async function apiFetch(path: string, init: RequestInit = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const API_URL = process.env.API_URL ?? 'https://ever-reach-be.vercel.app';
  
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
    },
  });

  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw Object.assign(
      new Error(problem?.title || 'Request failed'), 
      { status: res.status, problem }
    );
  }

  return res.json();
}
```

**File**: `lib/api/hooks.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from './client';

// Single contact
export function useContact(id: string) {
  return useQuery({
    queryKey: ['contact', id],
    queryFn: () => apiFetch(`/api/v1/contacts/${id}`),
    staleTime: 30_000, // 30 seconds
  });
}

// Contact list
export function useContactsList(params?: { 
  page?: number; 
  limit?: number; 
  sort?: string;
  band?: string[];
}) {
  const queryString = new URLSearchParams({
    page: String(params?.page || 1),
    limit: String(params?.limit || 50),
    ...(params?.sort && { sort: params.sort }),
    ...(params?.band && { band: params.band.join(',') }),
  }).toString();

  return useQuery({
    queryKey: ['contacts', params],
    queryFn: () => apiFetch(`/api/v1/contacts?${queryString}`),
    staleTime: 30_000,
  });
}

// Context bundle
export function useContactContext(id: string) {
  return useQuery({
    queryKey: ['contact-context', id],
    queryFn: () => apiFetch(`/api/v1/contacts/${id}/context-bundle`),
    staleTime: 30_000,
  });
}

// Set warmth mode
export function useSetWarmthMode(id: string) {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (mode: 'slow' | 'medium' | 'fast') =>
      apiFetch(`/api/v1/contacts/${id}/warmth/mode`, {
        method: 'PATCH',
        body: JSON.stringify({ mode }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', id] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-context', id] });
    },
  });
}

// Create interaction
export function useCreateInteraction() {
  const qc = useQueryClient();
  
  return useMutation({
    mutationFn: (payload: {
      contact_id: string;
      channel?: string;
      direction?: 'inbound' | 'outbound';
      summary?: string;
    }) =>
      apiFetch(`/api/v1/interactions`, {
        method: 'POST',
        body: JSON.stringify({
          occurred_at: new Date().toISOString(),
          direction: 'outbound',
          channel: 'email',
          ...payload,
        }),
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['contact', vars.contact_id] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
      qc.invalidateQueries({ queryKey: ['contact-context', vars.contact_id] });
    },
  });
}
```

### Phase 2: UI Components

**File**: `components/WarmthBadge.tsx`

```tsx
interface WarmthBadgeProps {
  score: number;
  band: string;
  anchorAt?: string;
}

export function WarmthBadge({ score, band, anchorAt }: WarmthBadgeProps) {
  const bandColors = {
    hot: 'bg-red-500',
    warm: 'bg-orange-500',
    neutral: 'bg-yellow-500',
    cool: 'bg-blue-500',
    cold: 'bg-gray-500',
  };

  const anchorAge = anchorAt 
    ? Math.floor((Date.now() - new Date(anchorAt).getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="flex items-center gap-2">
      <div className={`px-3 py-1 rounded-full ${bandColors[band]} text-white text-sm font-medium`}>
        {Math.round(score)} • {band}
      </div>
      {anchorAge !== null && (
        <span className="text-xs text-gray-500">
          Updated {anchorAge}d ago
        </span>
      )}
    </div>
  );
}
```

**File**: `components/WarmthModeSelector.tsx`

```tsx
export function WarmthModeSelector({ 
  contactId, 
  value 
}: { 
  contactId: string; 
  value: 'slow' | 'medium' | 'fast';
}) {
  const setMode = useSetWarmthMode(contactId);

  return (
    <select
      value={value}
      disabled={setMode.isLoading}
      onChange={(e) => setMode.mutate(e.target.value as any)}
      className="border rounded px-3 py-2"
    >
      <option value="slow">Slow Decay</option>
      <option value="medium">Medium Decay</option>
      <option value="fast">Fast Decay</option>
    </select>
  );
}
```

### Phase 3: Update Screens

**File**: `screens/ContactListScreen.tsx`

```tsx
export function ContactListScreen() {
  const [sortBy, setSortBy] = useState('warmth_score_current:desc');
  const [bandFilter, setBandFilter] = useState<string[]>([]);

  const { data, isLoading } = useContactsList({
    sort: sortBy,
    band: bandFilter.length > 0 ? bandFilter : undefined,
  });

  return (
    <View>
      {/* Filters */}
      <View className="flex-row gap-2 p-4">
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="warmth_score_current:desc">Warmth (High to Low)</option>
          <option value="warmth_score_current:asc">Warmth (Low to High)</option>
          <option value="created_at:desc">Recently Added</option>
        </select>

        {/* Band filter chips */}
        {['hot', 'warm', 'neutral', 'cool', 'cold'].map(band => (
          <button
            key={band}
            onClick={() => {
              setBandFilter(prev =>
                prev.includes(band) ? prev.filter(b => b !== band) : [...prev, band]
              );
            }}
            className={bandFilter.includes(band) ? 'bg-blue-500 text-white' : 'bg-gray-200'}
          >
            {band}
          </button>
        ))}
      </View>

      {/* Contact list */}
      {isLoading ? (
        <Text>Loading...</Text>
      ) : (
        data?.contacts.map(contact => (
          <ContactListItem key={contact.id} contact={contact} />
        ))
      )}
    </View>
  );
}

function ContactListItem({ contact }) {
  return (
    <View className="p-4 border-b">
      <Text className="font-bold">{contact.display_name}</Text>
      <WarmthBadge 
        score={contact.warmth_score_current}
        band={contact.warmth_band}
        anchorAt={contact.warmth_anchor_at}
      />
    </View>
  );
}
```

**File**: `screens/ContactDetailScreen.tsx`

```tsx
export function ContactDetailScreen({ contactId }: { contactId: string }) {
  const { data: contact, isLoading } = useContact(contactId);
  const createInteraction = useCreateInteraction();

  const handleMessageSent = () => {
    createInteraction.mutate({
      contact_id: contactId,
      channel: 'email',
      direction: 'outbound',
      summary: 'Email sent from app',
    });
  };

  if (isLoading) return <Text>Loading...</Text>;

  return (
    <View className="p-4">
      <Text className="text-2xl font-bold">{contact.display_name}</Text>

      {/* Warmth section */}
      <View className="mt-4">
        <Text className="text-sm text-gray-600 mb-2">Relationship Warmth</Text>
        <WarmthBadge 
          score={contact.warmth_score_current}
          band={contact.warmth_band}
          anchorAt={contact.warmth_anchor_at}
        />
        <WarmthModeSelector 
          contactId={contactId}
          value={contact.warmth_mode}
        />
      </View>

      {/* Actions */}
      <button
        onClick={handleMessageSent}
        disabled={createInteraction.isLoading}
        className="mt-4 bg-blue-500 text-white px-4 py-2 rounded"
      >
        Mark Message as Sent
      </button>
    </View>
  );
}
```

---

## Testing & Validation

### API Parity Test

**File**: `test-warmth-api-parity.mjs`

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BACKEND_URL = process.env.BACKEND_URL || 'https://ever-reach-be.vercel.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testWarmthParity() {
  console.log('🧪 Testing Warmth Score Parity Across Endpoints\n');

  // Get auth token
  const { data: { session } } = await supabase.auth.signInWithPassword({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });

  const token = session.access_token;

  // Get random sample of contacts
  const { data: contacts } = await supabase
    .from('contacts')
    .select('id')
    .limit(10);

  let passed = 0;
  let failed = 0;

  for (const { id } of contacts) {
    // Fetch from all 3 endpoints
    const [single, list, bundle] = await Promise.all([
      fetch(`${BACKEND_URL}/api/v1/contacts/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      
      fetch(`${BACKEND_URL}/api/v1/contacts?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      
      fetch(`${BACKEND_URL}/api/v1/contacts/${id}/context-bundle`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
    ]);

    const listContact = list.contacts.find(c => c.id === id);

    const scores = {
      single: single.warmth_score_current,
      list: listContact?.warmth_score_current,
      bundle: bundle.contact.warmth_score_current,
    };

    // Check parity (within 1e-6)
    const diffs = {
      'single vs list': Math.abs(scores.single - scores.list),
      'single vs bundle': Math.abs(scores.single - scores.bundle),
      'list vs bundle': Math.abs(scores.list - scores.bundle),
    };

    const allMatch = Object.values(diffs).every(d => d <= 1e-6);

    if (allMatch) {
      console.log(`✅ ${id}: All endpoints match (${scores.single.toFixed(6)})`);
      passed++;
    } else {
      console.log(`❌ ${id}: Mismatch detected`);
      console.log(`   Single: ${scores.single.toFixed(6)}`);
      console.log(`   List: ${scores.list.toFixed(6)}`);
      console.log(`   Bundle: ${scores.bundle.toFixed(6)}`);
      console.log(`   Diffs:`, diffs);
      failed++;
    }
  }

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

testWarmthParity();
```

### Add to CI

```powershell
# run-all-warmth-tests.ps1 (append)

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow
Write-Host "TEST SUITE 4: API Parity (Warmth Consistency)" -ForegroundColor Yellow
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Yellow

node test-warmth-api-parity.mjs
$parityResult = $LASTEXITCODE

if ($parityResult -eq 0) {
    Write-Host "API Parity Test: PASSED" -ForegroundColor Green
    $passedTests++
} else {
    Write-Host "API Parity Test: FAILED" -ForegroundColor Red
    $failedTests++
}
$totalTests++
```

---

## Monitoring & Observability

### Metrics to Track

```typescript
// lib/metrics.ts
export function trackWarmthMetrics() {
  // Log to PostHog or your analytics
  posthog.capture('warmth_recompute', {
    stale_count: staleCount,
    recompute_duration_ms: duration,
    batch_size: batchSize,
  });
}
```

### Webhook Already Exists

The `contact.warmth.changed` webhook already fires when warmth updates. Use it for:
- Real-time notifications
- External integrations
- Analytics pipelines

---

## Rollout Checklist

### Phase 1: Core (Week 1)
- [ ] Implement `withCurrentWarmth` helper
- [ ] Update `/api/v1/contacts/:id` endpoint
- [ ] Update `/api/v1/contacts/:id/context-bundle` endpoint
- [ ] Frontend: Update detail and context screens
- [ ] Test: Verify warmth_score_current matches across endpoints

### Phase 2: List & Filtering (Week 1-2)
- [ ] Implement `/api/v1/contacts` with sorting/filtering
- [ ] Frontend: Migrate contact list to new endpoint
- [ ] Frontend: Add warmth sorting and band filtering
- [ ] Test: Performance benchmark for 1000+ contacts

### Phase 3: Caching & Automation (Week 2)
- [ ] Add cache updates on interaction create
- [ ] Add cache updates on mode change
- [ ] Implement cron recompute job
- [ ] Run backfill migration
- [ ] Test: Verify cache staleness < 6h

### Phase 4: Testing & Monitoring (Week 2)
- [ ] Add API parity test to CI
- [ ] Add warmth metrics to dashboard
- [ ] Monitor stale cache ratio
- [ ] Document for frontend team

---

## Success Criteria

✅ **Consistency**: All endpoints return identical `warmth_score_current` (within 1e-6)  
✅ **Performance**: Contact list loads in < 500ms with 50 items  
✅ **Freshness**: 95% of contacts have cache < 6h old  
✅ **Accuracy**: Warmth bands match score thresholds 100% of time  
✅ **Testing**: API parity test passes in CI  

---

## Documentation References

- **Backend Guide**: `WARMTH_SCORE_GUIDE.md`
- **Test Results**: `WARMTH_TEST_RESULTS.md`
- **Frontend Fix**: `FRONTEND_WARMTH_MODE_FIX.md`
- **API Reference**: `PUBLIC_API_GUIDE.md`

---

**Last Updated**: 2025-11-04  
**Status**: Ready for implementation  
**Estimated Completion**: 2-3 days
